//go:build integration

package integration_test

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/daemon-platform/daemon/packages/go-common/testutil"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestRulesEvaluateCreatesSignal(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	env := testutil.SetupDataStores(ctx, t)
	defer env.Cleanup(ctx)

	if err := testutil.RunSeed(ctx, env); err != nil {
		t.Fatal(err)
	}

	opts, err := clickhouse.ParseDSN(env.ClickHouseDSN)
	if err != nil {
		t.Fatal(err)
	}
	ch, err := clickhouse.Open(opts)
	if err != nil {
		t.Fatal(err)
	}
	defer ch.Close()

	now := time.Now().UTC()
	if err := ch.Exec(ctx, `INSERT INTO dataset_observations (observation_id, label, value, unit, observed_at, asset_id, created_at, updated_at)
		VALUES ('obs-hot-1', 'temperature_c', 99.0, 'C', $1, 'asset-001', $1, $1)`, now); err != nil {
		t.Fatal(err)
	}

	port := "18084"
	rulesRoot := filepath.Join(env.RepoRoot, "ontology", "v2", "rules")
	cmd := exec.CommandContext(ctx, "go", "run", "./cmd")
	cmd.Dir = filepath.Join(env.RepoRoot, "services", "rules-engine")
	cmd.Env = append(os.Environ(),
		"DATABASE_URL="+env.PostgresURL,
		"CLICKHOUSE_DSN="+env.ClickHouseDSN,
		"HTTP_PORT="+port,
		"RULES_ROOT="+rulesRoot,
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

	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, base+"/v1/evaluate", bytes.NewReader([]byte("{}")))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Tenant-Id", "tenant-demo")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("evaluate: %d %s", resp.StatusCode, string(b))
	}

	pool, err := pgxpool.New(ctx, env.PostgresURL)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()

	var n int
	if err := pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM ontology_objects WHERE tenant_id = 'tenant-demo' AND object_type = 'Signal' AND primary_key_value LIKE 'sig-rule-high-temperature-%'`).
		Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n < 1 {
		t.Fatalf("expected signal from high-temperature rule, count=%d", n)
	}

	var matched int
	if err := pool.QueryRow(ctx,
		`SELECT matched_count FROM rule_runs WHERE tenant_id = 'tenant-demo' AND rule_id = 'high-temperature' ORDER BY created_at DESC LIMIT 1`).
		Scan(&matched); err != nil {
		t.Fatal(err)
	}
	if matched < 1 {
		t.Fatalf("expected rule_runs.matched_count >= 1 for high-temperature, got %d", matched)
	}
}
