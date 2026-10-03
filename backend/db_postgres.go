package main

import (
	"database/sql"
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib" // register pgx driver
)

// openPostgresDB connects using DATABASE_URL (Neon) or PG* environment variables.
func openPostgresDB() (*sql.DB, error) {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		// Build from individual vars
		host := env("PGHOST", "localhost")
		port := env("PGPORT", "5432")
		user := env("PGUSER", "postgres")
		password := os.Getenv("PGPASSWORD")
		dbname := env("PGDATABASE", "neondb")
		sslmode := env("PGSSLMODE", "require")

		u := &url.URL{
			Scheme: "postgres",
			User:   url.UserPassword(user, password),
			Host:   fmt.Sprintf("%s:%s", host, port),
			Path:   dbname,
		}
		q := u.Query()
		q.Set("sslmode", sslmode)
		u.RawQuery = q.Encode()
		connStr = u.String()
	}

	// Neon sometimes adds channel_binding=require which some drivers dislike
	connStr = strings.ReplaceAll(connStr, "&channel_binding=require", "")
	connStr = strings.ReplaceAll(connStr, "?channel_binding=require&", "?")
	connStr = strings.ReplaceAll(connStr, "?channel_binding=require", "")

	var db *sql.DB
	var err error
	for attempt := 0; attempt < 15; attempt++ {
		db, err = sql.Open("pgx", connStr)
		if err == nil {
			err = db.Ping()
		}
		if err == nil {
			db.SetMaxOpenConns(10)
			db.SetMaxIdleConns(5)
			db.SetConnMaxLifetime(time.Hour)
			return db, nil
		}
		time.Sleep(time.Second)
	}
	return nil, fmt.Errorf("postgres connection failed: %w", err)
}
