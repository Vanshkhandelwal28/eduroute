package main

import (
	"database/sql"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func ensureSchema(db *sql.DB) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			name VARCHAR(160) NOT NULL,
			email VARCHAR(255) NOT NULL UNIQUE,
			password BYTEA NOT NULL,
			role VARCHAR(32) NOT NULL DEFAULT 'student',
			is_verified BOOLEAN NOT NULL DEFAULT FALSE,
			college_verified VARCHAR(32) NOT NULL DEFAULT 'none',
			points INT NOT NULL DEFAULT 0,
			language_preference VARCHAR(32) NOT NULL DEFAULT 'en',
			avatar VARCHAR(500) NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS otps (
			id BIGSERIAL PRIMARY KEY,
			email VARCHAR(255) NOT NULL,
			code_hash VARCHAR(255) NOT NULL,
			expires_at TIMESTAMPTZ NOT NULL,
			attempt_count INT NOT NULL DEFAULT 0,
			last_sent_at TIMESTAMPTZ NOT NULL,
			locked_until TIMESTAMPTZ NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_otps_email_created ON otps (email, created_at)`,
		`CREATE TABLE IF NOT EXISTS college_verifications (
			id BIGSERIAL PRIMARY KEY,
			user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			doc_url VARCHAR(1000) NOT NULL,
			file_name VARCHAR(255) NOT NULL DEFAULT '',
			mime_type VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
			file_size BIGINT NOT NULL DEFAULT 0,
			doc_data BYTEA NULL,
			status VARCHAR(32) NOT NULL DEFAULT 'pending',
			remarks TEXT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS roadmaps (
			id SERIAL PRIMARY KEY,
			name VARCHAR(160) NOT NULL,
			slug VARCHAR(160) NOT NULL UNIQUE,
			description TEXT NULL,
			icon VARCHAR(255) NULL,
			modules_json JSONB NOT NULL DEFAULT '[]',
			updated_by VARCHAR(160) NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS user_roadmap_progress (
			id BIGSERIAL PRIMARY KEY,
			user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			roadmap_id INT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
			completed_tasks JSONB NOT NULL DEFAULT '[]',
			points_earned INT NOT NULL DEFAULT 0,
			UNIQUE (user_id, roadmap_id)
		)`,
		`CREATE TABLE IF NOT EXISTS assessments (
			id SERIAL PRIMARY KEY,
			title VARCHAR(255) NOT NULL,
			category VARCHAR(160) NOT NULL,
			questions_json JSONB NOT NULL DEFAULT '[]',
			points INT NOT NULL DEFAULT 100,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS attempts (
			id BIGSERIAL PRIMARY KEY,
			user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			assessment_id INT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
			score INT NOT NULL DEFAULT 0,
			total_questions INT NOT NULL DEFAULT 0,
			answers_json JSONB NOT NULL DEFAULT '[]',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS user_problem_submissions (
			id BIGSERIAL PRIMARY KEY,
			user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			problem_key VARCHAR(160) NOT NULL,
			problem_name VARCHAR(255) NOT NULL,
			difficulty VARCHAR(32) NOT NULL,
			status VARCHAR(32) NOT NULL,
			score INT NOT NULL DEFAULT 0,
			submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE (user_id, problem_key)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_problem_activity ON user_problem_submissions (user_id, submitted_at)`,
		`CREATE TABLE IF NOT EXISTS companies (
			id SERIAL PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			sector VARCHAR(160) NULL,
			website VARCHAR(500) NULL,
			logo VARCHAR(500) NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS internships (
			id SERIAL PRIMARY KEY,
			company_id INT NULL REFERENCES companies(id) ON DELETE SET NULL,
			title VARCHAR(255) NOT NULL,
			description TEXT NULL,
			location VARCHAR(255) NULL,
			mode VARCHAR(64) NULL,
			stipend VARCHAR(64) NULL,
			tags JSONB NOT NULL DEFAULT '[]',
			published BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS events (
			id SERIAL PRIMARY KEY,
			title VARCHAR(255) NOT NULL,
			description TEXT NULL,
			city VARCHAR(160) NULL,
			event_date DATE NULL,
			month_tag VARCHAR(32) NULL,
			image VARCHAR(500) NULL
		)`,
		`CREATE TABLE IF NOT EXISTS rewards (
			id SERIAL PRIMARY KEY,
			title VARCHAR(255) NOT NULL,
			description TEXT NULL,
			points_required INT NOT NULL DEFAULT 0,
			partner VARCHAR(160) NULL,
			category VARCHAR(160) NULL
		)`,
		`CREATE TABLE IF NOT EXISTS soft_skill_lessons (
			id SERIAL PRIMARY KEY,
			title VARCHAR(255) NOT NULL,
			content TEXT NULL,
			video_url VARCHAR(500) NULL
		)`,
		`CREATE TABLE IF NOT EXISTS soft_skill_attempts (
			id BIGSERIAL PRIMARY KEY,
			user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			lesson_id INT NOT NULL REFERENCES soft_skill_lessons(id) ON DELETE CASCADE,
			score INT NOT NULL DEFAULT 0,
			UNIQUE (user_id, lesson_id)
		)`,
		`CREATE TABLE IF NOT EXISTS courses (
			id SERIAL PRIMARY KEY,
			title VARCHAR(255) NOT NULL,
			description TEXT NULL,
			category VARCHAR(160) NULL,
			level VARCHAR(64) NULL,
			duration VARCHAR(64) NULL,
			instructor VARCHAR(160) NULL,
			thumbnail VARCHAR(500) NULL,
			playlist_url VARCHAR(500) NULL,
			youtube_url VARCHAR(500) NULL,
			resource_url VARCHAR(500) NULL,
			published BOOLEAN NOT NULL DEFAULT TRUE,
			created_by INT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS user_course_progress (
			user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
			progress_percent SMALLINT NOT NULL DEFAULT 0,
			completed_at TIMESTAMPTZ NULL,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (user_id, course_id)
		)`,
		`CREATE TABLE IF NOT EXISTS buddy_progress (
			user_id VARCHAR(160) PRIMARY KEY,
			points INT NOT NULL DEFAULT 0,
			level INT NOT NULL DEFAULT 1,
			achievements JSONB NOT NULL DEFAULT '[]',
			missing_skills JSONB NOT NULL DEFAULT '[]',
			weekly_challenges JSONB NOT NULL DEFAULT '[]',
			preferred_language VARCHAR(32) NOT NULL DEFAULT 'english',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS buddy_chat_messages (
			id BIGSERIAL PRIMARY KEY,
			user_id VARCHAR(160) NOT NULL,
			message_role VARCHAR(32) NOT NULL,
			text TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_buddy_messages ON buddy_chat_messages (user_id, created_at)`,
		`CREATE TABLE IF NOT EXISTS user_ai_courses (
			id VARCHAR(64) PRIMARY KEY,
			user_id VARCHAR(160) NOT NULL,
			title VARCHAR(255) NOT NULL,
			payload JSONB NOT NULL DEFAULT '{}',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_user_ai_courses_user ON user_ai_courses (user_id, updated_at DESC)`,
		`CREATE TABLE IF NOT EXISTS buddy_conversations (
			id VARCHAR(64) PRIMARY KEY,
			user_id VARCHAR(160) NOT NULL,
			title VARCHAR(255) NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS buddy_messages (
			id VARCHAR(64) PRIMARY KEY,
			conversation_id VARCHAR(64) NOT NULL,
			role VARCHAR(32) NOT NULL,
			content TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
	}
	for index, statement := range statements {
		if _, err := db.Exec(statement); err != nil {
			return fmt.Errorf("schema statement %d: %w", index+1, err)
		}
	}
	return nil
}

func (s *Server) ensureAdminUser(email, name, plainPassword string) error {
	var id int64
	err := s.db.QueryRow("SELECT id FROM users WHERE email = ? LIMIT 1", email).Scan(&id)
	if err == nil {
		return nil
	}
	if err != sql.ErrNoRows {
		return err
	}
	password, err := bcrypt.GenerateFromPassword([]byte(plainPassword), 12)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(
		"INSERT INTO users (name,email,password,role,is_verified,college_verified) VALUES (?,?,?,?,TRUE,?)",
		name, email, password, "admin", "verified",
	)
	return err
}

func (s *Server) ensureDefaultAdmin() error {
	if err := s.ensureAdminUser("vansh777@gmail.com", "EDUROUTE Staff Admin", "timepass"); err != nil {
		return err
	}
	return s.ensureAdminUser("admin@gmail.com", "EduRoute Admin", "timepass")
}

func (s *Server) ensureStarterCourse() error {
	var count int
	if err := s.db.QueryRow("SELECT COUNT(*) FROM courses").Scan(&count); err != nil || count > 0 {
		return err
	}
	var adminID int64
	if err := s.db.QueryRow("SELECT id FROM users WHERE email IN (?, ?) ORDER BY id ASC LIMIT 1", "admin@gmail.com", "vansh777@gmail.com").Scan(&adminID); err != nil {
		return err
	}
	_, err := s.db.Exec("INSERT INTO courses (title,description,category,level,duration,instructor,created_by) VALUES (?,?,?,?,?,?,?)", "Web Development Foundations", "Learn HTML, CSS, JavaScript, and the fundamentals needed to build your first web project.", "Development", "Beginner", "8 weeks", "EDUROUTE Learning Team", adminID)
	return err
}

func (s *Server) ensureDemoStudent() error {
	const email = "demo.student@eduroute.local"
	const password = "EduRouteDemo123!"
	var userID int64
	err := s.db.QueryRow("SELECT id FROM users WHERE email = ? LIMIT 1", email).Scan(&userID)
	if err == sql.ErrNoRows {
		hashed, hashErr := bcrypt.GenerateFromPassword([]byte(password), 12)
		if hashErr != nil {
			return hashErr
		}
		err = s.db.QueryRow(
			"INSERT INTO users (name,email,password,role,is_verified,college_verified) VALUES (?,?,?,?,TRUE,?) RETURNING id",
			"Demo Student", email, hashed, "student", "verified",
		).Scan(&userID)
		if err != nil {
			return err
		}
	} else if err != nil {
		return err
	}
	hashed, hashErr := bcrypt.GenerateFromPassword([]byte(password), 12)
	if hashErr != nil {
		return hashErr
	}
	if _, err = s.db.Exec("UPDATE users SET password = ?, role = 'student', is_verified = TRUE, college_verified = 'verified' WHERE id = ?", hashed, userID); err != nil {
		return err
	}
	return nil
}
