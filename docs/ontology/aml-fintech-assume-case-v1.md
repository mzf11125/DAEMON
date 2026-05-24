# AML / fintech — assume-case v1

Illustrates how **one tenant profile** uses the **same** operational loop (Observation → Signal → Case → WorkOrder) with sector-specific connectors and console panels.

## Tenant model

- **Tenant** = bank or fintech TM program.
- **Connectors** (post–v1): KYC vendor, sanctions API, core banking TM feed.

## Assume-case narrative

1. **Observation** — TM alert or screening hit metadata.
2. **Signal** — escalated alert → `Signal`.
3. **OpenCase** — analyst review; golden **Party** record.
4. **RecordDecision** — STR support narrative (not legal filing).

## What the sector pack adds (post–v1, stub today)

| Addition | Notes |
|----------|-------|
| Pack objects | `Party`, `Account`, `Transaction` on `aml-fintech` pack. |
| Map default | **Off**. |
| Attachments | SK, exports, field photos via `/v1/attachments` |

## What stays core

`Signal`, `Case`, `Decision`, `WorkOrder`, `OpenCase`, `CreateWorkOrder`, `ExecuteWorkOrder`, `RecordDecision`, `case_signals`, RLS, audit model.

## Non-goals (v1)

- Regulatory determination; vendor ToS reproduction.
- Replacing system-of-record for the sector.

## Related

- [`healthcare-ops-assume-case-v1.md`](healthcare-ops-assume-case-v1.md)
- [`multi-sector-fragmentation-v1.md`](multi-sector-fragmentation-v1.md)
