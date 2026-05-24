# Operational sample patterns v1

Educational mapping from common **sample-app patterns** (entity map, objects CLI, periodic publish, thumbnail, tasking) to Daemon-native implementations. Patterns only — no vendor SDK or runtime dependency.

| Pattern | Teaches | Daemon analogue | Status |
|---------|---------|-----------------|--------|
| Entity visualizer | Map read model over moving entities | Ontology `Site`/`Asset` + `/v1/geo/map` + `/live` | Partial |
| Objects CLI | Blob upload, TTL, metadata, list-by-prefix | Attachment service + MinIO | Implemented |
| AIS integration REST | Periodic position → entity upsert | `ingestion-service` jobs + transforms | Partial (`ais-demo`) |
| Entity thumbnail | Blob linked to entity for UI | `role=thumbnail` attachment link | Partial |
| Task an asset | Task create → status → cancel | Action types + audit (`OpenCase`, work orders) | Partial |
| Auto reconnaissance | Proximity task on asset | `mission-tasking` pack + WorkOrder seed | Partial |

Implementation rule: clone sample repos **locally for study**; implement equivalent flows via ontology writes, attachments, and actions — never add third-party SDKs to `go.mod` or runtime paths.

Cross-reference: [capability-pattern-index-v1.md](./capability-pattern-index-v1.md), [operational-sample-apps-parity-v1.md](./operational-sample-apps-parity-v1.md).
