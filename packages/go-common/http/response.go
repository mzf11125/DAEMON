package http

import (
	"encoding/json"
	"net/http"
	"time"
)

type ErrorBody struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	RequestID string `json:"requestId,omitempty"`
	Timestamp string `json:"timestamp"`
}

type Envelope struct {
	Data  any        `json:"data,omitempty"`
	Error *ErrorBody `json:"error,omitempty"`
}

func WriteJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(Envelope{Data: data})
}

// WriteError writes a JSON error envelope (no request id when request is unavailable).
func WriteError(w http.ResponseWriter, status int, code, message string) {
	writeError(w, nil, status, code, message)
}

// WriteErrorRequest includes requestId and timestamp from the request context.
func WriteErrorRequest(w http.ResponseWriter, r *http.Request, status int, code, message string) {
	writeError(w, r, status, code, message)
}

func writeError(w http.ResponseWriter, r *http.Request, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	body := ErrorBody{
		Code:      code,
		Message:   message,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
	if r != nil {
		body.RequestID = RequestIDFromContext(r.Context())
	}
	_ = json.NewEncoder(w).Encode(Envelope{Error: &body})
}

// StatusUnprocessable is used for semantic validation failures (missing/invalid fields).
const StatusUnprocessable = 422
