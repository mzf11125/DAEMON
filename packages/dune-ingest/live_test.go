//go:build live

package duneingest_test

import (
	"context"
	"encoding/json"
	"os"
	"testing"

	"github.com/daemon-platform/daemon/packages/dune-ingest/ingestparams"
	"github.com/daemon-platform/daemon/packages/dune-ingest/sim"
)

func TestLiveSimBalances(t *testing.T) {
	if os.Getenv("DUNE_LIVE_TEST") != "1" {
		t.Skip("set DUNE_LIVE_TEST=1 and SIM_API_KEY to run")
	}
	cfg := ingestparams.RunConfigFromEnv("")
	if cfg.SimAPIKey == "" {
		t.Skip("SIM_API_KEY not set")
	}
	raw := json.RawMessage(`{"addresses":["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"],"chain_ids":[1],"sources":["balances"],"limit_per_address":5}`)
	if err := sim.Run(context.Background(), cfg, raw); err != nil {
		t.Fatal(err)
	}
}
