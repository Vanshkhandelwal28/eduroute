package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Server struct {
	db        *DB
	jwtSecret []byte
}
type contextKey string

const userKey contextKey = "user"

type UserClaims struct {
	ID                 string `json:"id"`
	Name               string `json:"name"`
	Email              string `json:"email"`
	Role               string `json:"role"`
	VerificationStatus string `json:"verificationStatus"`
	jwt.RegisteredClaims
}
type apiEnvelope struct {
	Success bool   `json:"success"`
	Data    any    `json:"data,omitempty"`
	Token   string `json:"token,omitempty"`
	User    any    `json:"user,omitempty"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

func main() {
	db, err := openDB()
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	server := &Server{db: db, jwtSecret: []byte(env("JWT_SECRET", "secret"))}
	if err := ensureSchema(db.DB); err != nil {
		log.Fatal(err)
	}
	if err := server.ensureDefaultAdmin(); err != nil {
		log.Printf("default admin initialization failed: %v", err)
	}
	if err := server.ensureStarterCourse(); err != nil {
		log.Printf("starter course initialization failed: %v", err)
	}
	if os.Getenv("ENABLE_DEMO_ACCOUNT") == "true" {
		if err := server.ensureDemoStudent(); err != nil {
			log.Printf("demo student initialization failed: %v", err)
		}
	}
	if os.Getenv("SEED_DATA") == "true" {
		if err := server.seedData(); err != nil {
			log.Fatal(err)
		}
		return
	}
	port := env("PORT", "5000")
	log.Printf("Go API running on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, server.routes()))
}

func openDB() (*DB, error) {
	raw, err := openPostgresDB()
	if err != nil {
		return nil, err
	}
	return &DB{DB: raw}, nil
}
func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
func success(w http.ResponseWriter, status int, data any) {
	writeJSON(w, status, apiEnvelope{Success: true, Data: data})
}
func failure(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, apiEnvelope{Success: false, Error: message})
}
func decodeBody(r *http.Request, target any) error { return json.NewDecoder(r.Body).Decode(target) }
func idString(value any) string {
	switch v := value.(type) {
	case int64:
		return strconv.FormatInt(v, 10)
	case int:
		return strconv.Itoa(v)
	case []byte:
		return string(v)
	case string:
		return v
	default:
		return fmt.Sprint(v)
	}
}
