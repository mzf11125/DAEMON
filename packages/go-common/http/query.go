package http

import (
	"net/http"
	"strconv"
)

const (
	DefaultListLimit = 50
	MaxListLimit     = 200
)

// ParseListPagination reads limit and offset from query string.
func ParseListPagination(r *http.Request) (limit, offset int) {
	limit = DefaultListLimit
	offset = 0
	q := r.URL.Query()
	if v := q.Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
		}
	}
	if limit > MaxListLimit {
		limit = MaxListLimit
	}
	if v := q.Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}
	return limit, offset
}

// ListMeta builds pagination metadata for list responses.
func ListMeta(total, limit, offset, returned int) map[string]any {
	hasMore := offset+returned < total
	return map[string]any{
		"total":    total,
		"limit":    limit,
		"offset":   offset,
		"hasMore":  hasMore,
		"returned": returned,
	}
}
