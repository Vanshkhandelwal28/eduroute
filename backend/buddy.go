package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// Buddy conversation structures
type BuddyConversation struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type BuddyMessage struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversationId"`
	Role           string    `json:"role"`
	Content        string    `json:"content"`
	CreatedAt      time.Time `json:"createdAt"`
}

type ChatRequest struct {
	ConversationID string `json:"conversationId"`
	Message        string `json:"message"`
}

type ChatResponse struct {
	Success bool         `json:"success"`
	Message BuddyMessage `json:"message,omitempty"`
	Error   string       `json:"error,omitempty"`
}

// Gemini API structures
type GeminiRequest struct {
	Contents []GeminiContent `json:"contents"`
}

type GeminiContent struct {
	Role  string       `json:"role"`
	Parts []GeminiPart `json:"parts"`
}

type GeminiPart struct {
	Text string `json:"text"`
}

type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

// System prompt for the Buddy AI mentor
const buddySystemPrompt = `You are EduRoute Buddy, an AI student mentor specializing in:
- Data Structures & Algorithms (DSA)
- Backend Development & Go
- Career guidance & internships
- Resume building & interview prep
- GSoC preparation
- Project guidance
- Professional growth

You are friendly, encouraging, and structured in your responses. Always:
1. Be concise but comprehensive
2. Provide code examples when relevant
3. Include actionable next steps
4. Ask follow-up questions to understand student needs
5. Consider the student's current level and context
6. Offer resources and learning paths

Never share passwords, tokens, or sensitive personal data. Keep conversations focused on learning and growth.`

func (s *Server) buddyConversations(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	userID := claims.ID

	switch r.Method {
	case "GET":
		// List conversations for this user
		rows, err := s.queryMaps(
			"SELECT id, user_id AS userId, title, created_at AS createdAt, updated_at AS updatedAt FROM buddy_conversations WHERE user_id = ? ORDER BY updated_at DESC",
			userID)
		if err != nil {
			failure(w, 500, "Failed to load conversations")
			return
		}
		if rows == nil {
			rows = []map[string]any{}
		}
		success(w, 200, rows)

	case "POST":
		// Create a new conversation
		var body struct {
			Title string `json:"title"`
		}
		if decodeBody(r, &body) != nil || strings.TrimSpace(body.Title) == "" {
			failure(w, 400, "Title is required")
			return
		}
		conversationID := randID()
		now := time.Now()
		_, err := s.db.Exec(
			"INSERT INTO buddy_conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
			conversationID, userID, body.Title, now, now)
		if err != nil {
			failure(w, 500, "Failed to create conversation")
			return
		}
		success(w, 201, map[string]any{
			"id":        conversationID,
			"userId":    userID,
			"title":     body.Title,
			"createdAt": now,
			"updatedAt": now,
		})

	case "PATCH":
		// Update conversation title
		conversationID := r.URL.Query().Get("id")
		if conversationID == "" {
			failure(w, 400, "Conversation ID required")
			return
		}
		// Verify ownership
		var owner string
		if err := s.db.QueryRow("SELECT user_id FROM buddy_conversations WHERE id = ?", conversationID).Scan(&owner); err != nil {
			failure(w, 404, "Conversation not found")
			return
		}
		if owner != userID {
			failure(w, 403, "Access denied")
			return
		}

		var body struct {
			Title string `json:"title"`
		}
		if decodeBody(r, &body) != nil || strings.TrimSpace(body.Title) == "" {
			failure(w, 400, "Title is required")
			return
		}
		now := time.Now()
		_, err := s.db.Exec(
			"UPDATE buddy_conversations SET title = ?, updated_at = ? WHERE id = ?",
			body.Title, now, conversationID)
		if err != nil {
			failure(w, 500, "Failed to update conversation")
			return
		}
		success(w, 200, map[string]any{
			"id":        conversationID,
			"userId":    userID,
			"title":     body.Title,
			"updatedAt": now,
		})

	case "DELETE":
		// Delete conversation
		conversationID := r.URL.Query().Get("id")
		if conversationID == "" {
			failure(w, 400, "Conversation ID required")
			return
		}
		// Verify ownership
		var owner string
		if err := s.db.QueryRow("SELECT user_id FROM buddy_conversations WHERE id = ?", conversationID).Scan(&owner); err != nil {
			failure(w, 404, "Conversation not found")
			return
		}
		if owner != userID {
			failure(w, 403, "Access denied")
			return
		}

		// Delete conversation and its messages
		_, _ = s.db.Exec("DELETE FROM buddy_messages WHERE conversation_id = ?", conversationID)
		_, _ = s.db.Exec("DELETE FROM buddy_conversations WHERE id = ?", conversationID)
		success(w, 200, map[string]any{"message": "Conversation deleted"})

	default:
		failure(w, 405, "Method not allowed")
	}
}

