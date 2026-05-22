package ingestparams

import (
	"encoding/json"
	"testing"

	"github.com/daemon-platform/daemon/packages/dune-ingest/bronze"
)

func TestValidateParamsSimDune(t *testing.T) {
	raw := json.RawMessage(`{"addresses":["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"],"chain_ids":[1],"sources":["balances"]}`)
	if err := ValidateParams("sim-dune", raw); err != nil {
		t.Fatal(err)
	}
	if err := ValidateParams("sim-dune", json.RawMessage(`{}`)); err == nil {
		t.Fatal("expected error for empty params")
	}
	if err := ValidateParams("sim-dune", json.RawMessage(`{"addresses":["0xabc"],"chain_ids":[]}`)); err == nil {
		t.Fatal("expected chain_ids required for EVM")
	}
}

func TestValidateParamsDuneSQLExecuteSQLPartition(t *testing.T) {
	good := json.RawMessage(`{
		"mode":"execute_sql",
		"sql":"SELECT 1 FROM ethereum.transactions WHERE block_date >= current_date - interval '7' day LIMIT 10",
		"column_map":{"observation_id":"id","asset_id":"wallet","label":"metric","value":"amount_usd","observed_at":"block_time"}
	}`)
	if err := ValidateParams("dune-sql", good); err != nil {
		t.Fatal(err)
	}
	bad := json.RawMessage(`{
		"mode":"execute_sql",
		"sql":"SELECT * FROM ethereum.transactions LIMIT 10",
		"column_map":{"observation_id":"id","asset_id":"wallet","label":"metric","value":"amount_usd","observed_at":"block_time"}
	}`)
	if err := ValidateParams("dune-sql", bad); err == nil {
		t.Fatal("expected partition filter error")
	}
}

func TestObservationIDDeterministic(t *testing.T) {
	a := bronze.ObservationID("sim-dune", "1", "evt", "0xabc", "balance_usd")
	b := bronze.ObservationID("sim-dune", "1", "evt", "0xabc", "balance_usd")
	if a != b {
		t.Fatalf("ids differ: %s vs %s", a, b)
	}
}
