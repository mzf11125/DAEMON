//go:build integration

package integration_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"path/filepath"
	"testing"
	"time"

	"github.com/daemon-platform/daemon/packages/go-common/testutil"
)

func TestIngestionJobInvalidSimParams(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	env := testutil.SetupDataStores(ctx, t)
	defer env.Cleanup(ctx)

	port := testutil.FreeTCPPort(t)
	svcDir := filepath.Join(env.RepoRoot, "services", "ingestion-service")
	proc := testutil.BuildAndStart(ctx, t, svcDir, "ingestion-service",
		"DATABASE_URL="+env.PostgresURL,
		"CLICKHOUSE_DSN="+env.ClickHouseDSN,
		"HTTP_PORT="+port,
		"REPO_ROOT="+env.RepoRoot,
		"OIDC_REQUIRED=false",
	)
	defer stopService(proc)

	base := "http://localhost:" + port
	waitServiceHealth(t, base+"/health", "ingestion-service", proc, 90*time.Second)

	body, _ := json.Marshal(map[string]any{
		"connector": "sim-dune",
		"params":    map[string]any{},
	})
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, base+"/v1/jobs", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Tenant-Id", "tenant-demo")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected 400, got %d %s", resp.StatusCode, string(b))
	}
}
