//go:build integration

package integration_test

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"
)

func waitServiceHealth(t *testing.T, url, wantService string, timeout time.Duration) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		resp, err := http.Get(url)
		if err != nil {
			time.Sleep(500 * time.Millisecond)
			continue
		}
		var body struct {
			Status  string `json:"status"`
			Service string `json:"service"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&body)
		resp.Body.Close()
		if resp.StatusCode == http.StatusOK && body.Status == "ok" && body.Service == wantService {
			return
		}
		time.Sleep(500 * time.Millisecond)
	}
	t.Fatalf("timeout waiting for %s (want service=%s)", url, wantService)
}
