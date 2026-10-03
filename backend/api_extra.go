package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/mail"
	"net/smtp"
	"os"
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
		failure(w, 403, "Only students can submit college verification")
		return
	}
	if err := r.ParseMultipartForm(maxCollegeDocumentSize + (1 << 20)); err != nil {
		failure(w, 400, "Invalid form data")
		return
	}
	file, header, err := r.FormFile("document")
	if err != nil {
		failure(w, 400, "Document is required")
		return
	}
	defer file.Close()
	if header.Size > maxCollegeDocumentSize {
		failure(w, 413, "File too large (max 2MB)")
		return
	}
	data, err := io.ReadAll(io.LimitReader(file, maxCollegeDocumentSize+1))
	if err != nil || len(data) == 0 {
		failure(w, 400, "Unable to read document")
		return
	}
	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}
	var verificationID int64
	err = s.db.QueryRow("INSERT INTO college_verifications (user_id,doc_url,file_name,mime_type,file_size,doc_data,status) VALUES (?, '', ?, ?, ?, ?, 'pending') RETURNING id", claims.ID, header.Filename, mimeType, len(data), data).Scan(&verificationID)
	if err != nil {
		failure(w, 500, "Unable to save verification")
		return
	}
	_, _ = s.db.Exec("UPDATE users SET college_verified = 'pending' WHERE id = ?", claims.ID)
	success(w, 200, map[string]any{"id": verificationID, "status": "pending"})
}

func (s *Server) pendingStudents(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	rows, err := s.queryMaps(`SELECT u.id, u.name, u.email, u.college_verified AS status, cv.id AS verificationId, cv.file_name AS fileName, cv.created_at AS submittedAt
		FROM users u LEFT JOIN college_verifications cv ON cv.user_id = u.id AND cv.status = 'pending'
		WHERE u.college_verified IN ('pending','none') AND u.role = 'student' ORDER BY u.created_at DESC`)
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
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 3 {
		failure(w, 400, "Invalid path")
		return
	}
	userID := parts[len(parts)-2]
	var body struct {
		Status  string `json:"status"`
		Remarks string `json:"remarks"`
	}
	_ = decodeBody(r, &body)
	if body.Status != "verified" && body.Status != "rejected" {
		failure(w, 400, "status must be verified or rejected")
		return
	}
	_, err := s.db.Exec("UPDATE users SET college_verified = ? WHERE id = ?", body.Status, userID)
	if err != nil {
		failure(w, 500, "Unable to update student")
		return
	}
	_, _ = s.db.Exec("UPDATE college_verifications SET status = ?, remarks = ?, updated_at = NOW() WHERE user_id = ? AND status = 'pending'", body.Status, body.Remarks, userID)
	success(w, 200, map[string]any{"ok": true})
}

func (s *Server) collegeVerificationDocument(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	var id string
	for i, p := range parts {
		if p == "verifications" && i+1 < len(parts) {
			id = parts[i+1]
			break
		}
	}
	if id == "" {
		failure(w, 400, "Missing id")
		return
	}
	var data []byte
	var mime, name string
	err := s.db.QueryRow("SELECT doc_data, mime_type, file_name FROM college_verifications WHERE id = ?", id).Scan(&data, &mime, &name)
	if err != nil || len(data) == 0 {
		failure(w, 404, "Document not found")
		return
	}
	w.Header().Set("Content-Type", mime)
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=%q", name))
	w.WriteHeader(200)
	_, _ = w.Write(data)
}

func (s *Server) roadmaps(w http.ResponseWriter, r *http.Request) {
	rows, err := s.queryMaps("SELECT id, name, slug, description, icon, modules_json AS modules FROM roadmaps ORDER BY id")
	if err != nil {
		failure(w, 500, "Unable to load roadmaps")
		return
	}
	for i := range rows {
		rows[i]["modules"] = parseJSON(rows[i]["modules"], []any{})
	}
	success(w, 200, rows)
}

func (s *Server) roadmap(w http.ResponseWriter, r *http.Request, slug string) {
	slug = strings.Trim(slug, "/")
	rows, err := s.queryMaps("SELECT id, name, slug, description, icon, modules_json AS modules FROM roadmaps WHERE slug = ?", slug)
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
	rows, err := s.queryMaps("SELECT id, title, category, difficulty, questions_json AS questions FROM assessments ORDER BY id")
	if err != nil {
		failure(w, 500, "Unable to load assessments")
		return
	}
	for i := range rows {
		rows[i]["questions"] = parseJSON(rows[i]["questions"], []any{})
	}
	success(w, 200, rows)
}

