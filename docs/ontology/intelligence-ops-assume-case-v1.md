# Intelligence operations — assume-case v1

Illustrates how **one tenant profile** uses the **same** operational loop (Observation → Signal → Case → WorkOrder) with sector-specific connectors and console panels.

## Tenant model

- **Tenant** = investigation unit (LE/financial crime pattern, generic).
- **Connectors** (post–v1): OSINT feeds, sanctions lists, case exports — pack `intelligence-ops` stub.

## Assume-case narrative

1. **Observation** — entity link or geo event metadata.
2. **Signal** — anomaly or match → `Signal`.
3. **OpenCase** — analyst workspace; link graph via ontology links.
4. **RecordDecision** — disposition with audit; optional **WorkOrder** for field follow-up.

## What the sector pack adds (post–v1, stub today)

| Addition | Notes |
|----------|-------|
| Pack objects | `Party`, link types for investigation graph; COP-style map when geo on. |
| Map default | **On** for geo investigations; **off** for pure AML desk. |
| Attachments | SK, exports, field photos via `/v1/attachments` |

## What stays core

`Signal`, `Case`, `Decision`, `WorkOrder`, `OpenCase`, `CreateWorkOrder`, `ExecuteWorkOrder`, `RecordDecision`, `case_signals`, RLS, audit model.

## Non-goals (v1)

- Classified deployment; vendor SDK in Go runtime.
- Replacing system-of-record for the sector.

## Related

- [`healthcare-ops-assume-case-v1.md`](healthcare-ops-assume-case-v1.md)
- [`multi-sector-fragmentation-v1.md`](multi-sector-fragmentation-v1.md)
