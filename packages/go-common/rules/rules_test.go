package rules

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRenderSQL(t *testing.T) {
	rule := RuleDef{
		ID:        "high-temperature",
		SQL:       "SELECT observation_id, asset_id, value FROM dataset_observations WHERE value > {threshold:Float64}",
		Threshold: 85.5,
	}
	got, err := RenderSQL(rule, "")
	if err != nil {
		t.Fatal(err)
	}
	want := "SELECT observation_id, asset_id, value FROM daemon.dataset_observations WHERE value > 85.5"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
	gotTenant, err := RenderSQL(rule, "tenant-demo")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(gotTenant, "tenant_id = 'tenant-demo'") {
		t.Fatalf("expected tenant filter in %q", gotTenant)
	}
}

func TestValidateSQLRejectsMutation(t *testing.T) {
	cases := []string{
		"INSERT INTO t SELECT 1",
		"SELECT 1; DROP TABLE t",
		"SELECT 1 -- comment",
		"WITH x AS (DELETE FROM t) SELECT 1",
	}
	for _, q := range cases {
		if err := ValidateSQL(q); err == nil {
			t.Fatalf("expected error for %q", q)
		}
	}
}

func TestOntologyRuleFiles(t *testing.T) {
	root := filepath.Join("..", "..", "..", "ontology", "v2", "rules")
	entries, err := os.ReadDir(root)
	if err != nil {
		t.Skip("ontology rules dir not found:", err)
	}
	for _, e := range entries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".json" {
			continue
		}
		b, err := os.ReadFile(filepath.Join(root, e.Name()))
		if err != nil {
			t.Fatal(err)
		}
		var rule RuleDef
		if err := json.Unmarshal(b, &rule); err != nil {
			t.Fatalf("%s: %v", e.Name(), err)
		}
		if err := ValidateRuleFile(rule); err != nil {
			t.Fatalf("%s: %v", e.Name(), err)
		}
	}
}

func TestValidateRuleFile(t *testing.T) {
	if err := ValidateRuleFile(RuleDef{ID: "x", SQL: "SELECT 1 WHERE v > {threshold:Float64}"}); err != nil {
		t.Fatal(err)
	}
	if err := ValidateRuleFile(RuleDef{ID: "x", SQL: "DELETE FROM t"}); err == nil {
		t.Fatal("expected error")
	}
}
