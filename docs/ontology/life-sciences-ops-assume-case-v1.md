# Life sciences operations — assume-case v1

Illustrates how **one tenant profile** uses the **same** operational loop (Observation → Signal → Case → WorkOrder) with sector-specific connectors and console panels.

## Tenant model

- **Tenant** = biomanufacturing or pharma ops (distinct from hospital VCC).
- **Connectors** (post–v1): MES, LIMS, QMS — pack `life-sciences-ops`.

## Assume-case narrative

1. **Observation** — batch deviation, OOS assay, environmental reading.
2. **Signal** — CAPA trigger → `Signal`.
3. **OpenCase** — quality investigation; **WorkOrder** for line clearance.
4. **Attachment** — EBR excerpts, assay PDFs on Case.

## What the sector pack adds (post–v1, stub today)

| Addition | Notes |
|----------|-------|
| Pack objects | `Batch`, `Line`, `CAPA` stubs; shares manufacturing **Site**/**Asset** pattern. |
| Map default | Low — plant **Site** map optional. |
| Attachments | SK, exports, field photos via `/v1/attachments` |

## What stays core

`Signal`, `Case`, `Decision`, `WorkOrder`, `OpenCase`, `CreateWorkOrder`, `ExecuteWorkOrder`, `RecordDecision`, `case_signals`, RLS, audit model.

## Non-goals (v1)

- GMP certification claims; patient PHI.
- Replacing system-of-record for the sector.

## Related

- [`healthcare-ops-assume-case-v1.md`](healthcare-ops-assume-case-v1.md)
- [`multi-sector-fragmentation-v1.md`](multi-sector-fragmentation-v1.md)
