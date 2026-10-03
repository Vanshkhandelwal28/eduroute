package main

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

// resolveBuddyUserID: JWT preferred; else userId from query/header/body (demo same-login browsers).
func (s *Server) resolveBuddyUserID(w http.ResponseWriter, r *http.Request) (string, bool) {
	if claims, ok := s.claims(r); ok && strings.TrimSpace(claims.ID) != "" {
		return claims.ID, true
	}
	uid := strings.TrimSpace(r.URL.Query().Get("userId"))
	if uid == "" {
		uid = strings.TrimSpace(r.Header.Get("X-User-Id"))
	}
	if uid == "" && (r.Method == http.MethodPost || r.Method == http.MethodPut || r.Method == http.MethodPatch) {
		var body struct {
			UserID string `json:"userId"`
		}
		// Peek body without consuming for other handlers — only for sync which owns body
		_ = body
	}
	if uid == "" {
		failure(w, http.StatusUnauthorized, "Unauthorized — login or pass userId")
		return "", false
	}
	if len(uid) > 160 {
		uid = uid[:160]
	}
	return uid, true
}

// buddySync stores full conversation store JSON per user for cross-browser restore.
// GET  /api/buddy/sync?userId=
// POST /api/buddy/sync  body: { userId, conversations, activeId }
func (s *Server) buddySync(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		userID, ok := s.resolveBuddyUserID(w, r)
		if !ok {
			return
		}
		var payload []byte
		err := s.db.QueryRow(
			"SELECT payload FROM buddy_sync_store WHERE user_id = ?",
			userID,
		).Scan(&payload)
		if err != nil {
			success(w, 200, map[string]any{
				"conversations": []any{},
				"activeId":      nil,
				"empty":         true,
			})
			return
		}
		var data any
		if err := json.Unmarshal(payload, &data); err != nil {
			success(w, 200, map[string]any{
				"conversations": []any{},
				"activeId":      nil,
				"empty":         true,
			})
			return
		}
		success(w, 200, data)

	case http.MethodPost, http.MethodPut:
		var body struct {
			UserID        string          `json:"userId"`
			Conversations json.RawMessage `json:"conversations"`
			ActiveID      *string         `json:"activeId"`
		}
		if decodeBody(r, &body) != nil {
			failure(w, 400, "Invalid JSON body")
			return
		}
		userID := strings.TrimSpace(body.UserID)
		if claims, ok := s.claims(r); ok && claims.ID != "" {
			userID = claims.ID
		}
		if userID == "" {
			userID = strings.TrimSpace(r.URL.Query().Get("userId"))
		}
		if userID == "" {
			failure(w, 400, "userId is required")
			return
		}
		if len(userID) > 160 {
			userID = userID[:160]
		}
		if len(body.Conversations) == 0 {
			body.Conversations = json.RawMessage("[]")
		}
		store := map[string]any{
			"conversations": json.RawMessage(body.Conversations),
			"activeId":      body.ActiveID,
		}
		raw, err := json.Marshal(store)
		if err != nil {
			failure(w, 500, "Failed to encode store")
			return
		}
		now := time.Now()
		_, err = s.db.Exec(`
			INSERT INTO buddy_sync_store (user_id, payload, updated_at)
			VALUES (?, ?, ?)
			ON CONFLICT (user_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
		`, userID, raw, now)
		if err != nil {
			// Fallback without ON CONFLICT for older schemas
			_, err2 := s.db.Exec(`UPDATE buddy_sync_store SET payload = ?, updated_at = ? WHERE user_id = ?`, raw, now, userID)
			if err2 != nil {
				_, err3 := s.db.Exec(`INSERT INTO buddy_sync_store (user_id, payload, updated_at) VALUES (?, ?, ?)`, userID, raw, now)
				if err3 != nil {
					failure(w, 500, "Failed to save buddy sync: "+err.Error())
					return
				}
			}
		}
		success(w, 200, map[string]any{"ok": true, "userId": userID, "updatedAt": now})

	default:
		failure(w, 405, "Method not allowed")
	}
}
