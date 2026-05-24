# Humanitarian logistics — assume-case v1

Illustrates how **one tenant profile** uses the **same** operational loop (Observation → Signal → Case → WorkOrder) with sector-specific connectors and console panels.

## Tenant model

- **Tenant** = humanitarian hub operator (WFP/DOTS-style pattern, generic).
- **Connectors** (post–v1): WMS, fleet GPS metadata, customs — spans `logistics-nvocc` + `agri-food`.

## Assume-case narrative

1. **Observation** — stock level, convoy ETA, border delay.
2. **Signal** — disruption → `Signal` at hub **Site**.
3. **OpenCase** — program coordinator assigns response.
4. **WorkOrder** — reroute convoy; geo map shows hub + convoy **Asset**.

## What the sector pack adds (post–v1, stub today)

| Addition | Notes |
|----------|-------|
| Pack objects | `Hub`, `Convoy`, `Program` profile on logistics pack. |
| Map default | **On** — high value for corridor/hub visibility. |
| Attachments | SK, exports, field photos via `/v1/attachments` |

## What stays core

`Signal`, `Case`, `Decision`, `WorkOrder`, `OpenCase`, `CreateWorkOrder`, `ExecuteWorkOrder`, `RecordDecision`, `case_signals`, RLS, audit model.

## Non-goals (v1)

- Classified relief operations.
- Replacing system-of-record for the sector.

## Related

- [`healthcare-ops-assume-case-v1.md`](healthcare-ops-assume-case-v1.md)
- [`multi-sector-fragmentation-v1.md`](multi-sector-fragmentation-v1.md)
