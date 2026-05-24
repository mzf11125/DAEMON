# Logistics / NVOCC — assume-case v1

Illustrates how **one tenant profile** uses the **same** operational loop (Observation → Signal → Case → WorkOrder) with sector-specific connectors and console panels.

## Tenant model

- **Tenant** = freight forwarder or NVOCC operator (e.g. `tenant-demo` in dev).
- **Connectors** (post–v1): TMS, carrier EDI, port/community systems — each a `connectorProfile` under pack `logistics-nvocc`.

## Assume-case narrative

1. **Observation** — ETA slip, container dwell, or AIS-style position metadata lands in silver (`dataset_observations`).
2. **Signal** — rule flags delay or exception → `Signal` in ontology.
3. **OpenCase** — ops links `signalIds`; `case_signals` records provenance.
4. **CreateWorkOrder** / **ExecuteWorkOrder** — dispatch reroute, customs hold, or port appointment.
5. **Attachment** — B/L, POD, customs docs linked to Case/WorkOrder.

## What the sector pack adds (post–v1, stub today)

| Addition | Notes |
|----------|-------|
| Pack objects | `Shipment`, `Container`, `Voyage` (manifest stub); links `ShipmentRaisedSignal`, `CaseTargetsShipment`. |
| Map default | **On** — hub/port **Site** pins + vessel **Asset** track when geo enabled. |
| Attachments | SK, exports, field photos via `/v1/attachments` |

## What stays core

`Signal`, `Case`, `Decision`, `WorkOrder`, `OpenCase`, `CreateWorkOrder`, `ExecuteWorkOrder`, `RecordDecision`, `case_signals`, RLS, audit model.

## Non-goals (v1)

- Carrier rate shopping, full TMS replacement.
- Replacing system-of-record for the sector.

## Related

- [`healthcare-ops-assume-case-v1.md`](healthcare-ops-assume-case-v1.md)
- [`multi-sector-fragmentation-v1.md`](multi-sector-fragmentation-v1.md)
