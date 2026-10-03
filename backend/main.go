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
	db        *sql.DB
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
	if err := ensureSchema(db); err != nil {
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

func openDB() (*sql.DB, error) {
	return openPostgresDB()
}
