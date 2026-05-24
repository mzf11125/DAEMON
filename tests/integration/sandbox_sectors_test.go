//go:build integration

package integration_test

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
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
	"energy-utilities", 	"retail-ops", "rail-network", "telecom-ops",
	"construction-ops", "mission-tasking", "logistics-express-cargo",
}

// expectedSignalPK maps sandbox packId to a seeded Signal primary key (synthetic demo IDs only).
func expectedSignalPK(pack string) string {
	if pk, ok := sandboxSignalPK[pack]; ok {
		return pk
	}
	return fmt.Sprintf("signal-%s-001", pack)
}

var sandboxSignalPK = map[string]string{
	"traffic-engineering":     "signal-traffic-001",
	"healthcare-ops":          "signal-health-001",
	"logistics-nvocc":         "signal-logistics-001",
	"humanitarian-logistics":  "signal-human-001",
	"public-health":           "signal-phs-001",
	"manufacturing-ops":       "signal-001",
	"agri-food":               "signal-agrifood-001",
	"energy-utilities":        "signal-energy-001",
	"web3-intel":              "signal-web3i-001",
	"banking-core":            "signal-bank-001",
	"aml-fintech":             "signal-aml-001",
	"life-sciences-ops":       "signal-life-sciences-ops-001",
	"intelligence-ops":        "signal-intelligence-ops-001",
	"finance-risk":            "signal-finance-risk-001",
	"federal-health":          "signal-federal-health-001",
	"government-finance":      "signal-government-finance-001",
	"insurance":               "signal-insurance-001",
	"retail-ops":              "signal-retail-ops-001",
	"rail-network":            "signal-rail-network-001",
	"telecom-ops":             "signal-telecom-ops-001",
	"construction-ops":        "signal-construction-ops-001",
	"mission-tasking":         "signal-mission-tasking-001",
	"logistics-express-cargo": "signal-logistics-express-cargo-001",
}

// sandboxGeoEnabledPacks matches connectors/synthetic/*/manifest.json geoEnabled=true.
var sandboxGeoEnabledPacks = []string{
	"traffic-engineering", "healthcare-ops", "logistics-nvocc", "humanitarian-logistics",
	"public-health", "manufacturing-ops", "intelligence-ops", "life-sciences-ops",
	"federal-health", "agri-food", "energy-utilities", "retail-ops", "rail-network",
	"telecom-ops", "construction-ops", "mission-tasking", "logistics-express-cargo",
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
			var siteCount int
			err := pool.QueryRow(ctx, `
				SELECT COUNT(*) FROM ontology_objects
				WHERE tenant_id = 'tenant-demo' AND object_type = 'Site'
				  AND properties->>'vertical' = $1`, pack).Scan(&siteCount)
			if err != nil {
				t.Fatal(err)
			}
			if siteCount < 1 {
				t.Fatalf("expected ≥1 Site for vertical %q, got %d", pack, siteCount)
			}

			signalPK := expectedSignalPK(pack)
			var signalCount int
			err = pool.QueryRow(ctx, `
				SELECT COUNT(*) FROM ontology_objects
				WHERE tenant_id = 'tenant-demo' AND object_type = 'Signal'
				  AND primary_key_value = $1`, signalPK).Scan(&signalCount)
			if err != nil {
				t.Fatal(err)
			}
			if signalCount < 1 {
				t.Fatalf("expected Signal %q for pack %q, got %d", signalPK, pack, signalCount)
			}
		})
	}
}

func TestSandboxGeoMapGeoEnabledPacks(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Minute)
	defer cancel()

	env := testutil.SetupDataStores(ctx, t)
	defer env.Cleanup(ctx)
	if err := testutil.RunSeed(ctx, env); err != nil {
		t.Fatal(err)
	}

	base, proc := startPlatformAPI(ctx, t, env, nil)
	defer stopService(proc)

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, base+"/v1/geo/map", nil)
	req.Header.Set("X-Tenant-Id", "tenant-demo")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("geo map: %d %s", resp.StatusCode, string(b))
	}
	var envelope struct {
		Data struct {
			Sites  []map[string]any `json:"sites"`
			Assets []map[string]any `json:"assets"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
		t.Fatal(err)
	}

	verticalPins := map[string]int{}
	countVertical := func(items []map[string]any) {
		for _, item := range items {
			v, _ := item["vertical"].(string)
			if v != "" {
				verticalPins[v]++
			}
		}
	}
	countVertical(envelope.Data.Sites)
	countVertical(envelope.Data.Assets)

	for _, pack := range sandboxGeoEnabledPacks {
		if verticalPins[pack] < 1 {
			t.Fatalf("expected ≥1 geo pin for geoEnabled pack %q in /v1/geo/map, got %d", pack, verticalPins[pack])
		}
	}
}

func TestMissionTaskingProximityAssets(t *testing.T) {
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

	for _, assetID := range []string{"asset-friendly-001", "track-hostile-001"} {
		var n int
		err := pool.QueryRow(ctx, `
			SELECT COUNT(*) FROM ontology_objects
			WHERE tenant_id = 'tenant-demo' AND object_type = 'Asset'
			  AND primary_key_value = $1`, assetID).Scan(&n)
		if err != nil {
			t.Fatal(err)
		}
		if n != 1 {
			t.Fatalf("expected asset %q, got count %d", assetID, n)
		}
	}
}
