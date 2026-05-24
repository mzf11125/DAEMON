# Mission tasking — assume-case v1

Illustrates proximity reconnaissance and asset tasking using the operational loop with pack `mission-tasking`. Maps to **CAP-PROXIMITY-TASKING** without external tasking SDKs.

## Tenant model

- **Tenant** = operational coordination cell (generic, unclassified sandbox).
- **Connectors**: sim position feed + task queue stub — pack `mission-tasking`.

## Assume-case narrative

1. **Observation** — moving asset enters proximity threshold of a `Site` (seed: Recon Asset Grid 3).
2. **Signal** — proximity queue depth or geofence breach → `Signal` (“Proximity task queue depth”).
3. **OpenCase** — “Dispatch proximity recon” case opened; analyst reviews linked signals.
4. **CreateWorkOrder** — recon task queued for field or simulated agent.
5. **ExecuteWorkOrder** / **RecordDecision** — task complete or abort with full audit.

Seed evidence: `infra/seed/synthetic_sectors.go` sets `includeWorkOrder: true` for `mission-tasking` and adds synthetic assets `asset-friendly-001` (friendly recon unit) and `track-hostile-001` (hostile track) with work order `wo-proximity-hostile-001`; `p3_verticals.go` seeds geo-enabled sites for map views.

## What the sector pack adds

| Addition | Notes |
|----------|-------|
| Pack objects | Geo `Site`, mobile `Asset` positions via ingest/sim |
| Map default | **On** — `/live` shows tracks and sites |
| Work orders | Proximity recon lifecycle (partial — no agent listen/stream) |
| Attachments | Thumbnail or ISR still via `role=thumbnail` |

## What stays core

PROPOSE → HITL → `executeAction` policy; no direct agent mutation of ontology without audit.

## Non-goals (v1)

- Agent long-poll / SSE “listen as asset” (P3+).
- Classified deployment or vendor tasking SDK in Go runtime.

## Related

- [`intelligence-ops-assume-case-v1.md`](intelligence-ops-assume-case-v1.md)
- [`digital-twin-v1.md`](../architecture/digital-twin-v1.md)
- [`operational-sample-patterns-v1.md`](../research/operational-sample-patterns-v1.md)