func (s *Server) assessment(w http.ResponseWriter, r *http.Request, id string) {
	id = strings.Trim(id, "/")
	if r.Method == "GET" {
		rows, err := s.queryMaps("SELECT id, title, category, difficulty, questions_json AS questions FROM assessments WHERE id = ?", id)
		if err != nil || len(rows) == 0 {
			failure(w, 404, "Assessment not found")
			return
		}
		rows[0]["questions"] = parseJSON(rows[0]["questions"], []any{})
		success(w, 200, rows[0])
		return
	}
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	var body struct {
		Score          int            `json:"score"`
		TotalQuestions int            `json:"totalQuestions"`
		Answers        map[string]any `json:"answers"`
	}
	_ = decodeBody(r, &body)
	answers, _ := json.Marshal(body.Answers)
	var attemptID int64
	err := s.db.QueryRow("INSERT INTO attempts (user_id,assessment_id,score,total_questions,answers_json) VALUES (?,?,?,?,?) RETURNING id", claims.ID, id, body.Score, body.TotalQuestions, answers).Scan(&attemptID)
	if err != nil {
		failure(w, 500, "Unable to save attempt")
		return
	}
	_, _ = s.db.Exec("UPDATE users SET points = points + ? WHERE id = ?", body.Score*10, claims.ID)
	success(w, 200, map[string]any{"attemptId": attemptID})
}

func (s *Server) internships(w http.ResponseWriter, r *http.Request) {
	rows, err := s.queryMaps("SELECT id, title, company, location, mode, stipend, description, apply_url AS applyUrl FROM internships ORDER BY id DESC")
	if err != nil {
		failure(w, 500, "Unable to load internships")
		return
	}
	success(w, 200, rows)
}

func (s *Server) company(w http.ResponseWriter, r *http.Request, id string) {
	id = strings.Trim(id, "/")
	rows, err := s.queryMaps("SELECT id, name, industry, website, description FROM companies WHERE id = ?", id)
	if err != nil || len(rows) == 0 {
		failure(w, 404, "Company not found")
		return
	}
	success(w, 200, rows[0])
}

func (s *Server) simpleList(w http.ResponseWriter, query string, r *http.Request) {
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
		failure(w, 400, "Message required")
		return
	}
	conversationID := body.ConversationID
	if conversationID == "" {
		conversationID = randID()
		title := msg
		if len(title) > 60 {
			title = title[:60]
		}
		now := time.Now()
		_, _ = s.db.Exec("INSERT INTO buddy_conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)", conversationID, claims.ID, title, now, now)
	} else {
		var owner string
		if err := s.db.QueryRow("SELECT user_id FROM buddy_conversations WHERE id = ?", conversationID).Scan(&owner); err != nil || owner != claims.ID {
			failure(w, 403, "Access denied")
			return
		}
	}
	_, _ = s.db.Exec("INSERT INTO buddy_chat_messages (user_id, message_role, text) VALUES (?, ?, ?)", claims.ID, "user", msg)
	reply := "Thanks for your message. Keep learning with EduRoute Buddy!"
	_, _ = s.db.Exec("INSERT INTO buddy_chat_messages (user_id, message_role, text) VALUES (?, ?, ?)", claims.ID, "assistant", reply)
	_, _ = s.db.Exec("UPDATE buddy_conversations SET updated_at = NOW() WHERE id = ?", conversationID)
	success(w, 200, map[string]any{"reply": reply, "userId": claims.ID, "conversationId": conversationID})
}

func (s *Server) buddyProgress(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	userID := claims.ID
	if r.Method == "GET" || r.Method == "" {
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
	failure(w, 405, "Method not allowed")
}

func (s *Server) buddyChatFunction(w http.ResponseWriter, r *http.Request) {
	var body struct {
		UserID  string `json:"userId"`
		Message string `json:"message"`
	}
	_ = decodeBody(r, &body)
	if strings.TrimSpace(body.Message) == "" {
		failure(w, 400, "message required")
		return
	}
	success(w, 200, map[string]any{"ok": true, "reply": "Buddy received: " + body.Message})
}

func (s *Server) adminRoadmaps(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	if r.Method == "GET" {
		s.roadmaps(w, r)
		return
	}
	failure(w, 405, "Method not allowed")
}

func (s *Server) sendEmail(w http.ResponseWriter, r *http.Request) {
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
	if r.Method == "GET" {
		userID := s.resolveDataUserID(r, "")
		if userID == "" {
			failure(w, 400, "userId is required")
			return
		}
		rows, err := s.queryMaps("SELECT id, title, payload, created_at AS createdAt, updated_at AS updatedAt FROM user_ai_courses WHERE user_id = ? ORDER BY updated_at DESC", userID)
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
		userID := s.resolveDataUserID(r, stringValue(body["userId"], ""))
		if userID == "" {
			failure(w, 400, "userId is required")
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
			WHERE user_ai_courses.user_id = EXCLUDED.user_id`, id, userID, title, encoded, now, now)
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
	id = strings.Trim(id, "/")
	userID := s.resolveDataUserID(r, "")
	if userID == "" {
		failure(w, 400, "userId is required")
		return
	}
	if r.Method == "GET" {
		rows, err := s.queryMaps("SELECT id, title, payload, created_at AS createdAt, updated_at AS updatedAt FROM user_ai_courses WHERE id = ? AND user_id = ?", id, userID)
		if err != nil || len(rows) == 0 {
			failure(w, 404, "Course not found")
			return
		}
		rows[0]["payload"] = parseJSON(rows[0]["payload"], map[string]any{})
		success(w, 200, rows[0])
		return
	}
	if r.Method == "DELETE" {
		res, err := s.db.Exec("DELETE FROM user_ai_courses WHERE id = ? AND user_id = ?", id, userID)
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
