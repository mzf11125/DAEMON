package config

import (
	"os"
	"strconv"
	"time"
)

type Base struct {
	HTTPPort        int
	ShutdownTimeout time.Duration
	DatabaseURL     string
	ClickHouseDSN   string
	Neo4jURI        string
	Neo4jUser       string
	Neo4jPassword   string
	OntologyRoot    string
}

func LoadHTTPPort(defaultPort int) int {
	if v := os.Getenv("HTTP_PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil {
			return p
		}
	}
	return defaultPort
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func LoadBase(defaultPort int) Base {
	return Base{
		HTTPPort:        LoadHTTPPort(defaultPort),
		ShutdownTimeout: 15 * time.Second,
		DatabaseURL:     getenv("DATABASE_URL", "postgres://daemon:daemon@localhost:5432/daemon?sslmode=disable"),
		ClickHouseDSN:   getenv("CLICKHOUSE_DSN", "clickhouse://daemon:daemon@localhost:9000/daemon"),
		Neo4jURI:        getenv("NEO4J_URI", "neo4j://localhost:7687"),
		Neo4jUser:       getenv("NEO4J_USER", "neo4j"),
		Neo4jPassword:   getenv("NEO4J_PASSWORD", "daemonneo4j"),
		OntologyRoot:    getenv("ONTOLOGY_ROOT", "../../ontology/v2-compiled"),
	}
}
