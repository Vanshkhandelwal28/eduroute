package main

import (
	"context"
	"errors"
	"io"
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/sashabaranov/go-openai"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type Conversation struct {
	ID     string `gorm:"primaryKey" json:"id"`
	UserID string `json:"user_id"`
	Title  string `json:"title"`
}

type Message struct {
	ID             string `gorm:"primaryKey" json:"id"`
	ConversationID string `json:"conversation_id"`
	Role           string `json:"role"` // user / ai
	Content        string `gorm:"type:text" json:"content"`
}

var DB *gorm.DB
var AI *openai.Client

func main() {
	godotenv.Load()
	dsn := os.Getenv("DB_DSN")
	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}
	DB.AutoMigrate(&Conversation{}, &Message{})

	AI = openai.NewClient(os.Getenv("OPENAI_API_KEY"))

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowAllOrigins: true,
		AllowMethods:    []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowHeaders:    []string{"Origin", "Content-Type", "Authorization"},
	}))

	r.POST("/api/buddy/chat", ChatHandler)
	r.GET("/api/buddy/chat/stream", StreamChatHandler) // LIVE
	r.GET("/api/buddy/history/:conversationId", HistoryHandler)
	r.DELETE("/api/buddy/clear/:conversationId", ClearHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	r.Run(":" + port)
}

type ChatRequest struct {
	ConversationID string `json:"conversation_id"`
	UserID         string `json:"user_id"`
	Message        string `json:"message"`
	IsHinglish     bool   `json:"isHinglish"`
}

func getSystemPrompt(isHinglish bool) string {
	base := `You are Buddy, EDUROUTE's personal Learning Gap Analyzer. You help students with React, DSA, career roadmaps. Be concise, friendly, and give actionable steps.`
	if isHinglish {
		base += ` Reply in Hinglish (mix of Hindi + English Roman script). Example: "Ye kaafi sahi sawaal hai!"`
	}
	return base
}

func ChatHandler(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if req.ConversationID == "" {
		req.ConversationID = uuid.New().String()
		title := req.Message
		if len(title) > 50 {
			title = title[:50]
		}
		DB.Create(&Conversation{ID: req.ConversationID, UserID: req.UserID, Title: title})
	}
	DB.Create(&Message{ID: uuid.New().String(), ConversationID: req.ConversationID, Role: "user", Content: req.Message})

	resp, err := AI.CreateChatCompletion(context.Background(), openai.ChatCompletionRequest{
		Model: openai.GPT4oMini,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: getSystemPrompt(req.IsHinglish)},
			{Role: openai.ChatMessageRoleUser, Content: req.Message},
		},
	})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	aiText := resp.Choices[0].Message.Content

	DB.Create(&Message{ID: uuid.New().String(), ConversationID: req.ConversationID, Role: "ai", Content: aiText})
	c.JSON(200, gin.H{"conversation_id": req.ConversationID, "reply": aiText})
}

// LIVE STREAMING - This is what makes it real
func StreamChatHandler(c *gin.Context) {
	conversationID := c.Query("conversation_id")
	userID := c.Query("user_id")
	message := c.Query("message")
	isHinglish := c.Query("isHinglish") == "true"

	if conversationID == "" {
		conversationID = uuid.New().String()
		title := message
		if len(title) > 50 {
			title = title[:50]
		}
		DB.Create(&Conversation{ID: conversationID, UserID: userID, Title: title})
	}
	DB.Create(&Message{ID: uuid.New().String(), ConversationID: conversationID, Role: "user", Content: message})

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	req := openai.ChatCompletionRequest{
		Model: openai.GPT4oMini,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: getSystemPrompt(isHinglish)},
			{Role: openai.ChatMessageRoleUser, Content: message},
		},
		Stream: true,
	}
	stream, err := AI.CreateChatCompletionStream(context.Background(), req)
	if err != nil {
		c.SSEvent("error", err.Error())
		return
	}
	defer stream.Close()

	fullReply := ""
	for {
		response, err := stream.Recv()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			c.SSEvent("error", err.Error())
			break
		}
		token := response.Choices[0].Delta.Content
		fullReply += token
		c.SSEvent("message", gin.H{"token": token, "conversation_id": conversationID})
		c.Writer.Flush()
	}
	DB.Create(&Message{ID: uuid.New().String(), ConversationID: conversationID, Role: "ai", Content: fullReply})
	c.SSEvent("done", gin.H{"conversation_id": conversationID})
}

func HistoryHandler(c *gin.Context) {
	var msgs []Message
	DB.Where("conversation_id = ?", c.Param("conversationId")).Order("created_at asc").Find(&msgs)
	c.JSON(200, msgs)
}

func ClearHandler(c *gin.Context) {
	DB.Where("conversation_id = ?", c.Param("conversationId")).Delete(&Message{})
	c.JSON(200, gin.H{"status": "cleared"})
}
