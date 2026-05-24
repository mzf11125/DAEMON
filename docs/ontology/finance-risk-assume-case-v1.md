# Finance / reinsurance risk — assume-case v1

Illustrates how **one tenant profile** uses the **same** operational loop (Observation → Signal → Case → WorkOrder) with sector-specific connectors and console panels.

## Tenant model

- **Tenant** = reinsurer or commercial risk desk (Swiss Re–style pattern, generic).
- **Connectors** (post–v1): policy admin, claims bordereaux, exposure feeds — pack `finance-ledger`.

## Assume-case narrative

1. **Observation** — exposure metric or loss development index in silver.
2. **Signal** — threshold breach (accumulation, CAT load) → `Signal`.
3. **OpenCase** — underwriter investigation; attachments for policy/claims evidence.
4. **RecordDecision** — accept/limit/decline with audit.

## What the sector pack adds (post–v1, stub today)

| Addition | Notes |
|----------|-------|
| Pack objects | `Policy`, `Treaty`, `Exposure` stubs; heavy **attachments**, **map off** by default. |
| Map default | **Off** — spatial CAT optional later via `Site`. |
| Attachments | SK, exports, field photos via `/v1/attachments` |

## What stays core

`Signal`, `Case`, `Decision`, `WorkOrder`, `OpenCase`, `CreateWorkOrder`, `ExecuteWorkOrder`, `RecordDecision`, `case_signals`, RLS, audit model.

## Non-goals (v1)

- Actuarial sign-off, regulatory filing.
- Replacing system-of-record for the sector.

## Related

- [`healthcare-ops-assume-case-v1.md`](healthcare-ops-assume-case-v1.md)
- [`multi-sector-fragmentation-v1.md`](multi-sector-fragmentation-v1.md)
