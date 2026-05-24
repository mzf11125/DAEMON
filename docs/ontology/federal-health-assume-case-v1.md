# Federal health / public health — assume-case v1

Illustrates how **one tenant profile** uses the **same** operational loop (Observation → Signal → Case → WorkOrder) with sector-specific connectors and console panels.

## Tenant model

- **Tenant** = public health agency or VA-style ops (aggregates only v1).
- **Connectors** (post–v1): surveillance feeds, supply chain — `healthcare-ops` + `government-ops`.

## Assume-case narrative

1. **Observation** — aggregate census, PPE stock, surveillance indicator (no patient IDs).
2. **Signal** — outbreak or supply threshold.
3. **OpenCase** — program response; optional **Site** map for jurisdiction pins.

## What the sector pack adds (post–v1, stub today)

| Addition | Notes |
|----------|-------|
| Pack objects | Profiles on `healthcare-ops` for agency tenant. |
| Map default | Optional 2D cluster pins. |
| Attachments | SK, exports, field photos via `/v1/attachments` |

## What stays core

`Signal`, `Case`, `Decision`, `WorkOrder`, `OpenCase`, `CreateWorkOrder`, `ExecuteWorkOrder`, `RecordDecision`, `case_signals`, RLS, audit model.

## Non-goals (v1)

- HIPAA/PHI; clinical EMR replacement.
- Replacing system-of-record for the sector.

## Related

- [`healthcare-ops-assume-case-v1.md`](healthcare-ops-assume-case-v1.md)
- [`multi-sector-fragmentation-v1.md`](multi-sector-fragmentation-v1.md)
