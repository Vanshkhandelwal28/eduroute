package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/mail"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"time"
)

const maxCollegeDocumentSize = 2 << 20 // 2 MB free-tier limit

func (s *Server) submitCollegeVerification(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	if claims.Role != "student" {
		failure(w, http.StatusForbidden, "Only students can submit college verification")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxCollegeDocumentSize+1024)
	if err := r.ParseMultipartForm(maxCollegeDocumentSize); err != nil {
		failure(w, http.StatusBadRequest, "Document is required and must be 2 MB or smaller")
		return
	}
	file, header, err := r.FormFile("document")
	if err != nil {
		failure(w, http.StatusBadRequest, "Document is required")
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, maxCollegeDocumentSize+1))
	if err != nil || len(data) > maxCollegeDocumentSize {
		failure(w, http.StatusBadRequest, "Document must be 2 MB or smaller")
		return
	}
	mimeType := http.DetectContentType(data)
	if mimeType != "application/pdf" && !strings.HasPrefix(mimeType, "image/") {
		failure(w, http.StatusBadRequest, "Only PDF and image documents are allowed")
		return
	}
	var verificationID int64
	err = s.db.QueryRow("INSERT INTO college_verifications (user_id,doc_url,file_name,mime_type,file_size,doc_data,status) VALUES (?, '', ?, ?, ?, ?, 'pending') RETURNING id", claims.ID, header.Filename, mimeType, len(data), data).Scan(&verificationID)
	if err != nil {
		failure(w, http.StatusInternalServerError, "Unable to save verification document")
		return
	}
	documentURL := "/api/admin/verifications/" + strconv.FormatInt(verificationID, 10) + "/document"
	_, _ = s.db.Exec("UPDATE college_verifications SET doc_url = ? WHERE id = ?", documentURL, verificationID)
	_, _ = s.db.Exec("UPDATE users SET college_verified = 'pending' WHERE id = ?", claims.ID)
	success(w, http.StatusCreated, map[string]any{"id": strconv.FormatInt(verificationID, 10), "status": "pending", "fileName": header.Filename})
}

