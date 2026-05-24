package main

import (
	"context"
	"encoding/json"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	neo4j "github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func seedP3Verticals(ctx context.Context, pg *pgxpool.Pool, ch clickhouse.Conn, driver neo4j.DriverWithContext, tenant string, now time.Time) {
	upsertObject(ctx, pg, tenant, now, "ri.demo.settings.demo", "TenantSettings", "settings-demo", map[string]any{
		"tenantId": tenant,
	})
	_, _ = pg.Exec(ctx, `INSERT INTO tenant_settings (tenant_id, features, updated_at)
		VALUES ($1, $2, $3) ON CONFLICT (tenant_id) DO UPDATE SET features = EXCLUDED.features, updated_at = EXCLUDED.updated_at`,
		tenant, mustJSON(map[string]any{
			"geoMapEnabled":       true,
			"attachmentsEnabled":  true,
			"healthcareCockpit":   true,
			"agentListenMode":     false,
		}), now)

	// Traffic engineering — intersection sites with geo coordinates.
	trafficObjects := []struct {
		rid, typ, pk string
		props        map[string]any
	}{
		{"ri.demo.site.traffic.001", "Site", "site-traffic-001", map[string]any{
			"siteId": "site-traffic-001", "name": "Main St & 1st Ave", "region": "US-MW",
			"latitude": 41.8781, "longitude": -87.6298, "vertical": "traffic-engineering",
		}},
		{"ri.demo.site.traffic.002", "Site", "site-traffic-002", map[string]any{
			"siteId": "site-traffic-002", "name": "Loop District B", "region": "US-MW",
			"latitude": 41.8819, "longitude": -87.6278, "vertical": "traffic-engineering",
		}},
		{"ri.demo.asset.loop.001", "Asset", "asset-loop-001", map[string]any{
			"assetId": "asset-loop-001", "name": "NB loop detector A", "status": "online", "assetType": "loop_detector",
		}},
		{"ri.demo.asset.loop.002", "Asset", "asset-loop-002", map[string]any{
			"assetId": "asset-loop-002", "name": "SB loop detector B", "status": "online", "assetType": "loop_detector",
		}},
		{"ri.demo.obs.traffic.001", "Observation", "obs-traffic-001", map[string]any{
			"observationId": "obs-traffic-001", "label": "vehicle_count_15m", "value": 512.0, "unit": "vehicles", "assetId": "asset-loop-001",
		}},
		{"ri.demo.signal.traffic.001", "Signal", "signal-traffic-001", map[string]any{
			"signalId": "signal-traffic-001", "summary": "Congestion spike NB loop A", "severity": "high", "status": "open", "priority": "P2",
		}},
		{"ri.demo.case.traffic.001", "Case", "case-traffic-001", map[string]any{
			"caseId": "case-traffic-001", "title": "Retime Main & 1st intersection", "status": "open", "ownerId": "party-001", "priority": "P2",
		}},
		{"ri.demo.wo.traffic.001", "WorkOrder", "wo-traffic-001", map[string]any{
			"workOrderId": "wo-traffic-001", "title": "Verify loop calibration NB", "status": "open", "assetId": "asset-loop-001", "caseId": "case-traffic-001",
		}},
	}
	for _, o := range trafficObjects {
		upsertObject(ctx, pg, tenant, now, o.rid, o.typ, o.pk, o.props)
	}
	_, _ = pg.Exec(ctx, `INSERT INTO cases (case_id, tenant_id, title, status, owner_id, priority, opened_at, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$7) ON CONFLICT DO NOTHING`,
		"case-traffic-001", tenant, "Retime Main & 1st intersection", "open", "party-001", "P2", now)
	_, _ = pg.Exec(ctx, `INSERT INTO case_signals (case_id, signal_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, "case-traffic-001", "signal-traffic-001")

	// Healthcare ops — encounter/lab signal (no PHI).
	healthcare := []struct {
		rid, typ, pk string
		props        map[string]any
	}{
		{"ri.demo.site.hosp.001", "Site", "site-hosp-001", map[string]any{
			"siteId": "site-hosp-001", "name": "North Campus ED", "latitude": 42.3601, "longitude": -71.0589, "vertical": "healthcare-ops",
		}},
		{"ri.demo.obs.health.001", "Observation", "obs-health-001", map[string]any{
			"observationId": "obs-health-001", "label": "ed_boarding_hours", "value": 3.2, "unit": "hours", "assetId": "site-hosp-001",
		}},
		{"ri.demo.signal.health.001", "Signal", "signal-health-001", map[string]any{
			"signalId": "signal-health-001", "summary": "Critical lab value flagged (aggregate)", "severity": "high", "status": "open", "priority": "P1",
		}},
		{"ri.demo.case.health.001", "Case", "case-health-001", map[string]any{
			"caseId": "case-health-001", "title": "Review critical lab escalation", "status": "open", "ownerId": "party-001",
		}},
	}
	for _, o := range healthcare {
		upsertObject(ctx, pg, tenant, now, o.rid, o.typ, o.pk, o.props)
	}
	_, _ = pg.Exec(ctx, `INSERT INTO cases (case_id, tenant_id, title, status, owner_id, priority, opened_at, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$7) ON CONFLICT DO NOTHING`,
		"case-health-001", tenant, "Review critical lab escalation", "open", "party-001", "P1", now)

	// Logistics NVOCC — port hub.
	logistics := []struct {
		rid, typ, pk string
		props        map[string]any
	}{
		{"ri.demo.site.port.001", "Site", "site-port-001", map[string]any{
			"siteId": "site-port-001", "name": "Container Terminal 7", "latitude": 33.7405, "longitude": -118.2711, "vertical": "logistics-nvocc",
		}},
		{"ri.demo.asset.vessel.001", "Asset", "asset-vessel-001", map[string]any{
			"assetId": "asset-vessel-001", "name": "MV Demo Carrier", "status": "in_transit", "mmsi": "636019825",
			"latitude": 33.7405, "longitude": -118.2711,
		}},
		{"ri.demo.signal.logistics.001", "Signal", "signal-logistics-001", map[string]any{
			"signalId": "signal-logistics-001", "summary": "Container dwell exceeded threshold", "severity": "medium", "status": "open",
		}},
	}
	for _, o := range logistics {
		upsertObject(ctx, pg, tenant, now, o.rid, o.typ, o.pk, o.props)
	}

	// Humanitarian hub — WFP-style disruption.
	humanitarian := []struct {
		rid, typ, pk string
		props        map[string]any
	}{
		{"ri.demo.site.hub.001", "Site", "site-hub-001", map[string]any{
			"siteId": "site-hub-001", "name": "Regional Supply Hub Alpha", "latitude": 12.0022, "longitude": 8.5919, "vertical": "humanitarian-logistics",
		}},
		{"ri.demo.signal.human.001", "Signal", "signal-human-001", map[string]any{
			"signalId": "signal-human-001", "summary": "Convoy delay — route insecurity index elevated", "severity": "high", "status": "open",
		}},
		{"ri.demo.case.human.001", "Case", "case-human-001", map[string]any{
			"caseId": "case-human-001", "title": "Reroute convoy to Hub Alpha", "status": "open", "ownerId": "party-001",
		}},
	}
	for _, o := range humanitarian {
		upsertObject(ctx, pg, tenant, now, o.rid, o.typ, o.pk, o.props)
	}
	_, _ = pg.Exec(ctx, `INSERT INTO cases (case_id, tenant_id, title, status, owner_id, priority, opened_at, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$7) ON CONFLICT DO NOTHING`,
		"case-human-001", tenant, "Reroute convoy to Hub Alpha", "open", "party-001", "P2", now)

	// Public health surveillance — aggregate counts only.
	publicHealth := []struct {
		rid, typ, pk string
		props        map[string]any
	}{
		{"ri.demo.site.phs.001", "Site", "site-phs-001", map[string]any{
			"siteId": "site-phs-001", "name": "Metro Surveillance District 3", "latitude": 38.9072, "longitude": -77.0369, "vertical": "public-health",
		}},
		{"ri.demo.obs.phs.001", "Observation", "obs-phs-001", map[string]any{
			"observationId": "obs-phs-001", "label": "reported_cases_7d", "value": 47.0, "unit": "count", "assetId": "site-phs-001",
		}},
		{"ri.demo.signal.phs.001", "Signal", "signal-phs-001", map[string]any{
			"signalId": "signal-phs-001", "summary": "Syndromic count above seasonal baseline", "severity": "medium", "status": "open",
		}},
	}
	for _, o := range publicHealth {
		upsertObject(ctx, pg, tenant, now, o.rid, o.typ, o.pk, o.props)
	}

	// Enrich manufacturing sites with geo for default demo map.
	_, _ = pg.Exec(ctx, `UPDATE ontology_objects SET properties = properties || $1::jsonb, updated_at = $2
		WHERE tenant_id = $3 AND object_type = 'Site' AND primary_key_value = 'site-001'`,
		`{"latitude":41.5868,"longitude":-93.6250}`, now, tenant)
	_, _ = pg.Exec(ctx, `UPDATE ontology_objects SET properties = properties || $1::jsonb, updated_at = $2
		WHERE tenant_id = $3 AND object_type = 'Site' AND primary_key_value = 'site-002'`,
		`{"latitude":33.7490,"longitude":-84.3880}`, now, tenant)
	_, _ = pg.Exec(ctx, `UPDATE ontology_objects SET properties = properties || $1::jsonb, updated_at = $2
		WHERE tenant_id = $3 AND object_type = 'Site' AND primary_key_value IN ('site-001','site-002')`,
		`{"vertical":"manufacturing-ops"}`, now, tenant)

	p3Links := []struct{ typ, from, to string }{
		{"SiteHostsAsset", "site-traffic-001", "asset-loop-001"},
		{"SiteHostsAsset", "site-traffic-002", "asset-loop-002"},
		{"AssetEmitsObservation", "asset-loop-001", "obs-traffic-001"},
		{"ObservationRaisedSignal", "obs-traffic-001", "signal-traffic-001"},
		{"SignalLinkedToCase", "signal-traffic-001", "case-traffic-001"},
		{"WorkOrderTargetsAsset", "wo-traffic-001", "asset-loop-001"},
		{"CaseLinkedToWorkOrder", "case-traffic-001", "wo-traffic-001"},
		{"SiteHostsAsset", "site-port-001", "asset-vessel-001"},
		{"SignalLinkedToCase", "signal-human-001", "case-human-001"},
	}
	if driver != nil {
		sess := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
		defer sess.Close(ctx)
		for _, l := range p3Links {
			_, _ = sess.Run(ctx, `MERGE (a:Entity {id: $from}) MERGE (b:Entity {id: $to}) MERGE (a)-[:LINK {type: $type}]->(b)`,
				map[string]any{"type": l.typ, "from": l.from, "to": l.to})
		}
	}

	if ch != nil {
		batch, err := ch.PrepareBatch(ctx, `INSERT INTO dataset_observations (observation_id, label, value, unit, observed_at, asset_id, created_at, updated_at)`)
		if err == nil {
			_ = batch.Append("obs-traffic-001", "vehicle_count_15m", 512.0, "vehicles", now, "asset-loop-001", now, now)
			_ = batch.Append("obs-phs-001", "reported_cases_7d", 47.0, "count", now, "site-phs-001", now, now)
			_ = batch.Send()
		}
		batch, err = ch.PrepareBatch(ctx, `INSERT INTO dataset_signals (signal_id, summary, severity, owner_id, priority, status, opened_at, created_at, updated_at)`)
		if err == nil {
			_ = batch.Append("signal-traffic-001", "Congestion spike NB loop A", "high", "", "P2", "open", now, now, now)
			_ = batch.Send()
		}
	}
}

func upsertObject(ctx context.Context, pg *pgxpool.Pool, tenant string, now time.Time, rid, typ, pk string, props map[string]any) {
	b, _ := json.Marshal(props)
	_, _ = pg.Exec(ctx, `
		INSERT INTO ontology_objects (object_rid, tenant_id, object_type, primary_key_value, properties, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$6) ON CONFLICT (object_rid) DO UPDATE SET properties = EXCLUDED.properties, updated_at = EXCLUDED.updated_at`,
		rid, tenant, typ, pk, b, now)
}

func mustJSON(v any) []byte {
	b, _ := json.Marshal(v)
	return b
}

// seedRemainingSectors fills synthetic data for all 12 sector packs
// that currently lack sandbox datasets. Each sector gets at least:
// one Site (with lat/lng), one Asset or equivalent entity, one Observation/Signal,
// and a Case when the scenario warrants human-in-the-loop review.
func seedRemainingSectors(ctx context.Context, pg *pgxpool.Pool, ch clickhouse.Conn, driver neo4j.DriverWithContext, tenant string, now time.Time) {
	// ============================================================
	// 1. agriculture — crop/weather/supply chain observations
	// ============================================================
	agriculture := []seedObj{
		{RID: "ri.demo.site.agri.001", Type: "Site", Key: "site-agri-001", Props: map[string]any{
			"siteId": "site-agri-001", "name": "Central Valley Farm HQ", "latitude": 36.6777, "longitude": -120.4020, "vertical": "agriculture",
		}},
		{RID: "ri.demo.asset.agri.001", Type: "Asset", Key: "asset-agri-001", Props: map[string]any{
			"assetId": "asset-agri-001", "name": "Irrigation System Sector A", "status": "online", "assetType": "irrigation",
		}},
		{RID: "ri.demo.obs.agri.001", Type: "Observation", Key: "obs-agri-001", Props: map[string]any{
			"observationId": "obs-agri-001", "label": "soil_moisture_pct", "value": 23.4, "unit": "pct", "assetId": "asset-agri-001",
		}},
		{RID: "ri.demo.signal.agri.001", Type: "Signal", Key: "signal-agri-001", Props: map[string]any{
			"signalId": "signal-agri-001", "summary": "Soil moisture below crop threshold (corn)", "severity": "high", "status": "open", "priority": "P2",
		}},
	}
	upsertAndLink(ctx, pg, driver, ch, tenant, now, agriculture, []seedLink{
		{"SiteHostsAsset", "site-agri-001", "asset-agri-001"},
		{"AssetEmitsObservation", "asset-agri-001", "obs-agri-001"},
		{"ObservationRaisedSignal", "obs-agri-001", "signal-agri-001"},
	})

	// Agri-food (distinct from agriculture — food chain)
	agriFood := []seedObj{
		{RID: "ri.demo.site.agrifood.001", Type: "Site", Key: "site-agrifood-001", Props: map[string]any{
			"siteId": "site-agrifood-001", "name": "Midwest Processing Plant", "latitude": 41.2600, "longitude": -95.9400, "vertical": "agri-food",
		}},
		{RID: "ri.demo.asset.agrifood.001", Type: "Asset", Key: "asset-agrifood-001", Props: map[string]any{
			"assetId": "asset-agrifood-001", "name": "Cold Storage Unit B-3", "status": "running", "assetType": "cold_storage",
		}},
		{RID: "ri.demo.obs.agrifood.001", Type: "Observation", Key: "obs-agrifood-001", Props: map[string]any{
			"observationId": "obs-agrifood-001", "label": "internal_temp_c", "value": -15.2, "unit": "C", "assetId": "asset-agrifood-001",
		}},
		{RID: "ri.demo.signal.agrifood.001", Type: "Signal", Key: "signal-agrifood-001", Props: map[string]any{
			"signalId": "signal-agrifood-001", "summary": "Cold storage temperature fluctuation", "severity": "medium", "status": "open", "priority": "P3",
		}},
	}
	upsertAndLink(ctx, pg, driver, ch, tenant, now, agriFood, []seedLink{
		{"SiteHostsAsset", "site-agrifood-001", "asset-agrifood-001"},
		{"AssetEmitsObservation", "asset-agrifood-001", "obs-agrifood-001"},
		{"ObservationRaisedSignal", "obs-agrifood-001", "signal-agrifood-001"},
	})

	// ============================================================
	// 2. energy-utilities — grid, outage, asset health
	// ============================================================
	energy := []seedObj{
		{RID: "ri.demo.site.energy.001", Type: "Site", Key: "site-energy-001", Props: map[string]any{
			"siteId": "site-energy-001", "name": "Southwest Substation 12", "latitude": 33.4484, "longitude": -112.0740, "vertical": "energy-utilities",
		}},
		{RID: "ri.demo.asset.energy.001", Type: "Asset", Key: "asset-energy-001", Props: map[string]any{
			"assetId": "asset-energy-001", "name": "Transformer T12-A", "status": "online", "assetType": "transformer",
		}},
		{RID: "ri.demo.asset.energy.002", Type: "Asset", Key: "asset-energy-002", Props: map[string]any{
			"assetId": "asset-energy-002", "name": "Transmission Line Segment L-47", "status": "degraded", "assetType": "transmission_line",
		}},
		{RID: "ri.demo.obs.energy.001", Type: "Observation", Key: "obs-energy-001", Props: map[string]any{
			"observationId": "obs-energy-001", "label": "transformer_oil_temp_c", "value": 82.3, "unit": "C", "assetId": "asset-energy-001",
		}},
		{RID: "ri.demo.obs.energy.002", Type: "Observation", Key: "obs-energy-002", Props: map[string]any{
			"observationId": "obs-energy-002", "label": "line_impedance_ohm", "value": 4.7, "unit": "ohm", "assetId": "asset-energy-002",
		}},
		{RID: "ri.demo.signal.energy.001", Type: "Signal", Key: "signal-energy-001", Props: map[string]any{
			"signalId": "signal-energy-001", "summary": "Transformer oil temp above nominal range", "severity": "high", "status": "open", "priority": "P1",
		}},
		{RID: "ri.demo.case.energy.001", Type: "Case", Key: "case-energy-001", Props: map[string]any{
			"caseId": "case-energy-001", "title": "Inspect substation T12-A transformer", "status": "open", "priority": "P1",
		}},
		{RID: "ri.demo.wo.energy.001", Type: "WorkOrder", Key: "wo-energy-001", Props: map[string]any{
			"workOrderId": "wo-energy-001", "title": "Transformer oil analysis + inspection", "status": "open", "assetId": "asset-energy-001",
		}},
	}
	upsertAndLink(ctx, pg, driver, ch, tenant, now, energy, []seedLink{
		{"SiteHostsAsset", "site-energy-001", "asset-energy-001"},
		{"SiteHostsAsset", "site-energy-001", "asset-energy-002"},
		{"AssetEmitsObservation", "asset-energy-001", "obs-energy-001"},
		{"AssetEmitsObservation", "asset-energy-002", "obs-energy-002"},
		{"ObservationRaisedSignal", "obs-energy-001", "signal-energy-001"},
		{"SignalLinkedToCase", "signal-energy-001", "case-energy-001"},
		{"WorkOrderTargetsAsset", "wo-energy-001", "asset-energy-001"},
	})
	upsertCase(ctx, pg, tenant, now, "case-energy-001", "Inspect substation T12-A transformer", "open", "P1", []string{"signal-energy-001"})
	upsertCHObs(ctx, ch, now, "obs-energy-001", "transformer_oil_temp_c", 82.3, "C", "asset-energy-001")
	upsertCHObs(ctx, ch, now, "obs-energy-002", "line_impedance_ohm", 4.7, "ohm", "asset-energy-002")
	upsertCHSignal(ctx, ch, now, "signal-energy-001", "Transformer oil temp above nominal range", "high", "P1")

	// ============================================================
	// 3. healthcare (placeholder) — clinical ops without PHI
	// ============================================================
	healthcareLight := []seedObj{
		{RID: "ri.demo.site.hc.001", Type: "Site", Key: "site-hc-001", Props: map[string]any{
			"siteId": "site-hc-001", "name": "Community Clinic Downtown", "latitude": 40.7128, "longitude": -74.0060, "vertical": "healthcare",
		}},
		{RID: "ri.demo.asset.hc.001", Type: "Asset", Key: "asset-hc-001", Props: map[string]any{
			"assetId": "asset-hc-001", "name": "MRI Scanner Bay 2", "status": "maintenance", "assetType": "mri_scanner",
		}},
		{RID: "ri.demo.obs.hc.001", Type: "Observation", Key: "obs-hc-001", Props: map[string]any{
			"observationId": "obs-hc-001", "label": "wait_time_minutes", "value": 48.0, "unit": "min", "assetId": "asset-hc-001",
		}},
		{RID: "ri.demo.signal.hc.001", Type: "Signal", Key: "signal-hc-001", Props: map[string]any{
			"signalId": "signal-hc-001", "summary": "Wait time above service target (30 min)", "severity": "medium", "status": "open", "priority": "P3",
		}},
	}
	upsertAndLink(ctx, pg, driver, ch, tenant, now, healthcareLight, []seedLink{
		{"SiteHostsAsset", "site-hc-001", "asset-hc-001"},
		{"AssetEmitsObservation", "asset-hc-001", "obs-hc-001"},
		{"ObservationRaisedSignal", "obs-hc-001", "signal-hc-001"},
	})

	// ============================================================
	// 4. logistics (placeholder) — shipment delay, route exceptions
	// ============================================================
	logisticsLight := []seedObj{
		{RID: "ri.demo.site.logi.001", Type: "Site", Key: "site-logi-001", Props: map[string]any{
			"siteId": "site-logi-001", "name": "Memphis Distribution Center", "latitude": 35.1495, "longitude": -90.0490, "vertical": "logistics",
		}},
		{RID: "ri.demo.asset.logi.001", Type: "Asset", Key: "asset-logi-001", Props: map[string]any{
			"assetId": "asset-logi-001", "name": "Truck Fleet T-01", "status": "en_route", "assetType": "fleet_vehicle",
		}},
		{RID: "ri.demo.obs.logi.001", Type: "Observation", Key: "obs-logi-001", Props: map[string]any{
			"observationId": "obs-logi-001", "label": "eta_deviation_hrs", "value": 3.5, "unit": "hours", "assetId": "asset-logi-001",
		}},
		{RID: "ri.demo.signal.logi.001", Type: "Signal", Key: "signal-logi-001", Props: map[string]any{
			"signalId": "signal-logi-001", "summary": "Truck T-01 ETA deviation +3.5hrs — weather delay", "severity": "medium", "status": "open", "priority": "P3",
		}},
	}
	upsertAndLink(ctx, pg, driver, ch, tenant, now, logisticsLight, []seedLink{
		{"SiteHostsAsset", "site-logi-001", "asset-logi-001"},
		{"AssetEmitsObservation", "asset-logi-001", "obs-logi-001"},
		{"ObservationRaisedSignal", "obs-logi-001", "signal-logi-001"},
	})

	// ============================================================
	// 5. public-sector — citizen service and program delivery
	// ============================================================
	publicSector := []seedObj{
		{RID: "ri.demo.site.pub.001", Type: "Site", Key: "site-pub-001", Props: map[string]any{
			"siteId": "site-pub-001", "name": "District Service Center East", "latitude": 38.8951, "longitude": -76.9434, "vertical": "public-sector",
		}},
		{RID: "ri.demo.obs.pub.001", Type: "Observation", Key: "obs-pub-001", Props: map[string]any{
			"observationId": "obs-pub-001", "label": "applications_backlog", "value": 127.0, "unit": "count", "assetId": "site-pub-001",
		}},
		{RID: "ri.demo.signal.pub.001", Type: "Signal", Key: "signal-pub-001", Props: map[string]any{
			"signalId": "signal-pub-001", "summary": "Benefit application backlog exceeding SLA target", "severity": "medium", "status": "open", "priority": "P3",
		}},
		{RID: "ri.demo.case.pub.001", Type: "Case", Key: "case-pub-001", Props: map[string]any{
			"caseId": "case-pub-001", "title": "Address application backlog at Service Center East", "status": "open", "priority": "P3",
		}},
	}
	upsertAndLink(ctx, pg, driver, ch, tenant, now, publicSector, []seedLink{
		{"ObservationRaisedSignal", "obs-pub-001", "signal-pub-001"},
		{"SignalLinkedToCase", "signal-pub-001", "case-pub-001"},
	})
	upsertCase(ctx, pg, tenant, now, "case-pub-001", "Address application backlog at Service Center East", "open", "P3", []string{"signal-pub-001"})

	// ============================================================
	// 6. web3-operations — on-chain risk + treasury ops overlay
	// ============================================================
	web3Ops := []seedObj{
		{RID: "ri.demo.site.web3.001", Type: "Site", Key: "site-web3-001", Props: map[string]any{
			"siteId": "site-web3-001", "name": "Solana Validator Node sv-01", "latitude": 1.3521, "longitude": 103.8198, "vertical": "web3-operations",
		}},
		{RID: "ri.demo.asset.web3.001", Type: "Asset", Key: "asset-web3-001", Props: map[string]any{
			"assetId": "asset-web3-001", "name": "Treasury Multisig 3/5", "status": "online", "assetType": "multisig_wallet",
		}},
		{RID: "ri.demo.obs.web3.001", Type: "Observation", Key: "obs-web3-001", Props: map[string]any{
			"observationId": "obs-web3-001", "label": "validators_staked_sol", "value": 125000.0, "unit": "SOL", "assetId": "asset-web3-001",
		}},
		{RID: "ri.demo.obs.web3.002", Type: "Observation", Key: "obs-web3-002", Props: map[string]any{
			"observationId": "obs-web3-002", "label": "liquidity_usdc", "value": 475000.0, "unit": "USDC", "assetId": "asset-web3-001",
		}},
		{RID: "ri.demo.signal.web3.001", Type: "Signal", Key: "signal-web3-001", Props: map[string]any{
			"signalId": "signal-web3-001", "summary": "Treasury multisig signer rotation pending (quorum 4/5 required)", "severity": "high", "status": "open", "priority": "P1",
		}},
		{RID: "ri.demo.case.web3.001", Type: "Case", Key: "case-web3-001", Props: map[string]any{
			"caseId": "case-web3-001", "title": "Execute treasury multisig signer rotation", "status": "open", "priority": "P1",
		}},
	}
	upsertAndLink(ctx, pg, driver, ch, tenant, now, web3Ops, []seedLink{
		{"SiteHostsAsset", "site-web3-001", "asset-web3-001"},
		{"AssetEmitsObservation", "asset-web3-001", "obs-web3-001"},
		{"AssetEmitsObservation", "asset-web3-001", "obs-web3-002"},
		{"ObservationRaisedSignal", "obs-web3-001", "signal-web3-001"},
		{"SignalLinkedToCase", "signal-web3-001", "case-web3-001"},
	})
	upsertCase(ctx, pg, tenant, now, "case-web3-001", "Execute treasury multisig signer rotation", "open", "P1", []string{"signal-web3-001"})

	// ============================================================
	// 7. web3-intel — Dune/Sim + Solana RPC intelligence
	// ============================================================
	web3Intel := []seedObj{
		{RID: "ri.demo.site.web3i.001", Type: "Site", Key: "site-web3i-001", Props: map[string]any{
			"siteId": "site-web3i-001", "name": "On-chain Intel Ops Center", "latitude": 37.3861, "longitude": -122.0839, "vertical": "web3-intel",
		}},
		{RID: "ri.demo.obs.web3i.001", Type: "Observation", Key: "obs-web3i-001", Props: map[string]any{
			"observationId": "obs-web3i-001", "label": "suspicious_tx_volume_24h", "value": 12.0, "unit": "count", "assetId": "asset-web3-001",
		}},
		{RID: "ri.demo.signal.web3i.001", Type: "Signal", Key: "signal-web3i-001", Props: map[string]any{
			"signalId": "signal-web3i-001", "summary": "Elevated DEX volume to unknown contract (possible front-run)", "severity": "medium", "status": "open", "priority": "P2",
		}},
	}
	upsertAndLink(ctx, pg, driver, ch, tenant, now, web3Intel, []seedLink{
		{"AssetEmitsObservation", "asset-web3-001", "obs-web3i-001"},
		{"ObservationRaisedSignal", "obs-web3i-001", "signal-web3i-001"},
	})

	// ============================================================
	// 8. banking-core — core banking + payments
	// ============================================================
	banking := []seedObj{
		{RID: "ri.demo.site.bank.001", Type: "Site", Key: "site-bank-001", Props: map[string]any{
			"siteId": "site-bank-001", "name": "Settlement Operations Hub", "latitude": 51.5074, "longitude": -0.1278, "vertical": "banking-core",
		}},
		{RID: "ri.demo.obs.bank.001", Type: "Observation", Key: "obs-bank-001", Props: map[string]any{
			"observationId": "obs-bank-001", "label": "pending_settlement_count", "value": 340.0, "unit": "count", "assetId": "site-bank-001",
		}},
		{RID: "ri.demo.obs.bank.002", Type: "Observation", Key: "obs-bank-002", Props: map[string]any{
			"observationId": "obs-bank-002", "label": "failed_payment_count_1h", "value": 17.0, "unit": "count", "assetId": "site-bank-001",
		}},
		{RID: "ri.demo.signal.bank.001", Type: "Signal", Key: "signal-bank-001", Props: map[string]any{
			"signalId": "signal-bank-001", "summary": "Payment failure rate spiked 3x above baseline", "severity": "high", "status": "open", "priority": "P1",
		}},
		{RID: "ri.demo.case.bank.001", Type: "Case", Key: "case-bank-001", Props: map[string]any{
			"caseId": "case-bank-001", "title": "Investigate payment gateway failure spike", "status": "open", "priority": "P1",
		}},
	}
	upsertAndLink(ctx, pg, driver, ch, tenant, now, banking, []seedLink{
		{"ObservationRaisedSignal", "obs-bank-002", "signal-bank-001"},
		{"SignalLinkedToCase", "signal-bank-001", "case-bank-001"},
	})
	upsertCase(ctx, pg, tenant, now, "case-bank-001", "Investigate payment gateway failure spike", "open", "P1", []string{"signal-bank-001"})

	// ============================================================
	// 9. finance-ledger — GL + subledger reconciliation
	// ============================================================
	finance := []seedObj{
		{RID: "ri.demo.site.fin.001", Type: "Site", Key: "site-fin-001", Props: map[string]any{
			"siteId": "site-fin-001", "name": "Regional Finance Office", "latitude": 25.2048, "longitude": 55.2708, "vertical": "finance-ledger",
		}},
		{RID: "ri.demo.obs.fin.001", Type: "Observation", Key: "obs-fin-001", Props: map[string]any{
			"observationId": "obs-fin-001", "label": "gl_imbalance_amount", "value": 2450.50, "unit": "USD", "assetId": "site-fin-001",
		}},
		{RID: "ri.demo.signal.fin.001", Type: "Signal", Key: "signal-fin-001", Props: map[string]any{
			"signalId": "signal-fin-001", "summary": "GL-to-subledger imbalance: $2,450.50 (accounts payable)", "severity": "high", "status": "open", "priority": "P2",
		}},
		{RID: "ri.demo.case.fin.001", Type: "Case", Key: "case-fin-001", Props: map[string]any{
			"caseId": "case-fin-001", "title": "Reconcile AP subledger imbalance", "status": "open", "priority": "P2",
		}},
	}
	upsertAndLink(ctx, pg, driver, ch, tenant, now, finance, []seedLink{
		{"ObservationRaisedSignal", "obs-fin-001", "signal-fin-001"},
		{"SignalLinkedToCase", "signal-fin-001", "case-fin-001"},
	})
	upsertCase(ctx, pg, tenant, now, "case-fin-001", "Reconcile AP subledger imbalance", "open", "P2", []string{"signal-fin-001"})

	// ============================================================
	// 10. government-ops — case management + open data
	// ============================================================
	govOps := []seedObj{
		{RID: "ri.demo.site.gov.001", Type: "Site", Key: "site-gov-001", Props: map[string]any{
			"siteId": "site-gov-001", "name": "Municipal Permit Office", "latitude": 37.7749, "longitude": -122.4194, "vertical": "government-ops",
		}},
		{RID: "ri.demo.obs.gov.001", Type: "Observation", Key: "obs-gov-001", Props: map[string]any{
			"observationId": "obs-gov-001", "label": "open_permit_applications", "value": 85.0, "unit": "count", "assetId": "site-gov-001",
		}},
		{RID: "ri.demo.obs.gov.002", Type: "Observation", Key: "obs-gov-002", Props: map[string]any{
			"observationId": "obs-gov-002", "label": "avg_processing_days", "value": 14.2, "unit": "days", "assetId": "site-gov-001",
		}},
		{RID: "ri.demo.signal.gov.001", Type: "Signal", Key: "signal-gov-001", Props: map[string]any{
			"signalId": "signal-gov-001", "summary": "Permit processing SLA breach (target 10 business days)", "severity": "medium", "status": "open", "priority": "P3",
		}},
	}
	upsertAndLink(ctx, pg, driver, ch, tenant, now, govOps, []seedLink{
		{"ObservationRaisedSignal", "obs-gov-002", "signal-gov-001"},
	})

	// ============================================================
	// 11. aml-fintech — Customer → Account → Transaction chain
	// ============================================================
	amlFintech := []seedObj{
		{RID: "ri.demo.site.aml.001", Type: "Site", Key: "site-aml-001", Props: map[string]any{
			"siteId": "site-aml-001", "name": "AML Compliance Operations Center", "latitude": 1.2897, "longitude": 103.8501, "vertical": "aml-fintech",
		}},
		{RID: "ri.demo.cust.001", Type: "Customer", Key: "cust-001", Props: map[string]any{
			"customerId": "cust-001", "legalName": "Acme Trading Ltd", "riskTier": "medium", "jurisdiction": "SG",
		}},
		{RID: "ri.demo.cust.002", Type: "Customer", Key: "cust-002", Props: map[string]any{
			"customerId": "cust-002", "legalName": "Global Payments Inc", "riskTier": "low", "jurisdiction": "UK",
		}},
		{RID: "ri.demo.cust.003", Type: "Customer", Key: "cust-003", Props: map[string]any{
			"customerId": "cust-003", "legalName": "Prestige Holdings LLC", "riskTier": "high", "jurisdiction": "AE",
		}},
		{RID: "ri.demo.acct.001", Type: "Account", Key: "acct-001", Props: map[string]any{
			"accountId": "acct-001", "customerId": "cust-001", "currency": "USD", "accountType": "operating",
		}},
		{RID: "ri.demo.acct.002", Type: "Account", Key: "acct-002", Props: map[string]any{
			"accountId": "acct-002", "customerId": "cust-002", "currency": "EUR", "accountType": "settlement",
		}},
		{RID: "ri.demo.acct.003", Type: "Account", Key: "acct-003", Props: map[string]any{
			"accountId": "acct-003", "customerId": "cust-003", "currency": "USD", "accountType": "operating",
		}},
		{RID: "ri.demo.txn.001", Type: "Transaction", Key: "txn-001", Props: map[string]any{
			"transactionId": "txn-001", "accountId": "acct-003", "amount": 25000.0, "currency": "USD", "direction": "outbound",
		}},
		{RID: "ri.demo.txn.002", Type: "Transaction", Key: "txn-002", Props: map[string]any{
			"transactionId": "txn-002", "accountId": "acct-003", "amount": 18000.0, "currency": "USD", "direction": "outbound",
		}},
		{RID: "ri.demo.signal.aml.001", Type: "Signal", Key: "signal-aml-001", Props: map[string]any{
			"signalId": "signal-aml-001", "summary": "Suspicious transaction pattern: 2x high-value outbound under reporting threshold", "severity": "high", "status": "open", "priority": "P1",
		}},
		{RID: "ri.demo.case.aml.001", Type: "Case", Key: "case-aml-001", Props: map[string]any{
			"caseId": "case-aml-001", "title": "Review high-risk transaction pattern — Prestige Holdings", "status": "open", "priority": "P1",
		}},
	}
	upsertAndLink(ctx, pg, driver, ch, tenant, now, amlFintech, []seedLink{
		{"SignalLinkedToCase", "signal-aml-001", "case-aml-001"},
	})
	upsertCase(ctx, pg, tenant, now, "case-aml-001", "Review high-risk transaction pattern — Prestige Holdings", "open", "P1", []string{"signal-aml-001"})

	// ============================================================
	// Geo enrichment — add lat/lng to all sites created above
	// ============================================================
	geoPatches := map[string][2]float64{
		"site-agri-001":     {36.6777, -120.4020},
		"site-agrifood-001": {41.2600, -95.9400},
		"site-energy-001":   {33.4484, -112.0740},
		"site-hc-001":       {40.7128, -74.0060},
		"site-logi-001":     {35.1495, -90.0490},
		"site-pub-001":      {38.8951, -76.9434},
		"site-web3-001":     {1.3521, 103.8198},
		"site-bank-001":     {51.5074, -0.1278},
		"site-fin-001":      {25.2048, 55.2708},
		"site-gov-001":      {37.7749, -122.4194},
		"site-web3i-001":    {37.3861, -122.0839},
		"site-aml-001":      {1.2897, 103.8501},
	}
	for pk, coords := range geoPatches {
		_, _ = pg.Exec(ctx, `UPDATE ontology_objects SET properties = properties || $1::jsonb, updated_at = $2
			WHERE tenant_id = $3 AND object_type = 'Site' AND primary_key_value = $4`,
			mustJSON(map[string]any{"latitude": coords[0], "longitude": coords[1]}),
			now, tenant, pk)
	}
}

// ============================================================
// Helper types and functions for bulk vertical seeding
// ============================================================

type seedObj struct {
	RID, Type, Key string
	Props          map[string]any
}

type seedLink struct {
	Typ, From, To string
}

func upsertAndLink(ctx context.Context, pg *pgxpool.Pool, driver neo4j.DriverWithContext, ch clickhouse.Conn, tenant string, now time.Time, objects []seedObj, links []seedLink) {
	for _, o := range objects {
		upsertObject(ctx, pg, tenant, now, o.RID, o.Type, o.Key, o.Props)
	}
	if driver != nil && len(links) > 0 {
		sess := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
		defer sess.Close(ctx)
		for _, l := range links {
			_, _ = sess.Run(ctx, `MERGE (a:Entity {id: $from}) MERGE (b:Entity {id: $to}) MERGE (a)-[:LINK {type: $type}]->(b)`,
				map[string]any{"type": l.Typ, "from": l.From, "to": l.To})
		}
	}
}

func upsertCase(ctx context.Context, pg *pgxpool.Pool, tenant string, now time.Time, caseID, title, status, priority string, signalIDs []string) {
	_, _ = pg.Exec(ctx, `INSERT INTO cases (case_id, tenant_id, title, status, priority, opened_at, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$6,$6) ON CONFLICT DO NOTHING`,
		caseID, tenant, title, status, priority, now)
	for _, sid := range signalIDs {
		_, _ = pg.Exec(ctx, `INSERT INTO case_signals (case_id, signal_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, caseID, sid)
	}
}

func upsertCHObs(ctx context.Context, ch clickhouse.Conn, now time.Time, obsID, label string, value float64, unit, assetID string) {
	if ch == nil {
		return
	}
	batch, err := ch.PrepareBatch(ctx, `INSERT INTO dataset_observations (observation_id, label, value, unit, observed_at, asset_id, created_at, updated_at)`)
	if err != nil {
		return
	}
	_ = batch.Append(obsID, label, value, unit, now, assetID, now, now)
	_ = batch.Send()
}

func upsertCHSignal(ctx context.Context, ch clickhouse.Conn, now time.Time, signalID, summary, severity, priority string) {
	if ch == nil {
		return
	}
	batch, err := ch.PrepareBatch(ctx, `INSERT INTO dataset_signals (signal_id, summary, severity, owner_id, priority, status, opened_at, created_at, updated_at)`)
	if err != nil {
		return
	}
	_ = batch.Append(signalID, summary, severity, "", priority, "open", now, now, now)
	_ = batch.Send()
}
