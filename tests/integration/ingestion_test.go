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
	"os/exec"
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

	port := "18082"
	cmd := exec.CommandContext(ctx, "go", "run", "./cmd")
	cmd.Dir = filepath.Join(env.RepoRoot, "services", "ingestion-service")
	cmd.Env = append(os.Environ(),
		"DATABASE_URL="+env.PostgresURL,
		"CLICKHOUSE_DSN="+env.ClickHouseDSN,
		"HTTP_PORT="+port,
		"REPO_ROOT="+env.RepoRoot,
	)
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	defer func() {
		_ = cmd.Process.Kill()
		_, _ = cmd.Process.Wait()
	}()

	base := "http://localhost:" + port
	waitHealth(t, base+"/health", 90*time.Second)

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
	var created struct {
		JobID string `json:"jobId"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&created); err != nil {
		t.Fatal(err)
	}

	deadline := time.Now().Add(4 * time.Minute)
	for time.Now().Before(deadline) {
		getReq, _ := http.NewRequestWithContext(ctx, http.MethodGet, base+"/v1/jobs/"+created.JobID, nil)
		getReq.Header.Set("X-Tenant-Id", "tenant-demo")
		getResp, err := http.DefaultClient.Do(getReq)
		if err != nil {
			time.Sleep(2 * time.Second)
			continue
		}
		var st struct {
			Status string `json:"status"`
		}
		_ = json.NewDecoder(getResp.Body).Decode(&st)
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

	jobID := "00000000-0000-4000-8000-000000000001"
	_, err = pool.Exec(ctx,
		`INSERT INTO ingestion_jobs (job_id, tenant_id, connector, status) VALUES ($1::uuid,$2,$3,$4)`,
		jobID, "tenant-a", "seed-csv", "completed")
	if err != nil {
		t.Fatal(err)
	}

	port := "18083"
	cmd := exec.CommandContext(ctx, "go", "run", "./cmd")
	cmd.Dir = filepath.Join(env.RepoRoot, "services", "ingestion-service")
	cmd.Env = append(os.Environ(),
		"DATABASE_URL="+env.PostgresURL,
		"CLICKHOUSE_DSN="+env.ClickHouseDSN,
		"HTTP_PORT="+port,
		"REPO_ROOT="+env.RepoRoot,
	)
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	defer func() {
		_ = cmd.Process.Kill()
		_, _ = cmd.Process.Wait()
	}()

	base := fmt.Sprintf("http://localhost:%s", port)
	waitHealth(t, base+"/health", 90*time.Second)

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

func waitHealth(t *testing.T, url string, timeout time.Duration) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		resp, err := http.Get(url)
		if err == nil && resp.StatusCode == http.StatusOK {
			resp.Body.Close()
			return
		}
		if resp != nil {
			resp.Body.Close()
		}
		time.Sleep(time.Second)
	}
	t.Fatalf("timeout waiting for %s", url)
}
