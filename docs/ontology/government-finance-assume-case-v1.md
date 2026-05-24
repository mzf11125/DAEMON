# Government finance — assume-case v1

Illustrates how **one tenant profile** uses the **same** operational loop (Observation → Signal → Case → WorkOrder) with sector-specific connectors and console panels.

## Tenant model

- **Tenant** = agency FM/grants office.
- **Connectors** (post–v1): GL, grants system, contract repository — `government-ops` + `finance-ledger`.

## Assume-case narrative

1. **Observation** — budget variance, grant burn rate.
2. **Signal** — threshold → `Signal`.
3. **OpenCase** — program audit trail; **attachments heavy** (contracts, grant files).
4. **RecordDecision** — approval/escalation.

## What the sector pack adds (post–v1, stub today)

| Addition | Notes |
|----------|-------|
| Pack objects | `Grant`, `Contract`, `Obligation` stubs. |
| Map default | **Off**. |
| Attachments | SK, exports, field photos via `/v1/attachments` |

## What stays core

`Signal`, `Case`, `Decision`, `WorkOrder`, `OpenCase`, `CreateWorkOrder`, `ExecuteWorkOrder`, `RecordDecision`, `case_signals`, RLS, audit model.

## Non-goals (v1)

- Official appropriations system of record.
- Replacing system-of-record for the sector.

## Related

- [`healthcare-ops-assume-case-v1.md`](healthcare-ops-assume-case-v1.md)
- [`multi-sector-fragmentation-v1.md`](multi-sector-fragmentation-v1.md)