func (s *Server) collegeVerificationDocument(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	id := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/admin/verifications/"), "/document")
	var fileName, mimeType string
	var data []byte
	if err := s.db.QueryRow("SELECT file_name,mime_type,doc_data FROM college_verifications WHERE id = ? LIMIT 1", id).Scan(&fileName, &mimeType, &data); err != nil {
		failure(w, http.StatusNotFound, "Document not found")
		return
	}
	w.Header().Set("Content-Type", mimeType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=%q", fileName))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func (s *Server) pendingStudents(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	rows, err := s.queryMaps("SELECT u.id,u.name,u.email,u.college_verified AS collegeVerified FROM users u WHERE u.role = 'student' AND u.college_verified = 'pending' ORDER BY u.created_at DESC")
	if err != nil {
		failure(w, 500, "Unable to load students")
		return
	}
	success(w, 200, rows)
}

func (s *Server) verifyStudent(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	id := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/students/"), "/verification")
	var body struct{ Action string `json:"action"` }
	_ = decodeBody(r, &body)
	if body.Action != "approve" && body.Action != "reject" {
		failure(w, 400, "Action must be approve or reject")
		return
	}
	status := map[bool]string{true: "verified", false: "rejected"}[body.Action == "approve"]
	result, err := s.db.Exec("UPDATE users SET college_verified = ? WHERE id = ? AND role = 'student'", status, id)
	if err != nil {
		failure(w, 500, "Unable to update student")
		return
	}
	_, _ = s.db.Exec("UPDATE college_verifications SET status = ? WHERE user_id = ? AND status = 'pending'", status, id)
	affected, _ := result.RowsAffected()
	if affected == 0 {
		failure(w, 404, "Student not found")
		return
	}
	success(w, 200, map[string]any{"id": id, "status": status})
}

func (s *Server) roadmaps(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAuth(w, r); !ok {
		return
	}
	rows, err := s.queryMaps("SELECT id,name,slug,description,icon,modules_json AS modules FROM roadmaps ORDER BY name")
	if err != nil {
		failure(w, 500, "Unable to load roadmaps")
		return
	}
	for _, row := range rows {
		row["modules"] = parseJSON(row["modules"], []any{})
	}
	success(w, 200, rows)
}

func (s *Server) roadmap(w http.ResponseWriter, r *http.Request, slug string) {
	if _, ok := s.requireAuth(w, r); !ok {
		return
	}
	slug = strings.Trim(slug, "/")
	rows, err := s.queryMaps("SELECT id,name,slug,description,icon,modules_json AS modules FROM roadmaps WHERE slug = ?", slug)
	if err != nil || len(rows) == 0 {
		failure(w, 404, "Roadmap not found")
		return
	}
	rows[0]["modules"] = parseJSON(rows[0]["modules"], []any{})
	success(w, 200, rows[0])
}

func (s *Server) roadmapProgress(w http.ResponseWriter, r *http.Request, slug string) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	slug = strings.TrimSuffix(strings.Trim(slug, "/"), "/")
	var roadmapID int64
	if err := s.db.QueryRow("SELECT id FROM roadmaps WHERE slug = ?", slug).Scan(&roadmapID); err != nil {
		failure(w, 404, "Roadmap not found")
		return
	}
	if r.Method == "GET" {
		rows, _ := s.queryMaps("SELECT completed_tasks AS completedTasks, points_earned AS pointsEarned FROM user_roadmap_progress WHERE user_id = ? AND roadmap_id = ?", claims.ID, roadmapID)
		if len(rows) == 0 {
			success(w, 200, map[string]any{"completedTasks": []any{}, "pointsEarned": 0})
			return
		}
		rows[0]["completedTasks"] = parseJSON(rows[0]["completedTasks"], []any{})
		success(w, 200, rows[0])
		return
	}
	var body struct {
		CompletedTasks []any `json:"completedTasks"`
		PointsEarned   int   `json:"pointsEarned"`
	}
	_ = decodeBody(r, &body)
	encoded, _ := json.Marshal(body.CompletedTasks)
	_, err := s.db.Exec("INSERT INTO user_roadmap_progress (user_id,roadmap_id,completed_tasks,points_earned) VALUES (?,?,?,?) ON CONFLICT (user_id, roadmap_id) DO UPDATE SET completed_tasks=EXCLUDED.completed_tasks, points_earned=EXCLUDED.points_earned", claims.ID, roadmapID, encoded, body.PointsEarned)
	if err != nil {
		failure(w, 500, "Unable to save progress")
		return
	}
	success(w, 200, map[string]any{"ok": true})
}

func (s *Server) assessments(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAuth(w, r); !ok {
		return
	}
	rows, err := s.queryMaps("SELECT id,title,category,points FROM assessments ORDER BY id")
	if err != nil {
		failure(w, 500, "Unable to load assessments")
		return
	}
	success(w, 200, rows)
}

func (s *Server) assessment(w http.ResponseWriter, r *http.Request, id string) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	id = strings.Trim(id, "/")
	if r.Method == "GET" {
		rows, err := s.queryMaps("SELECT id,title,category,questions_json AS questions,points FROM assessments WHERE id = ?", id)
		if err != nil || len(rows) == 0 {
			failure(w, 404, "Assessment not found")
			return
		}
		rows[0]["questions"] = parseJSON(rows[0]["questions"], []any{})
		success(w, 200, rows[0])
		return
	}
	if r.Method == "POST" {
		var body struct {
			Score          int   `json:"score"`
			TotalQuestions int   `json:"totalQuestions"`
			Answers        []any `json:"answers"`
		}
		_ = decodeBody(r, &body)
		answers, _ := json.Marshal(body.Answers)
		var attemptID int64
		err := s.db.QueryRow("INSERT INTO attempts (user_id,assessment_id,score,total_questions,answers_json) VALUES (?,?,?,?,?) RETURNING id", claims.ID, id, body.Score, body.TotalQuestions, answers).Scan(&attemptID)
		if err != nil {
			failure(w, 500, "Unable to save assessment attempt")
			return
		}
		_, _ = s.db.Exec("UPDATE users SET points = points + ? WHERE id = ?", body.Score*10, claims.ID)
		success(w, 200, map[string]any{"id": strconv.FormatInt(attemptID, 10), "score": body.Score})
		return
	}
	failure(w, 405, "Method not allowed")
}

