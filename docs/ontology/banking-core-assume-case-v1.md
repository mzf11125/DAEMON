# Commercial banking core — assume-case v1

Illustrates how **one tenant profile** uses the **same** operational loop (Observation → Signal → Case → WorkOrder) with sector-specific connectors and console panels.

## Tenant model

- **Tenant** = commercial bank credit/ops.
- **Connectors** (post–v1): core banking, credit bureau metadata.

## Assume-case narrative

1. **Observation** — credit metric or covenants breach indicator.
2. **Signal** — risk escalation.
3. **OpenCase** — credit review; distinct from AML TM (`aml-fintech`).

## What the sector pack adds (post–v1, stub today)

| Addition | Notes |
|----------|-------|
| Pack objects | `Customer`, `Facility`, `Covenant` on `banking-core`. |
| Map default | **Off**. |
| Attachments | SK, exports, field photos via `/v1/attachments` |

## What stays core

`Signal`, `Case`, `Decision`, `WorkOrder`, `OpenCase`, `CreateWorkOrder`, `ExecuteWorkOrder`, `RecordDecision`, `case_signals`, RLS, audit model.

## Non-goals (v1)

- Core ledger posting.
- Replacing system-of-record for the sector.

## Related

- [`healthcare-ops-assume-case-v1.md`](healthcare-ops-assume-case-v1.md)
- [`multi-sector-fragmentation-v1.md`](multi-sector-fragmentation-v1.md)
