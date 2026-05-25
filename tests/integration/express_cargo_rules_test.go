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

	runFeaturesPipeline(t, ctx, env)
	runPropensityTrain(t, ctx, env)

	rulesRoot := filepath.Join(env.RepoRoot, "ontology", "v2-compiled", "rules")
	propensityRule := filepath.Join(rulesRoot, "express-routing-propensity.json")
	if _, err := os.Stat(propensityRule); err != nil {
		sync := exec.CommandContext(ctx, "make", "ontology-sync")
		sync.Dir = env.RepoRoot
		if out, err := sync.CombinedOutput(); err != nil {
			t.Fatalf("ontology-sync: %v: %s", err, out)
		}
	}
	if _, err := os.Stat(propensityRule); err != nil {
		t.Fatalf("missing compiled rule %s: %v", propensityRule, err)
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

	for _, ruleID := range []string{
		"express-leg-sla-breach", "express-routing-anomaly", "express-champion-idle",
		"express-routing-propensity", "express-volume-trend-anomaly", "express-routing-propensity-ml",
	} {
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

	var confidenceScore string
	err = pool.QueryRow(ctx, `
		SELECT properties->'confidence'->>'score' FROM ontology_objects
		WHERE tenant_id = 'tenant-demo' AND object_type = 'Signal'
		  AND properties->>'provenanceRuleId' = 'express-routing-propensity'
		LIMIT 1`).Scan(&confidenceScore)
	if err != nil {
		t.Fatalf("propensity confidence score: %v", err)
	}
	if confidenceScore == "" {
		t.Fatal("expected confidence.score on express-routing-propensity Signal")
	}

	var evalEnvelope struct {
		Data struct {
			Count int `json:"count"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &evalEnvelope); err != nil {
		t.Fatal(err)
	}
	if evalEnvelope.Data.Count < 6 {
		t.Fatalf("evaluate count=%d, want >=6 express rules matched", evalEnvelope.Data.Count)
	}
}

func runPropensityTrain(t *testing.T, ctx context.Context, env *testutil.Env) {
	t.Helper()
	cmd := exec.CommandContext(ctx, "go", "run", "./cmd")
	cmd.Dir = filepath.Join(env.RepoRoot, "pipelines", "propensity-train")
	cmd.Env = append(os.Environ(), "CLICKHOUSE_DSN="+env.ClickHouseDSN, "TENANT_ID=tenant-demo")
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("pipeline-propensity-train: %v: %s", err, out)
	}
}

func runFeaturesPipeline(t *testing.T, ctx context.Context, env *testutil.Env) {
	t.Helper()
	cmd := exec.CommandContext(ctx, "go", "run", "./cmd")
	cmd.Dir = filepath.Join(env.RepoRoot, "pipelines", "features")
	cmd.Env = append(os.Environ(), "CLICKHOUSE_DSN="+env.ClickHouseDSN)
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("pipeline-features: %v: %s", err, out)
	}
}
