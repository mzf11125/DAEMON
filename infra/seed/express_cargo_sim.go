package main

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	neo4j "github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

const expressCargoPackID = "logistics-express-cargo"

// seedExpressCargoSim loads the vendor-neutral express freight simulation on tenant-demo.
func seedExpressCargoSim(ctx context.Context, pg *pgxpool.Pool, ch clickhouse.Conn, driver neo4j.DriverWithContext, tenant string, now time.Time) {
	_, _ = pg.Exec(ctx, `UPDATE tenant_settings SET features = features || $2::jsonb, updated_at = $3 WHERE tenant_id = $1`,
		tenant, mustJSON(map[string]any{"packId": expressCargoPackID, "expressCargoSim": true}), now)

	siteHub := "site-logistics-express-cargo-001"
	siteEast := "site-logistics-express-cargo-002"
	assetVan := "asset-logistics-express-cargo-001"
	signalSandbox := "signal-logistics-express-cargo-001"
	signalSLA := "signal-express-sla-001"
	signalRouting := "signal-express-routing-001"
	signalChampion := "signal-express-champion-001"
	caseSLA := "case-express-sla-001"
	obsSLA := "obs-express-sla-001"
	obsRouting := "obs-express-routing-001"
	obsChampion := "obs-express-champion-001"
	legLate := "leg-express-001"
	legOK := "leg-express-002"
	shipment1 := "shipment-express-001"
	shipment2 := "shipment-express-002"
	order1 := "order-express-001"
	account1 := "account-tier-a-001"
	trip1 := "trip-express-001"
	manifest1 := "manifest-express-001"
	routing1 := "routing-express-001"

	upsertObject(ctx, pg, tenant, now, "ri.demo.site.express.hub", "Site", siteHub, map[string]any{
		"siteId": siteHub, "name": "Central Sort Hub", "latitude": 41.8781, "longitude": -87.6298,
		"vertical": expressCargoPackID, "regionalOfficeId": "ro-midwest-001",
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.site.express.east", "Site", siteEast, map[string]any{
		"siteId": siteEast, "name": "Regional Office East", "latitude": 40.7128, "longitude": -74.0060,
		"vertical": expressCargoPackID, "regionalOfficeId": "ro-east-001",
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.asset.express.van", "Asset", assetVan, map[string]any{
		"assetId": assetVan, "name": "Van unit 42 (in transit)", "status": "online", "vertical": expressCargoPackID,
		"latitude": 41.5, "longitude": -86.2,
	})

	// Commercial hierarchy
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.account", "CustomerAccount", account1, map[string]any{
		"customerAccountId": account1, "name": "Tier-A Retail Partner (sim)", "tier": "A", "status": "active",
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.contact", "Contact", "contact-express-001", map[string]any{
		"contactId": "contact-express-001", "displayName": "Ops champion (sim)", "championDepartureSignal": true,
		"customerAccountId": account1,
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.order", "CommercialOrder", order1, map[string]any{
		"commercialOrderId": order1, "customerAccountId": account1, "status": "fulfilling",
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.shipment1", "Shipment", shipment1, map[string]any{
		"shipmentId": shipment1, "commercialOrderId": order1, "status": "in_transit", "vertical": expressCargoPackID,
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.shipment2", "Shipment", shipment2, map[string]any{
		"shipmentId": shipment2, "commercialOrderId": order1, "status": "delivered", "vertical": expressCargoPackID,
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.waybill", "WaybillTTK", "waybill-express-001", map[string]any{
		"waybillTTKId": "waybill-express-001", "shipmentId": shipment1, "trackingNumber": "SIM-TTK-001",
	})

	// Operational hierarchy
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.trip", "Trip", trip1, map[string]any{
		"tripId": trip1, "status": "active", "originSiteId": siteHub,
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.manifest", "Manifest", manifest1, map[string]any{
		"manifestId": manifest1, "tripId": trip1, "status": "in_transit",
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.leg1", "ShipmentLeg", legLate, map[string]any{
		"shipmentLegId": legLate, "shipmentId": shipment1, "manifestId": manifest1, "slaStatus": "late",
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.leg2", "ShipmentLeg", legOK, map[string]any{
		"shipmentLegId": legOK, "shipmentId": shipment1, "manifestId": manifest1, "slaStatus": "on_time",
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.dispatch", "Dispatch", "dispatch-express-001", map[string]any{
		"dispatchId": "dispatch-express-001", "tripId": trip1, "status": "assigned",
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.routing", "RoutingDecision", routing1, map[string]any{
		"routingDecisionId": routing1, "variancePct": 18.5, "shipmentId": shipment1,
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.touchpoint", "ActivityTouchpoint", "touchpoint-express-001", map[string]any{
		"activityTouchpointId": "touchpoint-express-001", "shipmentId": shipment1, "activityType": "pickup",
	})

	// Network + financial stubs (read-only narrative — all 7 financial catalog types)
	for _, stub := range []struct{ rid, typ, pk string; props map[string]any }{
		{"ri.demo.express.route", "Route", "route-express-001", map[string]any{"routeId": "route-express-001", "name": "Hub consolidation lane"}},
		{"ri.demo.express.service", "ServiceArea", "service-express-001", map[string]any{"serviceAreaId": "service-express-001", "name": "Midwest metro"}},
		{"ri.demo.express.vendor", "VendorCost", "vendor-express-001", map[string]any{"vendorCostId": "vendor-express-001", "stub": true, "amount": 890.0}},
		{"ri.demo.express.tp", "TPCalculation", "tp-express-001", map[string]any{"tPCalculationId": "tp-express-001", "stub": true, "amount": 1240.50}},
		{"ri.demo.express.invoice", "Invoice", "invoice-express-001", map[string]any{"invoiceId": "invoice-express-001", "stub": true, "status": "posted"}},
		{"ri.demo.express.interco", "IntercoTransaction", "interco-express-001", map[string]any{"intercoTransactionId": "interco-express-001", "stub": true, "status": "pending"}},
		{"ri.demo.express.obl", "OBLScorecard", "obl-express-001", map[string]any{"oBLScorecardId": "obl-express-001", "stub": true, "score": 82}},
		{"ri.demo.express.alloc", "AllocationRun", "alloc-express-001", map[string]any{"allocationRunId": "alloc-express-001", "stub": true, "status": "completed"}},
		{"ri.demo.express.gov", "GovernanceAuditRecord", "gov-express-001", map[string]any{"governanceAuditRecordId": "gov-express-001", "stub": true, "status": "recorded"}},
	} {
		upsertObject(ctx, pg, tenant, now, stub.rid, stub.typ, stub.pk, stub.props)
	}

	// Silent-account scenario for sales co-pilot (A3)
	accountSilent := "account-tier-b-silent-001"
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.account.silent", "CustomerAccount", accountSilent, map[string]any{
		"customerAccountId": accountSilent, "name": "Tier-B Silent Partner (sim)", "tier": "B", "status": "active",
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.activity.silent", "Activity", "activity-express-silent-001", map[string]any{
		"activityId": "activity-express-silent-001", "customerAccountId": accountSilent,
		"activityType": "check_in", "occurredAt": now.Add(-95 * 24 * time.Hour).Format(time.RFC3339),
		"summary": "Last touchpoint over 90 days ago",
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.health.silent", "AccountHealthScore", "health-express-silent-001", map[string]any{
		"accountHealthScoreId": "health-express-silent-001", "customerAccountId": accountSilent,
		"score": 42, "churnRisk": "elevated", "stub": true,
	})

	// Core loop: observation → signals → case
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.obs.sla", "Observation", obsSLA, map[string]any{
		"observationId": obsSLA, "label": "express_leg_sla_miss", "value": 1.0, "unit": "flag",
		"shipmentLegId": legLate,
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.signal.sandbox", "Signal", signalSandbox, map[string]any{
		"signalId": signalSandbox, "summary": "Routing cost variance on hub consolidation lane",
		"severity": "medium", "status": "open", "priority": "P2", "vertical": expressCargoPackID,
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.signal.sla", "Signal", signalSLA, map[string]any{
		"signalId": signalSLA, "summary": "Shipment leg SLA breach on cross-hub leg",
		"severity": "high", "status": "open", "priority": "P1", "vertical": expressCargoPackID,
		"provenanceRuleId": "express-leg-sla-breach", "shipmentId": shipment1, "shipmentLegId": legLate,
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.signal.routing", "Signal", signalRouting, map[string]any{
		"signalId": signalRouting, "summary": "Routing decision variance above threshold",
		"severity": "medium", "status": "open", "priority": "P2", "vertical": expressCargoPackID,
		"provenanceRuleId": "express-routing-anomaly", "shipmentId": shipment1, "routingDecisionId": routing1,
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.signal.champion", "Signal", signalChampion, map[string]any{
		"signalId": signalChampion, "summary": "Account champion departure risk",
		"severity": "low", "status": "open", "priority": "P3", "vertical": expressCargoPackID,
		"provenanceRuleId": "express-champion-idle", "customerAccountId": account1,
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.case.sla", "Case", caseSLA, map[string]any{
		"caseId": caseSLA, "title": "Investigate cross-hub SLA breach", "status": "open",
		"ownerId": "party-001", "priority": "P1", "vertical": expressCargoPackID,
	})
	upsertObject(ctx, pg, tenant, now, "ri.demo.express.wo.sla", "WorkOrder", "wo-express-sla-001", map[string]any{
		"workOrderId": "wo-express-sla-001", "title": "Expedite recovery for late leg", "status": "open",
		"caseId": caseSLA, "assetId": assetVan,
	})

	_, _ = pg.Exec(ctx, `INSERT INTO cases (case_id, tenant_id, title, status, owner_id, priority, opened_at, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$7) ON CONFLICT DO NOTHING`,
		caseSLA, tenant, "Investigate cross-hub SLA breach", "open", "party-001", "P1", now)
	_, _ = pg.Exec(ctx, `INSERT INTO case_signals (case_id, signal_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, caseSLA, signalSLA)

	if driver != nil {
		sess := driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
		for _, link := range []struct{ typ, from, to string }{
			{"SiteHostsAsset", siteHub, assetVan},
			{"CustomerAccountToCommercialOrder", account1, order1},
			{"CommercialOrderToShipment", order1, shipment1},
			{"CommercialOrderToShipment", order1, shipment2},
			{"ActivityTouchpointToShipment", "touchpoint-express-001", shipment1},
			{"ShipmentLegToObservation", legLate, obsSLA},
			{"ObservationRaisedSignal", obsSLA, signalSLA},
			{"SignalLinkedToCase", signalSLA, caseSLA},
			{"RoutingDecisionToSignal", routing1, signalRouting},
			{"WorkOrderTargetsAsset", "wo-express-sla-001", assetVan},
		} {
			_, _ = sess.Run(ctx, `MERGE (a:Entity {id: $from}) MERGE (b:Entity {id: $to}) MERGE (a)-[:LINK {type: $type}]->(b)`,
				map[string]any{"type": link.typ, "from": link.from, "to": link.to})
		}
		sess.Close(ctx)
	}

	if ch != nil {
		chObsSQL := `INSERT INTO dataset_observations (observation_id, label, value, unit, observed_at, asset_id, tenant_id, created_at, updated_at)`
		if batch, err := ch.PrepareBatch(ctx, chObsSQL); err == nil {
			_ = batch.Append(obsSLA, "express_leg_sla_miss", 1.0, "flag", now, assetVan, tenant, now, now)
			_ = batch.Append(obsRouting, "express_routing_variance_pct", 22.0, "pct", now, assetVan, tenant, now, now)
			_ = batch.Append(obsChampion, "express_champion_departure", 1.0, "flag", now, account1, tenant, now, now)
			_ = batch.Send()
		}
		for _, sig := range []struct{ id, summary, sev, pri string }{
			{signalSandbox, "Routing cost variance on hub consolidation lane", "medium", "P2"},
			{signalSLA, "Shipment leg SLA breach on cross-hub leg", "high", "P1"},
			{signalRouting, "Routing decision variance above threshold", "medium", "P2"},
		} {
			if batch, err := ch.PrepareBatch(ctx, `INSERT INTO dataset_signals (signal_id, summary, severity, owner_id, priority, status, opened_at, created_at, updated_at)`); err == nil {
				_ = batch.Append(sig.id, sig.summary, sig.sev, "", sig.pri, "open", now, now, now)
				_ = batch.Send()
			}
		}
	}

	seedExpressCargoAttachment(ctx, pg, tenant, caseSLA)

	fmt.Printf("seedExpressCargoSim: pack %s loaded for tenant %s\n", expressCargoPackID, tenant)
}

const expressCargoAttachmentID = "aaaaaaaa-bbbb-4ccc-8ddd-000000000001"

func seedExpressCargoAttachment(ctx context.Context, pg *pgxpool.Pool, tenant, caseID string) {
	objectKey := tenant + "/express-cargo/sim/pod-manifest-001.pdf"
	_, _ = pg.Exec(ctx, `
		INSERT INTO attachments (attachment_id, tenant_id, object_key, filename, content_type, size_bytes, created_by, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
		ON CONFLICT (attachment_id) DO NOTHING`,
		expressCargoAttachmentID, tenant, objectKey, "pod-manifest-001.pdf", "application/pdf", 2048, "seed-express-cargo")
	_, _ = pg.Exec(ctx, `
		INSERT INTO attachment_links (tenant_id, attachment_id, resource_type, resource_id, role, created_at)
		VALUES ($1,$2,$3,$4,$5,NOW())
		ON CONFLICT (tenant_id, attachment_id, resource_type, resource_id, role) DO NOTHING`,
		tenant, expressCargoAttachmentID, "Case", caseID, "pod_manifest")
}
