//go:build integration

package integration_test

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/daemon-platform/daemon/packages/go-common/testutil"
	"github.com/golang-jwt/jwt/v5"
)

const (
	testJWTSecret   = "super-secret-jwt-for-tests-only-32bytes!"
	testSupabaseURL = "http://127.0.0.1:54331"
)

// testJWTEnv returns env vars so ontology-service validates HS256 planner/analyst tokens in integration tests.
func testJWTEnv() []string {
	return []string{
		"SUPABASE_JWT_SECRET=" + testJWTSecret,
		"SUPABASE_URL=" + testSupabaseURL,
		"OIDC_AUDIENCE=authenticated",
	}
}

func testBearerToken(t *testing.T, roles []string, tenantID string) string {
	t.Helper()
	if tenantID == "" {
		tenantID = "tenant-demo"
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":       "integration-planner",
		"aud":       "authenticated",
		"tenant_id": tenantID,
		"roles":     roles,
		"exp":       time.Now().Add(time.Hour).Unix(),
	})
	signed, err := tok.SignedString([]byte(testJWTSecret))
	if err != nil {
		t.Fatal(err)
	}
	return signed
}

func setPlannerAuthT(t *testing.T, req *http.Request) {
	t.Helper()
	req.Header.Set("Authorization", "Bearer "+testBearerToken(t, []string{"operations_planner"}, "tenant-demo"))
}

func waitServiceHealth(t *testing.T, url, wantService string, proc *testutil.ServiceProcess, timeout time.Duration) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if proc != nil && !proc.Alive() {
			t.Fatalf("service exited before healthy; logs:\n%s", proc.Logs())
		}
		resp, err := http.Get(url)
		if err != nil {
			time.Sleep(500 * time.Millisecond)
			continue
		}
		var envelope struct {
			Data struct {
				Status  string `json:"status"`
				Service string `json:"service"`
			} `json:"data"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&envelope)
		resp.Body.Close()
		body := envelope.Data
		if resp.StatusCode == http.StatusOK && body.Status == "ok" && body.Service == wantService {
			return
		}
		time.Sleep(500 * time.Millisecond)
	}
	logs := ""
	if proc != nil {
		logs = proc.Logs()
	}
	t.Fatalf("timeout waiting for %s (want service=%s)\nlogs:\n%s", url, wantService, logs)
}

func stopService(proc *testutil.ServiceProcess) {
	if proc == nil || proc.Cmd == nil || proc.Cmd.Process == nil {
		return
	}
	_ = proc.Cmd.Process.Kill()
	_, _ = proc.Cmd.Process.Wait()
}