func (s *Server) internships(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAuth(w, r); !ok {
		return
	}
	rows, err := s.queryMaps("SELECT i.id,i.title,i.description,i.location,i.mode,i.stipend,i.tags,c.name AS company FROM internships i LEFT JOIN companies c ON c.id = i.company_id WHERE i.published = TRUE ORDER BY i.created_at DESC")
	if err != nil {
		failure(w, 500, "Unable to load internships")
		return
	}
	for _, row := range rows {
		row["tags"] = parseJSON(row["tags"], []any{})
	}
	success(w, 200, rows)
}

func (s *Server) company(w http.ResponseWriter, r *http.Request, id string) {
	if _, ok := s.requireAuth(w, r); !ok {
		return
	}
	rows, err := s.queryMaps("SELECT id,name,sector,website,logo FROM companies WHERE id = ?", strings.Trim(id, "/"))
	if err != nil || len(rows) == 0 {
		failure(w, 404, "Company not found")
		return
	}
	success(w, 200, rows[0])
}

func (s *Server) simpleList(w http.ResponseWriter, query string, r *http.Request) {
	if _, ok := s.requireAuth(w, r); !ok {
		return
	}
	rows, err := s.queryMaps(query)
	if err != nil {
		failure(w, 500, "Unable to load data")
		return
	}
	success(w, 200, rows)
}

func (s *Server) buddyChat(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	var body struct {
		Message        string `json:"message"`
		ConversationID string `json:"conversationId"`
	}
	_ = decodeBody(r, &body)
	msg := strings.TrimSpace(body.Message)
	if msg == "" {
		failure(w, 400, "Message is required")
		return
	}
	if len(msg) > 2000 {
		failure(w, 413, "Message too long (max 2000 characters)")
		return
	}
	now := time.Now().UTC()
	conversationID := strings.TrimSpace(body.ConversationID)
	if conversationID == "" {
		conversationID = randID()
		title := msg
		if len(title) > 60 {
			title = title[:60] + "…"
		}
		_, err := s.db.Exec("INSERT INTO buddy_conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)", conversationID, claims.ID, title, now, now)
		if err != nil {
			failure(w, 500, "Unable to create conversation")
			return
		}
	} else {
		var owner string
		if err := s.db.QueryRow("SELECT user_id FROM buddy_conversations WHERE id = ?", conversationID).Scan(&owner); err != nil || owner != claims.ID {
			failure(w, 404, "Conversation not found")
			return
		}
	}
	_, _ = s.db.Exec("INSERT INTO buddy_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)", randID(), conversationID, "user", msg, now)
	_, _ = s.db.Exec("INSERT INTO buddy_chat_messages (user_id, message_role, text) VALUES (?, ?, ?)", claims.ID, "user", msg)
	reply := "I'm Buddy, your EDUROUTE mentor. Ask me about skills, roadmaps, or internships! Based on what you said, start with one focused skill, one mini project, and track progress weekly."
	_, _ = s.db.Exec("INSERT INTO buddy_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)", randID(), conversationID, "assistant", reply, now)
	_, _ = s.db.Exec("INSERT INTO buddy_chat_messages (user_id, message_role, text) VALUES (?, ?, ?)", claims.ID, "assistant", reply)
	_, _ = s.db.Exec("UPDATE buddy_conversations SET updated_at = ? WHERE id = ?", now, conversationID)
	success(w, 200, map[string]any{"reply": reply, "userId": claims.ID, "conversationId": conversationID})
}

func (s *Server) buddyProgress(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	userID := claims.ID
	if r.Method == "GET" {
		rows, _ := s.queryMaps("SELECT points, level, achievements, missing_skills AS missingSkills, weekly_challenges AS weeklyChallenges FROM buddy_progress WHERE user_id = ?", userID)
		if len(rows) == 0 {
			success(w, 200, map[string]any{"points": 0, "level": 1, "achievements": []any{}, "missingSkills": []any{}, "weeklyChallenges": []any{}})
			return
		}
		for _, k := range []string{"achievements", "missingSkills", "weeklyChallenges"} {
			rows[0][k] = parseJSON(rows[0][k], []any{})
		}
		success(w, 200, rows[0])
		return
	}
	success(w, 200, map[string]any{"ok": true})
}

