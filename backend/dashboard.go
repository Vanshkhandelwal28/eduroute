package main

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"
	"time"
)

func (s *Server) profileDashboard(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	var name, email, role, avatar string
	var points int
	if err := s.db.QueryRow("SELECT name,email,role,COALESCE(avatar,''),points FROM users WHERE id = ? LIMIT 1", claims.ID).Scan(&name, &email, &role, &avatar, &points); err != nil {
		failure(w, http.StatusNotFound, "User not found")
		return
	}

	var solvedTotal, easy, medium, hard int
	_ = s.db.QueryRow("SELECT COUNT(*), COALESCE(SUM(CASE WHEN difficulty = 'Easy' THEN 1 ELSE 0 END),0), COALESCE(SUM(CASE WHEN difficulty = 'Medium' THEN 1 ELSE 0 END),0), COALESCE(SUM(CASE WHEN difficulty = 'Hard' THEN 1 ELSE 0 END),0) FROM user_problem_submissions WHERE user_id = ? AND status = 'Accepted'", claims.ID).Scan(&solvedTotal, &easy, &medium, &hard)
	var assessmentCount, assessmentScore int
	_ = s.db.QueryRow("SELECT COUNT(*), COALESCE(SUM(score),0) FROM attempts WHERE user_id = ?", claims.ID).Scan(&assessmentCount, &assessmentScore)

	activity, _ := s.dashboardActivity(claims.ID)
	currentStreak, maxStreak := calculateStreak(activity)
	level := points/100 + 1
	rank, collegeRank := s.dashboardRanks(claims.ID, points)
	roadmaps := s.dashboardRoadmaps(claims.ID)
	courses := s.dashboardCourses(claims.ID)
	recent := s.dashboardRecentSubmissions(claims.ID)

	success(w, http.StatusOK, map[string]any{
		"user": map[string]any{
			"id": claims.ID, "name": name, "email": email, "role": role,
			"avatar": avatar, "points": points, "level": level,
			"verificationStatus": claims.VerificationStatus,
		},
		"dsa": map[string]any{"solved": solvedTotal, "easy": easy, "medium": medium, "hard": hard},
		"assessments": map[string]any{"count": assessmentCount, "totalScore": assessmentScore},
		"streak": map[string]any{"current": currentStreak, "max": maxStreak},
		"rank": rank, "collegeRank": collegeRank,
		"activity": activity, "roadmaps": roadmaps, "courses": courses, "recentSubmissions": recent,
	})
}

func (s *Server) dashboardActivity(userID string) ([]map[string]any, error) {
	rows, err := s.queryMaps(`SELECT DATE(submitted_at)::text AS date, COUNT(*)::int AS count
		FROM user_problem_submissions WHERE user_id = ? AND submitted_at > NOW() - INTERVAL '30 days'
		GROUP BY DATE(submitted_at) ORDER BY date`, userID)
	return rows, err
}

func calculateStreak(activity []map[string]any) (int, int) {
	if len(activity) == 0 {
		return 0, 0
	}
	days := map[string]bool{}
	for _, a := range activity {
		d := stringValue(a["date"], "")
		if len(d) >= 10 {
			d = d[:10]
		}
		if d != "" {
			days[d] = true
		}
	}
	current, maxStreak, run := 0, 0, 0
	now := time.Now().UTC()
	for i := 0; i < 365; i++ {
		d := now.AddDate(0, 0, -i).Format("2006-01-02")
		if days[d] {
			run++
			if run > maxStreak {
				maxStreak = run
			}
			if i == 0 || current > 0 {
				current = run
			}
		} else {
			if i == 0 {
				run = 0
				continue
			}
			if current == 0 && i == 1 {
				run = 0
				continue
			}
			break
		}
	}
	return current, maxStreak
}

func (s *Server) dashboardRanks(userID string, points int) (int, int) {
	var rank, collegeRank int
	_ = s.db.QueryRow("SELECT 1 + COUNT(*) FROM users WHERE points > ?", points).Scan(&rank)
	_ = s.db.QueryRow("SELECT 1 + COUNT(*) FROM users WHERE points > ?", points).Scan(&collegeRank)
	return rank, collegeRank
}

func (s *Server) dashboardRoadmaps(userID string) []map[string]any {
	rows, _ := s.queryMaps(`SELECT r.id, r.name, r.slug, COALESCE(urp.points_earned,0) AS pointsEarned
		FROM roadmaps r LEFT JOIN user_roadmap_progress urp ON urp.roadmap_id = r.id AND urp.user_id = ?
		ORDER BY r.name`, userID)
	return rows
}

func (s *Server) dashboardCourses(userID string) []map[string]any {
	rows, _ := s.queryMaps("SELECT c.id,c.title,c.description,c.category,c.level,c.duration,c.instructor,c.thumbnail,c.playlist_url AS playlistUrl,c.youtube_url AS youtubeUrl,c.resource_url AS resourceUrl,c.published,COALESCE(ucp.progress_percent,0) AS progressPercent,(ucp.user_id IS NOT NULL) AS enrolled FROM courses c LEFT JOIN user_course_progress ucp ON ucp.course_id = c.id AND ucp.user_id = ? WHERE c.published = TRUE ORDER BY c.created_at DESC", userID)
	return rows
}

