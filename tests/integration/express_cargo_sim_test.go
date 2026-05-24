//go:build integration

package integration_test

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/daemon-platform/daemon/packages/go-common/testutil"
	"github.com/jackc/pgx/v5/pgxpool"
)

const expressCargoPack = "logistics-express-cargo"

func TestExpressCargoSim(t *testing.T) {
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

	var shipmentCount int
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM ontology_objects
		WHERE tenant_id = 'tenant-demo' AND object_type = 'Shipment'
		  AND properties->>'vertical' = $1`, expressCargoPack).Scan(&shipmentCount); err != nil {
		t.Fatal(err)
	}
	if shipmentCount < 2 {
		t.Fatalf("expected ≥2 Shipments for %q, got %d", expressCargoPack, shipmentCount)
	}

	var legCount int
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM ontology_objects
		WHERE tenant_id = 'tenant-demo' AND object_type = 'ShipmentLeg'`).Scan(&legCount); err != nil {
		t.Fatal(err)
	}
	if legCount < 2 {
		t.Fatalf("expected ≥2 ShipmentLeg rows, got %d", legCount)
	}

	var caseLink int
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM case_signals
		WHERE case_id = 'case-express-sla-001' AND signal_id = 'signal-express-sla-001'`).Scan(&caseLink); err != nil {
		t.Fatal(err)
	}
	if caseLink != 1 {
		t.Fatalf("expected SLA signal linked to case, got %d", caseLink)
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
	pins := 0
	for _, item := range append(envelope.Data.Sites, envelope.Data.Assets...) {
		if v, _ := item["vertical"].(string); v == expressCargoPack {
			pins++
		}
	}
	if pins < 1 {
		t.Fatalf("expected ≥1 geo pin for %q, got %d", expressCargoPack, pins)
	}

	var finCount int
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM ontology_objects
		WHERE tenant_id = 'tenant-demo' AND object_type IN (
		  'VendorCost','TPCalculation','Invoice','IntercoTransaction',
		  'OBLScorecard','AllocationRun','GovernanceAuditRecord'
		)`).Scan(&finCount); err != nil {
		t.Fatal(err)
	}
	if finCount < 7 {
		t.Fatalf("expected ≥7 financial stub objects, got %d", finCount)
	}

	var attachCount int
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM attachment_links
		WHERE tenant_id = 'tenant-demo' AND resource_id = 'case-express-sla-001' AND role = 'pod_manifest'`).Scan(&attachCount); err != nil {
		t.Fatal(err)
	}
	if attachCount != 1 {
		t.Fatalf("expected POD attachment on SLA case, got %d", attachCount)
	}

	var silentAccount int
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM ontology_objects
		WHERE tenant_id = 'tenant-demo' AND object_type = 'CustomerAccount'
		  AND primary_key_value = 'account-tier-b-silent-001'`).Scan(&silentAccount); err != nil {
		t.Fatal(err)
	}
	if silentAccount != 1 {
		t.Fatalf("expected silent account seed, got %d", silentAccount)
	}
}

func TestExpressCargoCrossTenantGeoEmpty(t *testing.T) {
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
	req.Header.Set("X-Tenant-Id", "tenant-other-nonexistent")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusUnauthorized && resp.StatusCode != http.StatusForbidden {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("unexpected status for unknown tenant: %d %s", resp.StatusCode, string(b))
	}
	if resp.StatusCode == http.StatusOK {
		var envelope struct {
			Data struct {
				Sites  []map[string]any `json:"sites"`
				Assets []map[string]any `json:"assets"`
			} `json:"data"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
			t.Fatal(err)
		}
		for _, item := range append(envelope.Data.Sites, envelope.Data.Assets...) {
			if v, _ := item["vertical"].(string); v == expressCargoPack {
				t.Fatal("cross-tenant geo must not expose express-cargo pins")
			}
		}
	}
}
