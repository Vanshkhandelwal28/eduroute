package main

import (
	"database/sql"
	"fmt"
)

func ensureBuddySyncTable(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS buddy_sync_store (
			user_id VARCHAR(160) PRIMARY KEY,
			payload JSONB NOT NULL DEFAULT '{}',
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return fmt.Errorf("buddy_sync_store: %w", err)
	}
	return nil
}
