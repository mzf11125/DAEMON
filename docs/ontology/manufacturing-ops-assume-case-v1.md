# Manufacturing operations — assume-case v1

Illustrates how **one tenant profile** uses the **same** operational loop (Observation → Signal → Case → WorkOrder) with sector-specific connectors and console panels.

## Tenant model

- **Tenant** = plant operations / Connected Edge pattern (generic).
- **Connectors** (post–v1): MES, SCADA metadata — pack `manufacturing`.

## Assume-case narrative

1. **Observation** — line downtime, quality metric.
2. **Signal** — andon-style alert.
3. **Case** + **WorkOrder** on **Asset**; shares traffic-engineering **Site**/**Asset** seed pattern.

## What the sector pack adds (post–v1, stub today)

| Addition | Notes |
|----------|-------|
| Pack objects | Plant 360 read model on core ontology types. |
| Map default | Low — plant floor 2D optional. |
| Attachments | SK, exports, field photos via `/v1/attachments` |

## What stays core

`Signal`, `Case`, `Decision`, `WorkOrder`, `OpenCase`, `CreateWorkOrder`, `ExecuteWorkOrder`, `RecordDecision`, `case_signals`, RLS, audit model.

## Non-goals (v1)

- OT air-gap deployment.
- Replacing system-of-record for the sector.

## Related

- [`healthcare-ops-assume-case-v1.md`](healthcare-ops-assume-case-v1.md)
- [`multi-sector-fragmentation-v1.md`](multi-sector-fragmentation-v1.md)
