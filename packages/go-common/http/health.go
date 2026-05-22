package http

import (
	"net/http"
	"os"
)

// MountHealth registers public /health and control-plane /internal/health (same payload).
func MountHealth(r interface {
	Get(pattern string, h http.HandlerFunc)
}, service string) {
	handler := func(w http.ResponseWriter, _ *http.Request) {
		WriteJSON(w, http.StatusOK, map[string]string{
			"status":  "ok",
			"service": service,
			"version": os.Getenv("GIT_SHA"),
		})
	}
	r.Get("/health", handler)
	r.Get("/internal/health", handler)
}
