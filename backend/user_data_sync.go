package main

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

// resolveDataUserID: JWT preferred; else userId query/header/body (same pattern as buddy).
func (s *Server) resolveDataUserID(r *http.Request, bodyUserID string) string {
	if claims, ok := s.claims(r); ok && strings.TrimSpace(claims.ID) != "" {
		return claims.ID
	}
	uid := strings.TrimSpace(r.URL.Query().Get("userId"))
	if uid == "" {
		uid = strings.TrimSpace(r.Header.Get("X-User-Id"))
	}
	if uid == "" {
		uid = strings.TrimSpace(bodyUserID)
	}
	if len(uid) > 160 {
		uid = uid[:160]
	}
	return uid
}

// userDataSync — generic JSON blob per user + key (skill-profile, cv, course-progress, onboarding, …)
// GET  /api/user-data?key=…&userId=…
// POST /api/user-data  { userId, key, payload }
func (s *Server) userDataSync(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		key := strings.TrimSpace(r.URL.Query().Get("key"))
		if key == "" || len(key) > 64 {
			failure(w, 400, "key is required")
			return
		}
		userID := s.resolveDataUserID(r, "")
		if userID == "" {
			failure(w, 400, "userId is required")
			return
		}
		var payload []byte
		err := s.db.QueryRow(
			"SELECT payload FROM user_data_store WHERE user_id = ? AND data_key = ?",
			userID, key,
		).Scan(&payload)
		if err != nil {
			success(w, 200, map[string]any{"empty": true, "key": key, "payload": nil})
			return
		}
		var data any
		_ = json.Unmarshal(payload, &data)
		success(w, 200, map[string]any{"empty": false, "key": key, "payload": data})

	case http.MethodPost, http.MethodPut:
		var body struct {
			UserID  string          `json:"userId"`
			Key     string          `json:"key"`
			Payload json.RawMessage `json:"payload"`
		}
		if decodeBody(r, &body) != nil {
			failure(w, 400, "Invalid JSON")
			return
		}
		key := strings.TrimSpace(body.Key)
		if key == "" || len(key) > 64 {
			failure(w, 400, "key is required")
			return
		}
		userID := s.resolveDataUserID(r, body.UserID)
		if userID == "" {
			failure(w, 400, "userId is required")
			return
		}
		if len(body.Payload) == 0 {
			body.Payload = json.RawMessage("null")
		}
		now := time.Now().UTC()
		_, err := s.db.Exec(`
			INSERT INTO user_data_store (user_id, data_key, payload, updated_at)
			VALUES (?, ?, ?, ?)
			ON CONFLICT (user_id, data_key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
		`, userID, key, []byte(body.Payload), now)
		if err != nil {
			_, err2 := s.db.Exec(`UPDATE user_data_store SET payload = ?, updated_at = ? WHERE user_id = ? AND data_key = ?`, []byte(body.Payload), now, userID, key)
			if err2 != nil {
				_, err3 := s.db.Exec(`INSERT INTO user_data_store (user_id, data_key, payload, updated_at) VALUES (?, ?, ?, ?)`, userID, key, []byte(body.Payload), now)
				if err3 != nil {
					failure(w, 500, "Failed to save: "+err.Error())
					return
				}
			}
		}
		success(w, 200, map[string]any{"ok": true, "key": key, "userId": userID, "updatedAt": now})

	default:
		failure(w, 405, "Method not allowed")
	}
}
