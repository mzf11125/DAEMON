# Rail network — assume-case v1

Illustrates operational loop usage for rail corridor monitoring with pack `rail-network`.

## Tenant model

- **Tenant** = rail infrastructure operator.
- **Connectors**: track sensor / delay feed stubs — pack `rail-network`.

## Assume-case narrative

1. **Observation** — track occupancy or delay event along corridor.
2. **Signal** — safety or SLA breach → `Signal`.
3. **OpenCase** — dispatch review; geo map shows corridor `Site`.
4. **RecordDecision** — speed restriction or clearance with audit; optional **WorkOrder** for maintenance crew.

## What the sector pack adds

| Addition | Notes |
|----------|-------|
| Pack objects | Geo-tagged `Site` along corridors |
| Map default | **On** for corridor COP-style views |
| Attachments | Inspection reports, drone imagery |

## What stays core

Standard case/decision/work-order model and RLS.

## Non-goals (v1)

- Positive train control (PTC) integration.
- Vendor SDK in runtime.

## Related

- [`multi-sector-fragmentation-v1.md`](multi-sector-fragmentation-v1.md)
