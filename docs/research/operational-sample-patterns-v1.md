# Operational sample patterns v1

Educational mapping from common **integration patterns** to Daemon-native implementations. Patterns only — no vendor SDK or runtime dependency.

## Five cross-cutting patterns (CAP-*)

| CAP ID | Pattern | Daemon path | Proof |
|--------|---------|-------------|-------|
| CAP-OBJECT-STORE | Durable blob plane | MinIO + attachment metadata in Postgres | `TestAttachmentsHTTP` |
| CAP-OBJECT-CLI | Upload / fetch / link blobs | `POST/GET /v1/attachments*` | `prove-p3-geo.sh` (attachment smoke) |
| CAP-ENTITY-MAP | Map COP over ontology entities | `GET /v1/geo/map`; console `/live` | `TestGeoMapHTTP` |
| CAP-POSITION-INGEST | Periodic position → Asset upsert | `ingestion-service`, sim/AIS connectors | ingestion tests; sandbox geo seeds |
| CAP-PROXIMITY-TASKING | Proximity-triggered work order | `mission-tasking` pack; `CreateWorkOrder` | `TestMissionTaskingProximityAssets` |

## Thumbnail link (CAP-OBJECT-CLI extension)

Attachment links with `role=thumbnail` on Case and Asset power map sidebar and case previews. Same proof surface as CAP-OBJECT-CLI (`TestAttachmentsHTTP`, console upload).

## Implementation rule

Study external sample repos **locally** if needed; implement equivalent flows via ontology writes, attachments, and governed actions. Do not add third-party operational SDKs to `go.mod` or runtime API paths.

## Related

- [capability-pattern-index-v1.md](./capability-pattern-index-v1.md)
- [operational-pattern-parity-v1.md](../traceability/operational-pattern-parity-v1.md)
- [digital-twin-v1.md](../architecture/digital-twin-v1.md)
