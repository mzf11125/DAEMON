package handler

import (
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
)

// isUniqueViolation checks if a Postgres error is a unique constraint violation.
func isUniqueViolation(err error) bool {
	if pgErr, ok := err.(*pgconn.PgError); ok {
		return pgErr.Code == "23505"
	}
	return strings.Contains(err.Error(), "unique constraint") ||
		strings.Contains(err.Error(), "duplicate key")
}
