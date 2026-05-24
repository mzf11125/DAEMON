# Construction operations — assume-case v1

Illustrates operational loop usage for job-site safety and progress monitoring with pack `construction-ops`.

## Tenant model

- **Tenant** = general contractor or EPC operator.
- **Connectors**: site sensor / permit feed stubs — pack `construction-ops`.

## Assume-case narrative

1. **Observation** — equipment or safety sensor event at job site.
2. **Signal** — threshold breach → `Signal`.
3. **OpenCase** — site superintendent review; geo shows job `Site`.
4. **RecordDecision** — stop-work or continue with audit; **WorkOrder** for remediation.

## What the sector pack adds

| Addition | Notes |
|----------|-------|
| Pack objects | Geo `Site` per job site |
| Map default | **On** for multi-site portfolio |
| Attachments | Photos, permit PDFs |

## What stays core

Case/signal linkage, RLS, audit trail.

## Non-goals (v1)

- BIM system of record.
- Vendor SDK in runtime.

## Related

- [`multi-sector-fragmentation-v1.md`](multi-sector-fragmentation-v1.md)
