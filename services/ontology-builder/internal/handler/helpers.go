package handler

import (
	"net/http"
	"strings"

	dhttp "github.com/daemon-platform/daemon/packages/go-common/http"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// isUniqueViolation checks if a Postgres error is a unique constraint violation.
func isUniqueViolation(err error) bool {
	if pgErr, ok := err.(*pgconn.PgError); ok {
		return pgErr.Code == "23505"
	}
	return strings.Contains(err.Error(), "unique constraint") ||
		strings.Contains(err.Error(), "duplicate key")
}

// HealthDB checks if a specific table exists in the database.
// Usage: GET /health/db?table=ontology_rules
func HealthDB(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		table := r.URL.Query().Get("table")
		if table == "" {
			dhttp.WriteJSON(w, http.StatusOK, map[string]any{
				"status": "ok",
				"db":     "connected",
			})
			return
		}

		var exists bool
		err := pool.QueryRow(r.Context(),
			`SELECT EXISTS (
				SELECT FROM information_schema.tables
				WHERE table_schema = 'public' AND table_name = $1
			)`, table,
		).Scan(&exists)
		if err != nil {
			dhttp.WriteErrorRequest(w, r, http.StatusInternalServerError, "DB_HEALTH_FAILED", err.Error())
			return
		}

		if exists {
			dhttp.WriteJSON(w, http.StatusOK, map[string]any{
				"status": "ok",
				"table":  table,
				"exists": true,
			})
		} else {
			dhttp.WriteErrorRequest(w, r, http.StatusNotFound, "TABLE_NOT_FOUND",
				"table '"+table+"' does not exist")
		}
	}
}
