# Web3 intelligence — assume-case v1

Illustrates how **one tenant profile** uses the **same** operational loop (Observation → Signal → Case → WorkOrder) with sector-specific connectors and console panels.

## Tenant model

- **Tenant** = VASP or crypto compliance desk.
- **Connectors** (post–v1): Range MCP (Layer A), Dune Layer B queries — no keys in repo.

## Assume-case narrative

1. **Observation** — on-chain risk score or transfer summary as metadata.
2. **Signal** — sanctions/risk threshold → `Signal`.
3. **OpenCase** — investigator cites wallet/tx in narrative; **map off**.
4. Agent readonly playbook — see `docs/aip/range-mcp-investigation-v1.md`.

## What the sector pack adds (post–v1, stub today)

| Addition | Notes |
|----------|-------|
| Pack objects | Extends `aml-fintech` with chain-specific Observation labels. |
| Map default | **Off** default. |
| Attachments | SK, exports, field photos via `/v1/attachments` |

## What stays core

`Signal`, `Case`, `Decision`, `WorkOrder`, `OpenCase`, `CreateWorkOrder`, `ExecuteWorkOrder`, `RecordDecision`, `case_signals`, RLS, audit model.

## Non-goals (v1)

- Wallet custody, transaction signing.
- Replacing system-of-record for the sector.

## Related

- [`healthcare-ops-assume-case-v1.md`](healthcare-ops-assume-case-v1.md)
- [`multi-sector-fragmentation-v1.md`](multi-sector-fragmentation-v1.md)
