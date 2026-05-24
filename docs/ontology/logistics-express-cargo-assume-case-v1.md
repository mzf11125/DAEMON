# Logistics / express freight — assume-case v1

Vendor-neutral simulation of a domestic **express freight operator** using pack `logistics-express-cargo` (Ontology Master v2.0.1 mapping). No counterparty trademarks in public artifacts.

## Tenant model

- **Tenant** = express courier operator (`tenant-demo` in dev).
- **Pack** = `logistics-express-cargo` with `catalogVersion` 2.0.1.
- **Connectors** (profiles): TMS, GPS, EDI, synthetic replay under `connectors/synthetic/logistics-express-cargo/`.

## Dual hierarchy

**Commercial:** `CustomerAccount` → `CommercialOrder` → `Shipment` → `WaybillTTK`

**Operational:** `Trip` → `Manifest` → `ShipmentLeg` → `Shipment`

**Network:** `Route` → `ServiceArea` → `LaneCapacity` (stubs for capacity narrative)

## Junction points (5)

1. `ActivityTouchpoint` → `Shipment` (pickup/delivery touch)
2. `ShipmentLeg` → `Observation` (SLA telemetry)
3. `CustomerAccount` → `CommercialOrder`
4. `CommercialOrder` → `Shipment`
5. `RoutingDecision` → `Signal` (cost/variance anomalies)

## Assume-case narrative (seeded simulation)

1. **Commercial** — Tier-A `CustomerAccount` places `CommercialOrder` with two `Shipment` rows.
2. **Operational** — `Trip` and `Manifest` carry multi-leg journey; one `ShipmentLeg` is **late** (`slaStatus: late`).
3. **Observation** — `express_leg_sla_miss` observation on the late leg.
4. **Signal** — rules (or seed provenance) emit `signal-express-sla-001`, `signal-express-routing-001`, `signal-express-champion-001`.
5. **Case** — analyst path links SLA signal to `case-express-sla-001` via `case_signals`.
6. **WorkOrder** — recovery work order assigned to in-transit vehicle asset.
7. **Financial** — `TPCalculation` and `AllocationRun` rows are **read-only stubs** (`stub: true`); no ledger posting.

## FMEA controls (simulation)

| Mode | Control |
|------|---------|
| Junction drift | Link cardinality in `catalog/links.yaml`; neo4j links in seed |
| Silent SLA miss | `TestExpressCargoSim` requires `case_signals` link |
| Health score without ops input | Account health requires ShipmentLeg SLA feed (documented junction #3) |
| Fixture stale | Mandatory `fixtureVersion` bump + gate packet update |

## What stays core

`Signal`, `Case`, `WorkOrder`, `OpenCase`, `ExecuteWorkOrder`, RLS, audit model.

## Non-goals (MVP sim)

- Full CRM workspace, live TP calculator, Interco posting engine.
- Carrier rate shopping or TMS replacement.

## Related

- [logistics-nvocc-assume-case-v1.md](logistics-nvocc-assume-case-v1.md) — container/NVOCC vertical (separate pack)
- [logistics-express-cargo-criticality-v1.md](../governance/logistics-express-cargo-criticality-v1.md)
