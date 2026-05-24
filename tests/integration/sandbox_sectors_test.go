//go:build integration

package integration_test

import (
	"context"
	"testing"
	"time"

	"github.com/daemon-platform/daemon/packages/go-common/testutil"
	"github.com/jackc/pgx/v5/pgxpool"
)

var sandboxSectorPackIDs = []string{
	"traffic-engineering", "healthcare-ops", "logistics-nvocc", "humanitarian-logistics",
	"public-health", "manufacturing-ops", "intelligence-ops", "finance-risk",
	"life-sciences-ops", "aml-fintech", "web3-intel", "banking-core",
	"federal-health", "government-finance", "agri-food", "insurance",
	"energy-utilities", "retail-ops", "rail-network", "telecom-ops",
	"construction-ops", "mission-tasking",
}

func TestSandboxSectorsSeeded(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Minute)
	defer cancel()

	env := testutil.SetupDataStores(ctx, t)
	defer env.Cleanup(ctx)
	if err := testutil.RunSeed(ctx, env); err != nil {
		t.Fatal(err)
	}

	pool, err := pgxpool.New(ctx, env.PostgresURL)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()

	for _, pack := range sandboxSectorPackIDs {
		pack := pack
		t.Run(pack, func(t *testing.T) {
			var n int
			err := pool.QueryRow(ctx, `
				SELECT COUNT(*) FROM ontology_objects
				WHERE tenant_id = 'tenant-demo' AND object_type = 'Site'
				  AND properties->>'vertical' = $1`, pack).Scan(&n)
			if err != nil {
				t.Fatal(err)
			}
			if n < 1 {
				t.Fatalf("expected ≥1 Site for vertical %q, got %d", pack, n)
			}
		})
	}
}
