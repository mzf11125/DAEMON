//go:build integration

package integration_test

import (
	"context"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"
)

func TestOpenCaseRejectsUnknownSignal(t *testing.T) {
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

	_, err := apiPost(ctx, ontologyURL+"/v1/actions/OpenCase", hdr, map[string]any{
		"title": "should fail", "signalIds": []string{"signal-does-not-exist-999"},
	})
	if err == nil {
		t.Fatal("expected error for unknown signal")
	}
	if strings.Contains(err.Error(), "missing required role") {
		t.Skipf("JWT missing analyst role — run: ./scripts/supabase-seed-auth.sh: %v", err)
	}
	if !strings.Contains(err.Error(), "SIGNAL_NOT_FOUND") && !strings.Contains(err.Error(), "signal not found") {
		t.Fatalf("unexpected error: %v", err)
	}
}
