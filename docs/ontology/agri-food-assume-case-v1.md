# Agri-food — assume-case v1

Illustrates how **one tenant profile** uses the **same** operational loop (Observation → Signal → Case → WorkOrder) with sector-specific connectors and console panels.

## Tenant model

- **Tenant** = farm-to-shelf traceability program.
- **Connectors** (post–v1): cold chain IoT metadata, QC lab — pack `agri-food`.

## Assume-case narrative

1. **Observation** — temperature excursion or quality assay.
2. **Signal** — recall trigger.
3. **OpenCase** — trace-back investigation; attachments (COA, photos).

## What the sector pack adds (post–v1, stub today)

| Addition | Notes |
|----------|-------|
| Pack objects | `Lot`, `SKU`, `Facility` links. |
| Map default | Medium — origin **Site** optional. |
| Attachments | SK, exports, field photos via `/v1/attachments` |

## What stays core

`Signal`, `Case`, `Decision`, `WorkOrder`, `OpenCase`, `CreateWorkOrder`, `ExecuteWorkOrder`, `RecordDecision`, `case_signals`, RLS, audit model.

## Non-goals (v1)

- FDA submission.
- Replacing system-of-record for the sector.

## Related

- [`healthcare-ops-assume-case-v1.md`](healthcare-ops-assume-case-v1.md)
- [`multi-sector-fragmentation-v1.md`](multi-sector-fragmentation-v1.md)
