package main

import (
	"database/sql"
	"fmt"
)

func ensureUserDataTable(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS user_data_store (
			user_id VARCHAR(160) NOT NULL,
			data_key VARCHAR(64) NOT NULL,
			payload JSONB NOT NULL DEFAULT '{}',
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (user_id, data_key)
		)
	`)
	if err != nil {
		return fmt.Errorf("user_data_store: %w", err)
	}
	return nil
}