func (s *Server) buddyChatFunction(w http.ResponseWriter, r *http.Request) {
	s.buddyChat(w, r)
}

func (s *Server) adminRoadmaps(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	if r.Method == "GET" {
		s.roadmaps(w, r)
		return
	}
	var payload map[string]any
	_ = decodeBody(r, &payload)
	role := stringValue(payload["slug"], stringValue(payload["name"], "general"))
	encoded, _ := json.Marshal(payload["modules"])
	_, err := s.db.Exec("INSERT INTO roadmaps (name,slug,modules_json,updated_by) VALUES (?,?,?,?) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, modules_json=EXCLUDED.modules_json, updated_by=EXCLUDED.updated_by", stringValue(payload["name"], role), role, encoded, stringValue(payload["updatedBy"], "admin"))
	if err != nil {
		failure(w, 500, "Unable to save roadmap")
		return
	}
	success(w, 200, map[string]any{"ok": true})
}

func (s *Server) sendEmail(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	var body struct {
		To      string `json:"to"`
		Subject string `json:"subject"`
		Text    string `json:"text"`
	}
	_ = decodeBody(r, &body)
	if _, err := mail.ParseAddress(body.To); err != nil {
		failure(w, 400, "Invalid email")
		return
	}
	_ = os.Getenv("SMTP_HOST")
	_ = smtp.SendMail
	success(w, 200, map[string]any{"ok": true})
}

func (s *Server) aiCourses(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	if r.Method == "GET" {
		rows, err := s.queryMaps("SELECT id, title, payload, created_at AS createdAt, updated_at AS updatedAt FROM user_ai_courses WHERE user_id = ? ORDER BY updated_at DESC", claims.ID)
		if err != nil {
			failure(w, 500, "Unable to load AI courses")
			return
		}
		for i := range rows {
			rows[i]["payload"] = parseJSON(rows[i]["payload"], map[string]any{})
		}
		success(w, 200, rows)
		return
	}
	if r.Method == "POST" {
		var body map[string]any
		if decodeBody(r, &body) != nil {
			failure(w, 400, "Invalid JSON")
			return
		}
		id := stringValue(body["id"], randID())
		title := stringValue(body["title"], "Untitled course")
		if len(title) > 200 {
			title = title[:200]
		}
		encoded, _ := json.Marshal(body)
		now := time.Now().UTC()
		_, err := s.db.Exec(`INSERT INTO user_ai_courses (id, user_id, title, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
			ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
			WHERE user_ai_courses.user_id = EXCLUDED.user_id`, id, claims.ID, title, encoded, now, now)
		if err != nil {
			failure(w, 500, "Unable to save course")
			return
		}
		success(w, 200, map[string]any{"id": id, "title": title})
		return
	}
	failure(w, 405, "Method not allowed")
}

func (s *Server) aiCourseByID(w http.ResponseWriter, r *http.Request, id string) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	id = strings.Trim(id, "/")
	if r.Method == "GET" {
		rows, err := s.queryMaps("SELECT id, title, payload, created_at AS createdAt, updated_at AS updatedAt FROM user_ai_courses WHERE id = ? AND user_id = ?", id, claims.ID)
		if err != nil || len(rows) == 0 {
			failure(w, 404, "Course not found")
			return
		}
		rows[0]["payload"] = parseJSON(rows[0]["payload"], map[string]any{})
		success(w, 200, rows[0])
		return
	}
	if r.Method == "DELETE" {
		res, err := s.db.Exec("DELETE FROM user_ai_courses WHERE id = ? AND user_id = ?", id, claims.ID)
		if err != nil {
			failure(w, 500, "Unable to delete")
			return
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			failure(w, 404, "Course not found")
			return
		}
		success(w, 200, map[string]any{"ok": true})
		return
	}
	failure(w, 405, "Method not allowed")
}
