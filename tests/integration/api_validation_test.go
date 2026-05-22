//go:build integration

package integration_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"
)

func TestOpenCaseReturns422ForUnknownSignal(t *testing.T) {
	ontologyURL := envOr("ONTOLOGY_SERVICE_URL", "http://127.0.0.1:8081")
	supabaseURL := envOr("SUPABASE_URL", "http://127.0.0.1:54331")
	anonKey := os.Getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if !serviceHealthy(ctx, ontologyURL) {
		t.Skip("ontology-service not running")
	}

	hdr := http.Header{}
	hdr.Set("Content-Type", "application/json")
	hdr.Set("X-Tenant-Id", "tenant-demo")
	if anonKey != "" {
		tok, err := supabasePasswordToken(ctx, supabaseURL, anonKey, "analyst@demo.local", "analyst")
		if err != nil {
			t.Skipf("supabase auth: %v", err)
		}
		hdr.Set("Authorization", "Bearer "+tok)
	}

	status, raw, err := apiPostStatus(ctx, ontologyURL+"/v1/actions/OpenCase", hdr, map[string]any{
		"title": "should fail", "signalIds": []string{"signal-does-not-exist-999"},
	})
	if err != nil {
		if strings.Contains(err.Error(), "missing required role") {
			t.Skipf("JWT missing analyst role: %v", err)
		}
		t.Fatal(err)
	}
	if status != 422 {
		t.Fatalf("expected 422, got %d body=%s", status, raw)
	}
	if !strings.Contains(raw, "SIGNAL_NOT_FOUND") {
		t.Fatalf("expected SIGNAL_NOT_FOUND in %s", raw)
	}
	if !strings.Contains(raw, "requestId") {
		t.Fatalf("expected requestId in error envelope: %s", raw)
	}
}

func apiPostStatus(ctx context.Context, url string, hdr http.Header, body map[string]any) (int, string, error) {
	b, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(b))
	if err != nil {
		return 0, "", err
	}
	req.Header = hdr.Clone()
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(raw), nil
}
