# Telecom operations — assume-case v1

Illustrates operational loop usage for network incident management with pack `telecom-ops`.

## Tenant model

- **Tenant** = telecom NOC operator.
- **Connectors**: alarm / topology export stubs — pack `telecom-ops`.

## Assume-case narrative

1. **Observation** — cell site or fiber span alarm.
2. **Signal** — correlated outage → `Signal`.
3. **OpenCase** — NOC ticket workspace; map shows affected `Site`.
4. **RecordDecision** — restore or escalate; **WorkOrder** for field tech when needed.

## What the sector pack adds

| Addition | Notes |
|----------|-------|
| Pack objects | `Site` for towers/POPs with geo |
| Map default | **On** for outage visualization |
| Attachments | Config snapshots, traceroute exports |

## What stays core

Governed actions, audit, tenant isolation.

## Non-goals (v1)

- OSS/BSS production integration.
- Vendor SDK in runtime.

## Related

- [`multi-sector-fragmentation-v1.md`](multi-sector-fragmentation-v1.md)
