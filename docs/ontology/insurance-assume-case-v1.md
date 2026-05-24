# Insurance — assume-case v1

Illustrates how **one tenant profile** uses the **same** operational loop (Observation → Signal → Case → WorkOrder) with sector-specific connectors and console panels.

## Tenant model

- **Tenant** = P&C insurer underwriting/claims.
- **Connectors** (post–v1): policy admin, claims, actuarial exports — extends `finance-ledger`.

## Assume-case narrative

1. **Observation** — loss ratio, reserve movement.
2. **Signal** — claims spike or underwriting exception.
3. **OpenCase** — claims/legal review; extends Swiss Re pattern.

## What the sector pack adds (post–v1, stub today)

| Addition | Notes |
|----------|-------|
| Pack objects | `Policy`, `Claim`, `Reserve` stubs. |
| Map default | **Off**; CAT geo optional. |
| Attachments | SK, exports, field photos via `/v1/attachments` |

## What stays core

`Signal`, `Case`, `Decision`, `WorkOrder`, `OpenCase`, `CreateWorkOrder`, `ExecuteWorkOrder`, `RecordDecision`, `case_signals`, RLS, audit model.

## Non-goals (v1)

- Statutory reporting sign-off.
- Replacing system-of-record for the sector.

## Related

- [`healthcare-ops-assume-case-v1.md`](healthcare-ops-assume-case-v1.md)
- [`multi-sector-fragmentation-v1.md`](multi-sector-fragmentation-v1.md)