func (s *Server) buddyMessages(w http.ResponseWriter, r *http.Request, conversationID string) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	userID := claims.ID

	// Verify user owns this conversation
	var owner string
	if err := s.db.QueryRow("SELECT user_id FROM buddy_conversations WHERE id = ?", conversationID).Scan(&owner); err != nil {
		failure(w, 404, "Conversation not found")
		return
	}
	if owner != userID {
		failure(w, 403, "Access denied")
		return
	}

	switch r.Method {
	case "GET":
		// Get all messages in conversation
		rows, err := s.queryMaps(
			"SELECT id, conversation_id AS conversationId, role, content, created_at AS createdAt FROM buddy_messages WHERE conversation_id = ? ORDER BY created_at ASC",
			conversationID)
		if err != nil {
			failure(w, 500, "Failed to load messages")
			return
		}
		if rows == nil {
			rows = []map[string]any{}
		}
		success(w, 200, rows)

	case "POST":
		// Send a new message
		var body ChatRequest
		if decodeBody(r, &body) != nil || strings.TrimSpace(body.Message) == "" {
			failure(w, 400, "Message is required")
			return
		}

		// Save user message
		userMsgID := randID()
		now := time.Now()
		_, err := s.db.Exec(
			"INSERT INTO buddy_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
			userMsgID, conversationID, "user", body.Message, now)
		if err != nil {
			failure(w, 500, "Failed to save message")
			return
		}

		// Get conversation history for context
		rows, err := s.queryMaps(
			"SELECT role, content FROM buddy_messages WHERE conversation_id = ? ORDER BY created_at ASC",
			conversationID)
		if err != nil {
			failure(w, 500, "Failed to load conversation history")
			return
		}

		// Get user context
		var userName, userEmail string
		_ = s.db.QueryRow("SELECT name, email FROM users WHERE id = ?", userID).Scan(&userName, &userEmail)

		// Call Gemini AI
		aiResponse, err := s.callGeminiAI(body.Message, rows, userName)
		if err != nil {
			failure(w, 500, "Failed to get AI response: "+err.Error())
			return
		}

		// Save AI response
		aiMsgID := randID()
		_, err = s.db.Exec(
			"INSERT INTO buddy_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
			aiMsgID, conversationID, "assistant", aiResponse, now)
		if err != nil {
			failure(w, 500, "Failed to save AI response")
			return
		}

		// Update conversation updated_at
		_, _ = s.db.Exec("UPDATE buddy_conversations SET updated_at = ? WHERE id = ?", now, conversationID)

		// Return the AI response
		success(w, 201, map[string]any{
			"id":             aiMsgID,
			"conversationId": conversationID,
			"role":           "assistant",
			"content":        aiResponse,
			"createdAt":      now,
		})

	default:
		failure(w, 405, "Method not allowed")
	}
}

func (s *Server) callGeminiAI(message string, history []map[string]any, userName string) (string, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return "I'm currently unable to access my AI capabilities. Please check back later or try again.", nil
	}

	model := os.Getenv("GEMINI_MODEL")
	if model == "" {
		model = "gemini-1.5-flash"
	}

	// Build conversation history for Gemini
	contents := []GeminiContent{
		{
			Role: "user",
			Parts: []GeminiPart{
				{Text: buddySystemPrompt},
			},
		},
		{
			Role: "model",
			Parts: []GeminiPart{
				{Text: "I understand. I'm your EduRoute Buddy, ready to help with DSA, backend development, career guidance, and more. How can I assist you today?"},
			},
		},
	}

	// Add conversation history
	for _, msg := range history {
		role := "user"
		if msg["role"] == "assistant" {
			role = "model"
		}
		contents = append(contents, GeminiContent{
			Role: role,
			Parts: []GeminiPart{
				{Text: fmt.Sprint(msg["content"])},
			},
		})
	}

	// Add current message
	contents = append(contents, GeminiContent{
		Role: "user",
		Parts: []GeminiPart{
			{Text: message},
		},
	})

	reqBody := GeminiRequest{Contents: contents}
	reqJSON, _ := json.Marshal(reqBody)

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, apiKey)
	resp, err := http.Post(url, "application/json", bytes.NewReader(reqJSON))
	if err != nil {
		return "", fmt.Errorf("gemini api error: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var geminiResp GeminiResponse
	if err := json.Unmarshal(respBody, &geminiResp); err != nil {
		return "", fmt.Errorf("gemini response parse error: %w", err)
	}

	if geminiResp.Error != nil {
		return "", fmt.Errorf("gemini error: %s", geminiResp.Error.Message)
	}

	if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
		return geminiResp.Candidates[0].Content.Parts[0].Text, nil
	}

	return "Sorry, I couldn't generate a response. Please try again.", nil
}

func randID() string {
	// Generate a simple ID for messages and conversations
	return fmt.Sprintf("%d-%d", time.Now().UnixNano(), time.Now().UnixNano()%1000)
}
