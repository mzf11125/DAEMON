//go:build integration

package integration_test

import (
	"bytes"
	"context"
	"encoding/json"
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
	if err := ch.Exec(ctx, `INSERT INTO dataset_observations (observation_id, label, value, unit, observed_at, asset_id, tenant_id, created_at, updated_at)
		VALUES ('obs-hot-1', 'temperature_c', 99.0, 'C', $1, 'asset-001', 'tenant-demo', $1, $1)`, now); err != nil {
		t.Fatal(err)
	}

	port := testutil.FreeTCPPort(t)
	rulesRoot := filepath.Join(env.RepoRoot, "ontology", "v2-compiled", "rules")
	if _, err := os.Stat(rulesRoot); err != nil {
		sync := exec.CommandContext(ctx, "make", "ontology-sync")
		sync.Dir = env.RepoRoot
		if out, err := sync.CombinedOutput(); err != nil {
			t.Fatalf("ontology-sync: %v: %s", err, out)
		}
	}
	proc := testutil.BuildAndStart(ctx, t, filepath.Join(env.RepoRoot, "services", "rules-engine"), "rules-engine",
		"DATABASE_URL="+env.PostgresURL,
		"CLICKHOUSE_DSN="+env.ClickHouseDSN,
		"HTTP_PORT="+port,
		"RULES_ROOT="+rulesRoot,
		"OIDC_REQUIRED=false",
	)
	defer stopService(proc)

	base := "http://localhost:" + port
	waitServiceHealth(t, base+"/health", "rules-engine", proc, 90*time.Second)

	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, base+"/v1/evaluate", bytes.NewReader([]byte("{}")))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Tenant-Id", "tenant-demo")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("evaluate: %d %s", resp.StatusCode, string(body))
	}
	var evalEnvelope struct {
		Data struct {
			Count int `json:"count"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &evalEnvelope); err != nil {
		t.Fatalf("decode evaluate: %v", err)
	}
	if evalEnvelope.Data.Count < 1 {
		t.Fatalf("evaluate returned count=%d (expected >=1); check RULES_ROOT and ClickHouse seed\nservice logs:\n%s", evalEnvelope.Data.Count, proc.Logs())
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
