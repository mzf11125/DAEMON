# Capability pattern index v1

Neutral mapping of operational platform patterns to Daemon modules. Use `CAP-*` IDs in traceability and gate packets — no vendor names in git.

| ID | Pattern | Daemon module | Proof |
|----|---------|---------------|-------|
| CAP-01 | Entity visualizer (map COP) | `GET /v1/geo/map`, `apps/console-web/src/app/live` | `TestGeoMapHTTP`, `/live` |
| CAP-02 | Objects / file plane | `platform-api` attachments + MinIO | `TestAttachmentsHTTP` |
| CAP-03 | Periodic publish / upsert | `ingestion-service`, `pipelines/*` | ingestion integration tests |
| CAP-04 | Thumbnail on track | attachment link `role=thumbnail` | console preview |
| CAP-05 | Task / agent lifecycle | ontology actions + audit | `TestOperationalLoopHTTP` |
| CAP-06 | Listen-as-agent stream | agent-bridge SSE (501 until P3+) | agent-maturation doc |
| CAP-07 | Dataset medallion | ClickHouse `dataset_*` | pipeline-all |
| CAP-08 | Rules on datasets | rules-engine + RenderSQL | `rules_test.go` |
| CAP-09 | Case investigation | case-service + console | operational loop |
| CAP-10 | HITL agent propose | AIP orchestrator | `make aip-eval` |
| CAP-11 | Vertical pack | `ontology/v2/examples/packs/*` | validate-ontology |
| CAP-12 | Synthetic sandbox sector | `infra/seed/synthetic_sectors.go` | `prove-sandbox-sectors.sh` |
| CAP-13 | AIS-style position feed | `connectors/ais-demo`, pipeline-runner | ais integration |
| CAP-14 | Attachment on case | case page upload | console |
| CAP-15 | Geo on Site/Asset | ontology properties + geo API | seed + map |
| CAP-16 | Work order dispatch | `CreateWorkOrder` action | ontology actions |
| CAP-17 | Proximity / recon task | mission-tasking pack + WorkOrder seed | gate packet |
| CAP-18 | Healthcare cockpit | tenant feature flag + console | HealthcareCockpit |
| CAP-19 | Public health aggregate | public-health pack seed | sandbox test |
| CAP-20 | Humanitarian hub | humanitarian-logistics seed | sandbox test |
| CAP-21 | Finance / AML signal | aml-fintech pack | sandbox test |
| CAP-22 | Web3 intel address | web3-intel pack | sandbox test |
| CAP-23 | Digital twin read model | `docs/architecture/digital-twin-v1.md` | design |
| CAP-24 | OIDC + RLS tenant | Supabase JWT + Postgres RLS | `rls_tenant_isolation_test.go` |
| CAP-25 | Operational smoke | `scripts/e2e-smoke.sh` | CI e2e-full |
| CAP-26 | SDK client | `packages/sdk-ts` | typecheck + integration |

See also: [operational-sample-patterns-v1.md](./operational-sample-patterns-v1.md), [operational-platform-parity-v1.md](./operational-platform-parity-v1.md).
