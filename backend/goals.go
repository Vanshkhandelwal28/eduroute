package main

import (
	"net/http"
)

func (s *Server) goals(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}

	switch r.Method {
	case http.MethodGet:
		s.getGoal(w, r, claims.ID)

	case http.MethodPut:
		s.setGoal(w, r, claims.ID)

	default:
		w.Header().Set("Allow", "GET, PUT")
		failure(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

func (s *Server) getGoal(w http.ResponseWriter, _ *http.Request, userID string) {
	var goal int

	err := s.db.QueryRow(
		"SELECT goal_points FROM user_goals WHERE user_id = ? LIMIT 1",
		userID,
	).Scan(&goal)

	if err != nil {
		// First-time user gets the default goal.
		if _, insertErr := s.db.Exec(
			"INSERT INTO user_goals (user_id, goal_points) VALUES (?, ?)",
			userID,
			500,
		); insertErr != nil {
			failure(w, http.StatusInternalServerError, "Unable to create user goal")
			return
		}

		goal = 500
	}

	success(w, http.StatusOK, map[string]any{
		"goal": goal,
	})
}

func (s *Server) setGoal(w http.ResponseWriter, r *http.Request, userID string) {
	var body struct {
		Goal int `json:"goal"`
	}

	if decodeBody(r, &body) != nil {
		failure(w, http.StatusBadRequest, "Invalid goal")
		return
	}

	if body.Goal <= 0 {
		failure(w, http.StatusBadRequest, "Goal must be greater than 0")
		return
	}

	if body.Goal > 100000 {
		failure(w, http.StatusBadRequest, "Goal is too large")
		return
	}

	_, err := s.db.Exec(`
		INSERT INTO user_goals (user_id, goal_points)
		VALUES (?, ?)
		ON DUPLICATE KEY UPDATE
			goal_points = VALUES(goal_points),
			updated_at = CURRENT_TIMESTAMP
	`, userID, body.Goal)

	if err != nil {
		failure(w, http.StatusInternalServerError, "Unable to save goal")
		return
	}

	writeJSON(w, http.StatusOK, apiEnvelope{
		Success: true,
		Data: map[string]any{
			"goal": body.Goal,
		},
		Message: "New goal set done",
	})
}