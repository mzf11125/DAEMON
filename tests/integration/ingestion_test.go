//go:build integration

package integration_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"testing"
	"time"

	"github.com/daemon-platform/daemon/packages/go-common/testutil"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestIngestionJobSeedCSV(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Minute)
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

	body, _ := json.Marshal(map[string]string{"connector": "seed-csv"})
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, base+"/v1/jobs", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Tenant-Id", "tenant-demo")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusAccepted {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("create job: %d %s", resp.StatusCode, string(b))
	}
	var createdEnvelope struct {
		Data struct {
			JobID string `json:"jobId"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&createdEnvelope); err != nil {
		t.Fatal(err)
	}
	jobID := createdEnvelope.Data.JobID
	if jobID == "" {
		t.Fatal("empty jobId in create response")
	}

	deadline := time.Now().Add(4 * time.Minute)
	for time.Now().Before(deadline) {
		getReq, _ := http.NewRequestWithContext(ctx, http.MethodGet, base+"/v1/jobs/"+jobID, nil)
		getReq.Header.Set("X-Tenant-Id", "tenant-demo")
		getResp, err := http.DefaultClient.Do(getReq)
		if err != nil {
			time.Sleep(2 * time.Second)
			continue
		}
		var stEnvelope struct {
			Data struct {
				Status string `json:"status"`
			} `json:"data"`
		}
		_ = json.NewDecoder(getResp.Body).Decode(&stEnvelope)
		st := stEnvelope.Data
		getResp.Body.Close()
		if st.Status == "completed" {
			return
		}
		if st.Status == "failed" {
			t.Fatalf("job failed")
		}
		time.Sleep(2 * time.Second)
	}
	t.Fatal("job did not complete in time")
}

func TestIngestionJobTenantIsolation(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	env := testutil.SetupDataStores(ctx, t)
	defer env.Cleanup(ctx)

	pool, err := pgxpool.New(ctx, env.PostgresURL)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()

	_, err = pool.Exec(ctx, `INSERT INTO tenants (tenant_id, name) VALUES ('tenant-a', 'Tenant A') ON CONFLICT DO NOTHING`)
	if err != nil {
		t.Fatal(err)
	}

	jobID := "00000000-0000-4000-8000-000000000001"
	_, err = pool.Exec(ctx, `INSERT INTO tenants (tenant_id, name) VALUES ('tenant-a', 'Tenant A'), ('tenant-b', 'Tenant B') ON CONFLICT DO NOTHING`)
	if err != nil {
		t.Fatal(err)
	}
	_, err = pool.Exec(ctx,
		`INSERT INTO ingestion_jobs (job_id, tenant_id, connector, status) VALUES ($1::uuid,$2,$3,$4)`,
		jobID, "tenant-a", "seed-csv", "completed")
	if err != nil {
		t.Fatal(err)
	}

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

	base := fmt.Sprintf("http://localhost:%s", port)
	waitServiceHealth(t, base+"/health", "ingestion-service", proc, 90*time.Second)

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, base+"/v1/jobs/"+jobID, nil)
	req.Header.Set("X-Tenant-Id", "tenant-b")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 for other tenant, got %d", resp.StatusCode)
	}
}

