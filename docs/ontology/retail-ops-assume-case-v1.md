# Retail operations — assume-case v1

Illustrates how **one tenant profile** uses the operational loop for distribution-center and shrink monitoring with pack `retail-ops`.

## Tenant model

- **Tenant** = retail logistics operator (DC + store pattern).
- **Connectors**: POS/WMS export stubs — pack `retail-ops`.

## Assume-case narrative

1. **Observation** — inventory variance or shrink sensor at a DC.
2. **Signal** — anomaly threshold → `Signal`.
3. **OpenCase** — loss-prevention review; link to `Site` (DC).
4. **RecordDecision** — escalate or close with audit.

## What the sector pack adds

| Addition | Notes |
|----------|-------|
| Pack objects | `Site` for DCs; shrink-oriented signal summaries |
| Map default | Optional geo for DC network |
| Attachments | CCTV stills, audit exports via `/v1/attachments` |

## What stays core

Governed actions, case linkage, RLS, audit.

## Non-goals (v1)

- POS integration production connector.
- Vendor SDK in runtime.

## Related

- [`multi-sector-fragmentation-v1.md`](multi-sector-fragmentation-v1.md)
