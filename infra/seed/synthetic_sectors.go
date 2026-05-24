package main

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	neo4j "github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// Sectors not covered by seedP3Verticals or seedRemainingSectors (22-pack sandbox set).
var supplementalSectors = []sectorFixture{
	{packID: "intelligence-ops", siteName: "Collection Cell Alpha", lat: 38.8977, lon: -77.0365, signalSummary: "Correlated activity cluster", caseTitle: "Triage correlated reports"},
	{packID: "finance-risk", siteName: "Trading Desk East", lat: 40.7128, lon: -74.0060, signalSummary: "Limit breach watch", caseTitle: "Review limit exception"},
	{packID: "life-sciences-ops", siteName: "Batch Release Suite 2", lat: 37.4419, lon: -122.1430, signalSummary: "Cold chain excursion", caseTitle: "Quarantine batch review"},
	{packID: "federal-health", siteName: "Federal Facility Region 4", lat: 39.0458, lon: -76.6413, signalSummary: "Facility capacity stress"},
	{packID: "government-finance", siteName: "Appropriations Control Cell", lat: 38.8899, lon: -77.0091, signalSummary: "Obligation timing variance", caseTitle: "Review obligation variance"},
	{packID: "insurance", siteName: "Claims Operations Center", lat: 41.8781, lon: -87.6298, signalSummary: "Catastrophe claim surge", caseTitle: "Surge triage"},
	{packID: "retail-ops", siteName: "Regional DC 18", lat: 33.4484, lon: -112.0740, signalSummary: "Shrink anomaly at DC"},
	{packID: "rail-network", siteName: "Intermodal Yard North", lat: 41.8781, lon: -87.6400, signalSummary: "Consist delay cascade", caseTitle: "Clear consist backlog"},
	{packID: "telecom-ops", siteName: "Cell Site Cluster 9", lat: 37.7749, lon: -122.4194, signalSummary: "Backhaul degradation", caseTitle: "Restore backhaul path"},
	{packID: "construction-ops", siteName: "Site Package Delta", lat: 25.7617, lon: -80.1918, signalSummary: "Safety observation backlog", caseTitle: "Close safety observations"},
	{packID: "mission-tasking", siteName: "Recon Asset Grid 3", lat: 34.0522, lon: -118.2437, signalSummary: "Proximity task queue depth", caseTitle: "Dispatch proximity recon", includeWorkOrder: true},
}

type sectorFixture struct {
	packID           string
	siteName         string
	lat, lon         float64
	signalSummary    string
	caseTitle        string
	includeWorkOrder bool
}

func seedSyntheticSectors(ctx context.Context, pg *pgxpool.Pool, ch clickhouse.Conn, driver neo4j.DriverWithContext, tenant string, now time.Time) {
	for _, s := range supplementalSectors {
		sitePK := fmt.Sprintf("site-%s-001", s.packID)
		signalPK := fmt.Sprintf("signal-%s-001", s.packID)
		casePK := fmt.Sprintf("case-%s-001", s.packID)
		assetPK := fmt.Sprintf("asset-%s-001", s.packID)

		upsertObject(ctx, pg, tenant, now, fmt.Sprintf("ri.demo.site.%s", s.packID), "Site", sitePK, map[string]any{
			"siteId": sitePK, "name": s.siteName, "latitude": s.lat, "longitude": s.lon, "vertical": s.packID,
		})
		upsertObject(ctx, pg, tenant, now, fmt.Sprintf("ri.demo.asset.%s", s.packID), "Asset", assetPK, map[string]any{
			"assetId": assetPK, "name": s.siteName + " primary asset", "status": "online", "vertical": s.packID,
			"latitude": s.lat, "longitude": s.lon,
		})
		upsertObject(ctx, pg, tenant, now, fmt.Sprintf("ri.demo.signal.%s", s.packID), "Signal", signalPK, map[string]any{
			"signalId": signalPK, "summary": s.signalSummary, "severity": "medium", "status": "open", "priority": "P2",
		})
		if s.caseTitle != "" {
			upsertObject(ctx, pg, tenant, now, fmt.Sprintf("ri.demo.case.%s", s.packID), "Case", casePK, map[string]any{
				"caseId": casePK, "title": s.caseTitle, "status": "open", "ownerId": "party-001", "priority": "P2",
			})
			_, _ = pg.Exec(ctx, `INSERT INTO cases (case_id, tenant_id, title, status, owner_id, priority, opened_at, created_at, updated_at)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$7) ON CONFLICT DO NOTHING`,
				casePK, tenant, s.caseTitle, "open", "party-001", "P2", now)
			_, _ = pg.Exec(ctx, `INSERT INTO case_signals (case_id, signal_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, casePK, signalPK)
		}
		if s.includeWorkOrder {
			woPK := fmt.Sprintf("wo-%s-001", s.packID)
			upsertObject(ctx, pg, tenant, now, fmt.Sprintf("ri.demo.wo.%s", s.packID), "WorkOrder", woPK, map[string]any{
				"workOrderId": woPK, "title": "Proximity recon sweep", "status": "open", "assetId": assetPK, "caseId": casePK,
			})
		}
		if driver != nil {
			sess := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
			_, _ = sess.Run(ctx, `MERGE (a:Entity {id: $from}) MERGE (b:Entity {id: $to}) MERGE (a)-[:LINK {type: $type}]->(b)`,
				map[string]any{"type": "SiteHostsAsset", "from": sitePK, "to": assetPK})
			sess.Close(ctx)
		}
		_ = ch
	}
	seedMissionTaskingProximity(ctx, pg, driver, tenant, now)
}

// seedMissionTaskingProximity adds friendly/hostile track assets and a proximity work order (synthetic demo).
func seedMissionTaskingProximity(ctx context.Context, pg *pgxpool.Pool, driver neo4j.DriverWithContext, tenant string, now time.Time) {
	packID := "mission-tasking"
	sitePK := fmt.Sprintf("site-%s-001", packID)
	friendlyPK := "asset-friendly-001"
	hostilePK := "track-hostile-001"

	upsertObject(ctx, pg, tenant, now, "ri.demo.asset.mission.friendly", "Asset", friendlyPK, map[string]any{
		"assetId": friendlyPK, "name": "Friendly recon unit (synthetic)", "affiliation": "friendly",
		"status": "online", "vertical": packID, "latitude": 34.0530, "longitude": -118.2440,
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.asset.mission.hostile", "Asset", hostilePK, map[string]any{
		"assetId": hostilePK, "name": "Hostile track (synthetic)", "affiliation": "hostile",
		"status": "tracked", "vertical": packID, "latitude": 34.0550, "longitude": -118.2460,
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.wo.mission.proximity", "WorkOrder", "wo-proximity-hostile-001", map[string]any{
		"workOrderId": "wo-proximity-hostile-001", "title": "Investigate proximity to hostile track",
		"status": "open", "assetId": hostilePK, "caseId": fmt.Sprintf("case-%s-001", packID),
		"assignedAssetId": friendlyPK,
	})

	if driver != nil {
		sess := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
		for _, link := range []struct{ typ, from, to string }{
			{"SiteHostsAsset", sitePK, friendlyPK},
			{"SiteHostsAsset", sitePK, hostilePK},
			{"WorkOrderTargetsAsset", "wo-proximity-hostile-001", hostilePK},
		} {
			_, _ = sess.Run(ctx, `MERGE (a:Entity {id: $from}) MERGE (b:Entity {id: $to}) MERGE (a)-[:LINK {type: $type}]->(b)`,
				map[string]any{"type": link.typ, "from": link.from, "to": link.to})
		}
		sess.Close(ctx)
	}
}
