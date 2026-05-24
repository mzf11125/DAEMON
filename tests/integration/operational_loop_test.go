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
)

func TestOperationalLoopHTTP(t *testing.T) {
	ontologyURL := envOr("ONTOLOGY_SERVICE_URL", "http://127.0.0.1:8081")
	platformURL := envOr("PLATFORM_API_URL", "http://127.0.0.1:8080")
	caseURL := envOr("CASE_SERVICE_URL", "http://127.0.0.1:8084")
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
		t.Skip("no signals in ontology — run make seed and e2e-smoke prerequisites (see scripts/prove-operational-loop.sh)")
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

	caseBody, err := apiGet(ctx, caseURL+"/v1/cases/"+caseID, hdr)
	if err != nil {
		t.Fatalf("get case after open: %v", err)
	}
	sids, _ := caseBody["signalIds"].([]any)
	if len(sids) != 1 {
		t.Fatalf("getCase signalIds want [%s], got %v", signalPK, caseBody["signalIds"])
	}
	got, _ := sids[0].(string)
	if got != signalPK {
		t.Fatalf("getCase signalIds want [%s], got [%s]", signalPK, got)
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
