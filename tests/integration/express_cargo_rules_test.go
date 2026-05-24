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

	"github.com/daemon-platform/daemon/packages/go-common/testutil"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestExpressCargoRulesEvaluate(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Minute)
	defer cancel()

	env := testutil.SetupDataStores(ctx, t)
	defer env.Cleanup(ctx)
	if err := testutil.RunSeed(ctx, env); err != nil {
		t.Fatal(err)
	}

	rulesRoot := filepath.Join(env.RepoRoot, "ontology", "v2-compiled", "rules")
	if _, err := os.Stat(filepath.Join(rulesRoot, "express-leg-sla-breach.json")); err != nil {
		sync := exec.CommandContext(ctx, "make", "ontology-sync")
		sync.Dir = env.RepoRoot
		if out, err := sync.CombinedOutput(); err != nil {
			t.Fatalf("ontology-sync: %v: %s", err, out)
		}
	}

	port := testutil.FreeTCPPort(t)
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

	pool, err := pgxpool.New(ctx, env.PostgresURL)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()

	for _, ruleID := range []string{"express-leg-sla-breach", "express-routing-anomaly", "express-champion-idle"} {
		var n int
		err := pool.QueryRow(ctx, `
			SELECT COUNT(*) FROM ontology_objects
			WHERE tenant_id = 'tenant-demo' AND object_type = 'Signal'
			  AND primary_key_value LIKE $1
			  AND properties->>'provenanceRuleId' = $2`,
			"sig-rule-"+ruleID+"-%", ruleID).Scan(&n)
		if err != nil {
			t.Fatal(err)
		}
		if n < 1 {
			t.Fatalf("expected Signal from rule %q (sig-rule-%s-*), count=%d\nlogs:\n%s", ruleID, ruleID, n, proc.Logs())
		}
	}

	var evalEnvelope struct {
		Data struct {
			Count int `json:"count"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &evalEnvelope); err != nil {
		t.Fatal(err)
	}
	if evalEnvelope.Data.Count < 3 {
		t.Fatalf("evaluate count=%d, want >=3 express rules matched", evalEnvelope.Data.Count)
	}
}
