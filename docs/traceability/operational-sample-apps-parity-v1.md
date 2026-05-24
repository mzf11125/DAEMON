# Operational sample apps parity v1

Pattern parity between common **reference sample applications** (entity map, objects CLI, periodic publish, thumbnail, tasking) and Daemon-native implementations. Educational framing only — **no vendor SDK, runtime dependency, or URL catalog in this repo**.

## Three planes

| Plane | Reference teaches | Daemon |
|-------|-------------------|--------|
| Semantic | Entities with flexible attributes | Ontology object types + ingest → sync |
| Files | Blob upload, metadata, list-by-prefix | `/v1/attachments` + MinIO |
| Command | Task create → status → cancel | Action types + audit (`OpenCase`, work orders) |

## Pattern status

| CAP ID | Pattern | Daemon surface | Status |
|--------|---------|------------------|--------|
| CAP-MAP-01 | Entity visualizer / COP map | `/v1/geo/map`, console `/live` | Partial |
| CAP-FILE-01 | Objects CLI | Attachment service + `role` filter | Implemented |
| CAP-INGEST-01 | Periodic position publish | `ingestion-service`, transforms, `ais-demo` | Partial |
| CAP-THUMB-01 | Entity thumbnail | `role=thumbnail` on Case/Asset | Partial |
| CAP-TASK-01 | Task an asset | Manifest actions + WorkOrder seeds | Partial |
| CAP-RECON-01 | Auto reconnaissance / proximity | `mission-tasking` pack + WorkOrder | Partial |

## Implementation rule

Study reference repos **locally**; reimplement flows via ontology writes, attachments, and governed actions. Never add third-party SDKs to `go.mod`, `package.json`, or runtime service paths.

## Cross-links

- [operational-sample-patterns-v1.md](./operational-sample-patterns-v1.md)
- [capability-pattern-index-v1.md](./capability-pattern-index-v1.md)
- [operational-platform-parity-v1.md](./operational-platform-parity-v1.md)
- [matrix-v1.md](./matrix-v1.md)
