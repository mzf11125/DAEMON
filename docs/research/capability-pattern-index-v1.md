# Capability pattern index v1

Neutral capability catalog for research and onboarding. Maps **26 `CAP-*` IDs** to Daemon modules and proof artifacts. No vendor names or third-party URLs.

## Vertical / offering patterns (7)

| ID | Pattern | Daemon module | Proof status |
|----|---------|---------------|--------------|
| CAP-DIGITAL-TWIN | Operational mirror (Site/Asset/Observation + live read model) | `GET /v1/geo/map`, console `/live`; [digital-twin-v1.md](../architecture/digital-twin-v1.md) | Partial — map + seed |
| CAP-RETAIL-OPS | Retail store / fulfillment vertical | Pack `retail-ops`; `synthetic_sectors.go` | `TestSandboxSectorsSeeded/retail-ops` |
| CAP-RAIL-NETWORK | Rail corridor / node vertical | Pack `rail-network` | `TestSandboxSectorsSeeded/rail-network` |
| CAP-FIELD-TASKING | Field work order dispatch | Ontology `CreateWorkOrder`; `mission-tasking` pack | Partial — proximity seed |
| CAP-TELECOM-OPS | Telecom site / outage vertical | Pack `telecom-ops` | `TestSandboxSectorsSeeded/telecom-ops` |
| CAP-CONSTRUCTION-OPS | Construction site vertical | Pack `construction-ops` | `TestSandboxSectorsSeeded/construction-ops` |
| CAP-ENERGY-UTILITIES | Grid / outage vertical | Pack `energy-utilities` | `TestSandboxSectorsSeeded/energy-utilities` |

## Platform patterns (12)

| ID | Pattern | Daemon module | Proof status |
|----|---------|---------------|--------------|
| CAP-AGENT-DEVELOPER | Agent developer path (local sandbox, eval traces) | `docs/aip/developer-sandbox-v1.md`; AIP orchestrator | `make aip-eval` |
| CAP-DATA-INTEGRATION | Batch ETL / dataset plane | pipelines + ClickHouse `dataset_*` | `make pipeline-all`; ingestion tests |
| CAP-PIPELINE-BUILDER | Medallion transforms | `pipelines/transforms`, `features`, `quality` | pipeline integration |
| CAP-RULES-ENGINE | Tenant-scoped SQL rules | `services/rules-engine` | `rules_test.go` |
| CAP-STREAMING | Streaming ingest (positions, events) | `ingestion-service`, sim connectors | ingestion integration tests |
| CAP-PROCESS-MINING | Audit / decision trail | case-service audit + ontology actions | `TestOperationalLoopHTTP` |
| CAP-DYNAMIC-SCHEDULING | Optimizer-driven scheduling | — | **Defer** |
| CAP-MARKETPLACE | Connector / pack registry | `ontology/v2/examples/packs/*`, `connectors/synthetic/*` | `validate-ontology`; drift check |
| CAP-EDGE-AI | Edge inference hook | — | **Defer** (no Jetson artifacts) |
| CAP-SATELLITE-INGEST | Satellite / raster stub | connector placeholders in packs | Partial — design only |
| CAP-DEFER-A | Reserved platform slot A | — | **Defer** |
| CAP-DEFER-B | Reserved platform slot B | — | **Defer** |

## Operational integration patterns (7)

| ID | Pattern | Daemon module | Proof status |
|----|---------|---------------|--------------|
| CAP-OBJECT-STORE | Blob storage backend | MinIO + platform-api attachments | `TestAttachmentsHTTP` |
| CAP-OBJECT-CLI | Upload / list / metadata API | `POST/GET /v1/attachments*` | `TestAttachmentsHTTP`; `prove-p3-geo.sh` |
| CAP-ENTITY-MAP | Geo entity map read model | `GET /v1/geo/map`; console `/live` | `TestGeoMapHTTP`; `prove-p3-geo.sh` |
| CAP-POSITION-INGEST | Periodic position → entity upsert | `ingestion-service`, `ais-demo`, sim feeds | ingestion + sandbox seeds |
| CAP-PROXIMITY-TASKING | Proximity recon / task queue | `mission-tasking` pack; WorkOrder seed | `TestMissionTaskingProximityAssets` |
| CAP-EXTERNAL-SDK-REFERENCE | Study external samples locally; no runtime import | Pattern docs only | Enforced — no third-party SDK in `go.mod` |
| CAP-EDGE-OS-DEFER | Edge OS / NixOS deploy | — | **Defer** |

## Related

- [operational-sample-patterns-v1.md](./operational-sample-patterns-v1.md) — five cross-cutting integration patterns
- [operational-platform-parity-v1.md](../traceability/operational-platform-parity-v1.md)
- [enterprise-data-parity-v1.md](../data-integration/enterprise-data-parity-v1.md)
- [developer-sandbox-v1.md](../dx/developer-sandbox-v1.md)
