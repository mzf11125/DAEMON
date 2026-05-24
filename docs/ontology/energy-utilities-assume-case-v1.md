# Energy & utilities — assume-case v1

Illustrates how **one tenant profile** uses the operational loop for grid and outage operations with pack `energy-utilities`.

## Tenant model

- **Tenant** = regional utility operator (transmission + distribution pattern).
- **Connectors**: SCADA/export stubs, outage feeds — pack `energy-utilities`.

## Assume-case narrative

1. **Observation** — substation telemetry or outage sensor event.
2. **Signal** — voltage anomaly or outage cluster → `Signal`.
3. **OpenCase** — operator workspace; geo map shows affected `Site`.
4. **RecordDecision** — dispatch or all-clear with audit; optional **WorkOrder** for field crew.

## What the sector pack adds

| Addition | Notes |
|----------|-------|
| Pack objects | `Site` with geo for substations; asset health signals |
| Map default | **On** when `geoMapEnabled` in tenant settings |
| Attachments | Inspection photos, SCADA export files |

## What stays core

`Signal`, `Case`, `Decision`, `WorkOrder`, governed actions, `case_signals`, RLS, audit model.

## Non-goals (v1)

- Real-time SCADA control or breaker operations.
- Vendor SDK in Go runtime.

## Related

- [`operational-platform-parity-v1.md`](../traceability/operational-platform-parity-v1.md)
- [`multi-sector-fragmentation-v1.md`](multi-sector-fragmentation-v1.md)