func (s *Server) dashboardRecentSubmissions(userID string) []map[string]any {
	rows, _ := s.queryMaps("SELECT problem_key AS problemKey, problem_name AS name, difficulty, status, score, submitted_at AS submittedAt FROM user_problem_submissions WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 10", userID)
	return rows
}

func (s *Server) courseProgress(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	parts := strings.Split(strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/courses/"), "/"), "/")
	if len(parts) < 2 || parts[1] != "progress" {
		failure(w, http.StatusBadRequest, "Invalid course progress path")
		return
	}
	courseID := parts[0]
	if r.Method == http.MethodGet {
		var progress int
		var completedAt sql.NullTime
		err := s.db.QueryRow("SELECT progress_percent, completed_at FROM user_course_progress WHERE user_id = ? AND course_id = ?", claims.ID, courseID).Scan(&progress, &completedAt)
		if err == sql.ErrNoRows {
			success(w, http.StatusOK, map[string]any{"progressPercent": 0, "completedAt": nil})
			return
		}
		if err != nil {
			failure(w, http.StatusInternalServerError, "Unable to load progress")
			return
		}
		var completed any
		if completedAt.Valid {
			completed = completedAt.Time
		}
		success(w, http.StatusOK, map[string]any{"progressPercent": progress, "completedAt": completed})
		return
	}
	if r.Method != http.MethodPost && r.Method != http.MethodPut {
		failure(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	var body struct {
		ProgressPercent int `json:"progressPercent"`
	}
	_ = decodeBody(r, &body)
	var completedAt any
	if body.ProgressPercent >= 100 {
		completedAt = time.Now()
		body.ProgressPercent = 100
	}
	_, err := s.db.Exec("INSERT INTO user_course_progress (user_id,course_id,progress_percent,completed_at) VALUES (?,?,?,?) ON CONFLICT (user_id, course_id) DO UPDATE SET progress_percent=EXCLUDED.progress_percent, completed_at=EXCLUDED.completed_at", claims.ID, courseID, body.ProgressPercent, completedAt)
	if err != nil {
		failure(w, http.StatusInternalServerError, "Unable to save progress")
		return
	}
	success(w, http.StatusOK, map[string]any{"progressPercent": body.ProgressPercent})
}

func (s *Server) submitProblem(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	problemKey := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/problems/"), "/submit")
	if problemKey == "" {
		failure(w, http.StatusBadRequest, "Problem id is required")
		return
	}
	var body struct {
		Name       string `json:"name"`
		Difficulty string `json:"difficulty"`
		Status     string `json:"status"`
		Score      int    `json:"score"`
	}
	if decodeBody(r, &body) != nil || body.Name == "" {
		failure(w, http.StatusBadRequest, "Problem name is required")
		return
	}
	if body.Difficulty != "Easy" && body.Difficulty != "Medium" && body.Difficulty != "Hard" {
		failure(w, http.StatusBadRequest, "Difficulty must be Easy, Medium, or Hard")
		return
	}
	if body.Status != "Accepted" && body.Status != "Attempted" {
		failure(w, http.StatusBadRequest, "Status must be Accepted or Attempted")
		return
	}
	if body.Score == 0 {
		body.Score = map[string]int{"Easy": 10, "Medium": 20, "Hard": 30}[body.Difficulty]
	}
	var previousStatus string
	previousErr := s.db.QueryRow("SELECT status FROM user_problem_submissions WHERE user_id = ? AND problem_key = ?", claims.ID, problemKey).Scan(&previousStatus)
	_, err := s.db.Exec(`INSERT INTO user_problem_submissions (user_id, problem_key, problem_name, difficulty, status, score) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (user_id, problem_key) DO UPDATE SET problem_name=EXCLUDED.problem_name, difficulty=EXCLUDED.difficulty, status=EXCLUDED.status, score=EXCLUDED.score, submitted_at=NOW()`, claims.ID, problemKey, body.Name, body.Difficulty, body.Status, body.Score)
	if err != nil {
		failure(w, http.StatusInternalServerError, "Unable to save problem submission")
		return
	}
	if body.Status == "Accepted" && (previousErr == sql.ErrNoRows || previousStatus != "Accepted") {
		_, _ = s.db.Exec("UPDATE users SET points = points + ? WHERE id = ?", body.Score, claims.ID)
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "data": map[string]any{"problemKey": problemKey, "status": body.Status, "score": body.Score}})
}

func (s *Server) problemSubmissions(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAuth(w, r)
	if !ok {
		return
	}
	rows, err := s.queryMaps("SELECT problem_key AS problemKey, status FROM user_problem_submissions WHERE user_id = ?", claims.ID)
	if err != nil {
		failure(w, http.StatusInternalServerError, "Unable to load problem submissions")
		return
	}
	success(w, http.StatusOK, rows)
}
