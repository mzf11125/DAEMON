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

func startOntologyService(ctx context.Context, t *testing.T, env *testutil.Env) (base string, proc *testutil.ServiceProcess) {
	t.Helper()
	port := testutil.FreeTCPPort(t)
	ontologyRoot := filepath.Join(env.RepoRoot, "ontology", "v2-compiled")
	envVars := []string{
		"DATABASE_URL=" + env.PostgresURL,
		"NEO4J_URI=" + env.Neo4jURI,
		"NEO4J_USER=" + env.Neo4jUser,
		"NEO4J_PASSWORD=" + env.Neo4jPassword,
		"HTTP_PORT=" + port,
		"OIDC_REQUIRED=false",
		"ONTOLOGY_ROOT=" + ontologyRoot,
	}
	envVars = append(envVars, testJWTEnv()...)
	proc = testutil.BuildAndStart(ctx, t, filepath.Join(env.RepoRoot, "services", "ontology-service"), "ontology-service", envVars...)
	base = "http://localhost:" + port
	waitServiceHealth(t, base+"/health", "ontology-service", proc, 90*time.Second)
	return base, proc
}

func TestExpressCargoHITL(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Minute)
	defer cancel()

	env := testutil.SetupDataStores(ctx, t)
	defer env.Cleanup(ctx)
	if err := testutil.RunSeed(ctx, env); err != nil {
		t.Fatal(err)
	}

	ontologyRoot := filepath.Join(env.RepoRoot, "ontology", "v2-compiled")
	if _, err := os.Stat(filepath.Join(ontologyRoot, "action-types", "CreateShipmentDraft.json")); err != nil {
		sync := exec.CommandContext(ctx, "make", "ontology-sync")
		sync.Dir = env.RepoRoot
		if out, err := sync.CombinedOutput(); err != nil {
			t.Fatalf("ontology-sync: %v: %s", err, out)
		}
	}

	base, proc := startOntologyService(ctx, t, env)
	defer stopService(proc)

	params := map[string]any{
		"customerAccountId": "account-tier-a-001",
		"origin":            "Hub Midwest",
		"destination":       "East Coast DC",
		"weight":            840.5,
		"references":        map[string]any{"bastNumber": "BAST-HITL-TEST"},
	}
	body, _ := json.Marshal(params)
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, base+"/v1/actions/CreateShipmentDraft", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	setPlannerAuthT(t, req)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("CreateShipmentDraft: %d %s", resp.StatusCode, string(raw))
	}
	var envelope struct {
		Data struct {
			ShipmentID        string `json:"shipmentId"`
			CommercialOrderID string `json:"commercialOrderId"`
			Status            string `json:"status"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &envelope); err != nil {
		t.Fatal(err)
	}
	shipmentID := envelope.Data.ShipmentID
	if shipmentID == "" || envelope.Data.Status != "draft" {
		t.Fatalf("unexpected draft response: %+v", envelope.Data)
	}

	pool, err := pgxpool.New(ctx, env.PostgresURL)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()

	var shipCount, orderCount int
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM ontology_objects
		WHERE tenant_id = 'tenant-demo' AND object_type = 'Shipment' AND primary_key_value = $1`, shipmentID).Scan(&shipCount); err != nil {
		t.Fatal(err)
	}
	if shipCount != 1 {
		t.Fatalf("expected 1 Shipment row, got %d", shipCount)
	}
	orderID := envelope.Data.CommercialOrderID
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM ontology_objects
		WHERE tenant_id = 'tenant-demo' AND object_type = 'CommercialOrder' AND primary_key_value = $1`, orderID).Scan(&orderCount); err != nil {
		t.Fatal(err)
	}
	if orderCount != 1 {
		t.Fatalf("expected 1 CommercialOrder row, got %d", orderCount)
	}

	var auditDraft int
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM audit_log
		WHERE tenant_id = 'tenant-demo' AND action_type = 'CreateShipmentDraft' AND resource_id = $1`, shipmentID).Scan(&auditDraft); err != nil {
		t.Fatal(err)
	}
	if auditDraft < 1 {
		t.Fatalf("expected audit_log row for CreateShipmentDraft, got %d", auditDraft)
	}

	confirmBody, _ := json.Marshal(map[string]any{"shipmentId": shipmentID, "confirmedBy": "integration-test"})
	req2, _ := http.NewRequestWithContext(ctx, http.MethodPost, base+"/v1/actions/ConfirmShipment", bytes.NewReader(confirmBody))
	req2.Header.Set("Content-Type", "application/json")
	setPlannerAuthT(t, req2)
	resp2, err := http.DefaultClient.Do(req2)
	if err != nil {
		t.Fatal(err)
	}
	defer resp2.Body.Close()
	raw2, _ := io.ReadAll(resp2.Body)
	if resp2.StatusCode != http.StatusOK {
		t.Fatalf("ConfirmShipment: %d %s", resp2.StatusCode, string(raw2))
	}

	var status string
	if err := pool.QueryRow(ctx, `
		SELECT properties->>'status' FROM ontology_objects
		WHERE tenant_id = 'tenant-demo' AND object_type = 'Shipment' AND primary_key_value = $1`, shipmentID).Scan(&status); err != nil {
		t.Fatal(err)
	}
	if status != "confirmed" {
		t.Fatalf("expected status confirmed, got %q", status)
	}
}
