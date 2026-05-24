package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	neo4j "github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func main() {
	ctx := context.Background()
	dsn := getenv("SEED_DATABASE_URL", getenv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54332/postgres?sslmode=disable"))
	chDSN := getenv("CLICKHOUSE_DSN", "clickhouse://daemon:daemon@localhost:9000/daemon")
	neoURI := getenv("NEO4J_URI", "neo4j://localhost:7687")
	neoUser := getenv("NEO4J_USER", "neo4j")
	neoPass := getenv("NEO4J_PASSWORD", "daemonneo4j")

	pg, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer pg.Close()

	chOpts, err := clickhouse.ParseDSN(chDSN)
	if err != nil {
		log.Fatal(err)
	}
	ch, err := clickhouse.Open(chOpts)
	if err != nil {
		log.Fatal(err)
	}
	defer ch.Close()

	skipNeo := getenv("SKIP_NEO4J_SEED", "") == "1" || getenv("SKIP_NEO4J_SEED", "") == "true"
	var driver neo4j.DriverWithContext
	if !skipNeo {
		driver, err = neo4j.NewDriverWithContext(neoURI, neo4j.BasicAuth(neoUser, neoPass, ""))
		if err != nil {
			log.Fatal(err)
		}
		defer driver.Close(ctx)
	}

	now := time.Now().UTC()
	tenant := "tenant-demo"

	_, _ = pg.Exec(ctx, `INSERT INTO tenants (tenant_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`, tenant, "Demo Manufacturing Co")
	demoUserID := getenv("SUPABASE_DEMO_USER_ID", "user-analyst-1")
	_, _ = pg.Exec(ctx, `INSERT INTO users (user_id, tenant_id, email, display_name, roles) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
		demoUserID, tenant, "analyst@demo.local", "Alex Analyst", []string{"analyst", "lead"})

	objects := []struct {
		rid, typ, pk string
		props        map[string]any
	}{
		{"ri.demo.org.001", "Organization", "org-001", map[string]any{"organizationId": "org-001", "name": "Acme Manufacturing", "tenantId": tenant, "status": "active"}},
		{"ri.demo.site.001", "Site", "site-001", map[string]any{"siteId": "site-001", "name": "Plant North", "region": "US-MW"}},
		{"ri.demo.site.002", "Site", "site-002", map[string]any{"siteId": "site-002", "name": "Plant South", "region": "US-SE"}},
		{"ri.demo.asset.001", "Asset", "asset-001", map[string]any{"assetId": "asset-001", "name": "Line A Press", "tenantId": tenant, "status": "running"}},
		{"ri.demo.asset.002", "Asset", "asset-002", map[string]any{"assetId": "asset-002", "name": "Line B Conveyor", "tenantId": tenant, "status": "running"}},
		{"ri.demo.asset.003", "Asset", "asset-003", map[string]any{"assetId": "asset-003", "name": "Cooling Unit 7", "tenantId": tenant, "status": "maintenance"}},
		{"ri.demo.party.001", "Party", "party-001", map[string]any{"partyId": "party-001", "displayName": "Alex Analyst", "email": "analyst@demo.local"}},
		{"ri.demo.obs.001", "Observation", "obs-001", map[string]any{"observationId": "obs-001", "label": "temperature_c", "value": 92.5, "unit": "C", "assetId": "asset-001"}},
		{"ri.demo.signal.001", "Signal", "signal-001", map[string]any{"signalId": "signal-001", "summary": "High temperature on Line A", "severity": "high", "status": "open", "priority": "P1"}},
		{"ri.demo.case.001", "Case", "case-001", map[string]any{"caseId": "case-001", "title": "Investigate Line A temperature", "status": "open", "ownerId": "party-001", "priority": "P1"}},
		{"ri.demo.wo.001", "WorkOrder", "wo-001", map[string]any{"workOrderId": "wo-001", "title": "Inspect Line A press", "status": "open", "assetId": "asset-001"}},
	}

	for _, o := range objects {
		b, _ := json.Marshal(o.props)
		_, err = pg.Exec(ctx, `
			INSERT INTO ontology_objects (object_rid, tenant_id, object_type, primary_key_value, properties, created_at, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$6) ON CONFLICT (object_rid) DO UPDATE SET properties = EXCLUDED.properties, updated_at = EXCLUDED.updated_at`,
			o.rid, tenant, o.typ, o.pk, b, now)
		if err != nil {
			log.Fatal(err)
		}
	}

	_, _ = pg.Exec(ctx, `INSERT INTO cases (case_id, tenant_id, title, status, owner_id, priority, opened_at, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$7) ON CONFLICT DO NOTHING`,
		"case-001", tenant, "Investigate Line A temperature", "open", "party-001", "P1", now)
	_, _ = pg.Exec(ctx, `INSERT INTO case_signals (case_id, signal_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, "case-001", "signal-001")

	links := []struct{ typ, from, to string }{
		{"OrganizationOperatesSite", "org-001", "site-001"},
		{"OrganizationOperatesSite", "org-001", "site-002"},
		{"SiteHostsAsset", "site-001", "asset-001"},
		{"SiteHostsAsset", "site-001", "asset-002"},
		{"SiteHostsAsset", "site-002", "asset-003"},
		{"AssetEmitsObservation", "asset-001", "obs-001"},
		{"ObservationRaisedSignal", "obs-001", "signal-001"},
		{"SignalLinkedToCase", "signal-001", "case-001"},
		{"PartyAssignedToCase", "party-001", "case-001"},
		{"WorkOrderTargetsAsset", "wo-001", "asset-001"},
	}
	if driver != nil {
		sess := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
		defer sess.Close(ctx)
		for _, l := range links {
			_, err = sess.Run(ctx, `
				MERGE (a:Entity {id: $from}) MERGE (b:Entity {id: $to})
				MERGE (a)-[r:LINK {type: $type}]->(b)`,
				map[string]any{"type": l.typ, "from": l.from, "to": l.to})
			if err != nil {
				log.Fatal(err)
			}
		}
	}

	batch, err := ch.PrepareBatch(ctx, `INSERT INTO dataset_observations (observation_id, label, value, unit, observed_at, asset_id, created_at, updated_at)`)
	if err == nil {
		_ = batch.Append("obs-001", "temperature_c", 92.5, "C", now, "asset-001", now, now)
		_ = batch.Send()
	}
	batch, err = ch.PrepareBatch(ctx, `INSERT INTO dataset_signals (signal_id, summary, severity, owner_id, priority, status, opened_at, created_at, updated_at)`)
	if err == nil {
		_ = batch.Append("signal-001", "High temperature on Line A", "high", "", "P1", "open", now, now, now)
		_ = batch.Send()
	}

	seedP3Verticals(ctx, pg, ch, driver, tenant, now)
	seedRemainingSectors(ctx, pg, ch, driver, tenant, now)
	seedSyntheticSectors(ctx, pg, ch, driver, tenant, now)

	fmt.Println("seed completed")
}

func getenv(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
