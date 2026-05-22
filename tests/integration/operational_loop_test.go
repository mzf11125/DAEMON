//go:build integration

package integration_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestOperationalLoopHTTP(t *testing.T) {
	ontologyURL := envOr("ONTOLOGY_SERVICE_URL", "http://127.0.0.1:8081")
	platformURL := envOr("PLATFORM_API_URL", "http://127.0.0.1:8080")
	caseURL := envOr("CASE_SERVICE_URL", "http://127.0.0.1:8084")
	runtimeDSN := envOr("DATABASE_URL", "postgresql://daemon_runtime:daemon_runtime_local@127.0.0.1:54332/postgres?sslmode=disable")
	supabaseURL := envOr("SUPABASE_URL", "http://127.0.0.1:54331")
	anonKey := os.Getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	if !serviceHealthy(ctx, ontologyURL) || !serviceHealthy(ctx, platformURL) || !serviceHealthy(ctx, caseURL) {
		t.Skip("services not running on 8080/8081/8084 — start stack or run scripts/e2e-smoke.sh")
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

	sigBody, err := apiGet(ctx, ontologyURL+"/v1/objects/Signal", hdr)
	if err != nil {
		t.Fatalf("list signals: %v", err)
	}
	signalPK := firstSignalPK(sigBody)
	if signalPK == "" {
		t.Fatal("no signals in ontology — run make seed")
	}

	openBody, err := apiPost(ctx, ontologyURL+"/v1/actions/OpenCase", hdr, map[string]any{
		"title": "integration operational loop", "signalIds": []string{signalPK},
	})
	if err != nil {
		if strings.Contains(err.Error(), "missing required role") {
			t.Skipf("JWT missing analyst role — run: ./scripts/supabase-seed-auth.sh (or make seed): %v", err)
		}
		t.Fatalf("open case: %v", err)
	}
	caseID := stringField(openBody, "caseId")
	if caseID == "" {
		t.Fatalf("missing caseId in %v", openBody)
	}

	pool, err := pgxpool.New(ctx, runtimeDSN)
	if err != nil {
		t.Skipf("postgres: %v", err)
	}
	defer pool.Close()
	var linkCount int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM case_signals WHERE case_id = $1 AND signal_id = $2`, caseID, signalPK).Scan(&linkCount); err != nil {
		t.Fatalf("case_signals query: %v", err)
	}
	if linkCount != 1 {
		t.Fatalf("expected case_signals row, got count=%d", linkCount)
	}

	_, err = apiPost(ctx, ontologyURL+"/v1/actions/RecordDecision", hdr, map[string]any{
		"caseId": caseID, "outcome": "cleared", "rationale": "integration test",
	})
	if err != nil {
		t.Fatalf("record decision: %v", err)
	}

	auditBody, err := apiGet(ctx, platformURL+"/v1/audit/events?resourceType=Case&resourceId="+caseID, hdr)
	if err != nil {
		t.Fatalf("list audit: %v", err)
	}
	items := auditItems(auditBody)
	if len(items) < 2 {
		t.Fatalf("expected >=2 Case audit events, got %d", len(items))
	}

	caseBody, err := apiGet(ctx, caseURL+"/v1/cases/"+caseID, hdr)
	if err != nil {
		t.Fatalf("get case: %v", err)
	}
	sids := caseBody["signalIds"]
	arr, ok := sids.([]any)
	if !ok || len(arr) != 1 {
		t.Fatalf("getCase signalIds want [%s], got %v", signalPK, sids)
	}
}

func serviceHealthy(ctx context.Context, base string) bool {
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(base, "/")+"/health", nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return false
	}
	resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

func apiGet(ctx context.Context, url string, hdr http.Header) (map[string]any, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header = hdr.Clone()
	return doAPI(req)
}

func apiPost(ctx context.Context, url string, hdr http.Header, body map[string]any) (map[string]any, error) {
	b, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	req.Header = hdr.Clone()
	return doAPI(req)
}

func doAPI(req *http.Request) (map[string]any, error) {
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var env struct {
		Data  map[string]any `json:"data"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	_ = json.Unmarshal(raw, &env)
	if resp.StatusCode >= 400 || env.Error != nil {
		return nil, fmt.Errorf("status %d: %s", resp.StatusCode, string(raw))
	}
	if env.Data != nil {
		return env.Data, nil
	}
	var direct map[string]any
	_ = json.Unmarshal(raw, &direct)
	return direct, nil
}

func firstSignalPK(body map[string]any) string {
	items, _ := body["items"].([]any)
	if len(items) == 0 {
		return ""
	}
	first, _ := items[0].(map[string]any)
	return stringField(first, "primaryKey")
}

func stringField(m map[string]any, key string) string {
	if m == nil {
		return ""
	}
	v, _ := m[key].(string)
	return v
}

func auditItems(body map[string]any) []any {
	items, _ := body["items"].([]any)
	return items
}
