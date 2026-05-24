# Traceability — operational platform parity v1

| Requirement | Implementation | Proof |
|-------------|----------------|-------|
| OpenCase links signals | `case_signals` + validation in ontology-service | `TestOperationalLoopHTTP`, `E2E_FULL` in e2e-smoke |
| Read audit | `GET /v1/audit/events` platform-api | e2e-smoke audit count ≥ 2 |
| Case read model | case-service `signalIds` | integration test + console |
| Console loop | `/cases/[caseId]` | manual + e2e |
| Summarize context | `POST /v1/functions/summarizeCaseContext` | e2e-smoke |
| Pack framework | `examples/packs/*/manifest.json` + manifest `packs` | validate-ontology |
| Sector stubs | vertical packs under `ontology/v2/examples/packs/` | manifest GET |
| Pack framework doc | `docs/lifecycle/pack-framework-v1.md` | loader merges `packs` in manifest GET |
| UX spec | `docs/ux/operational-cockpit-flow-v1.md` | UX-AC-01–06 |
| Assumption register | `docs/governance/assumption-register-parity-v1.md` | review before pilot |
| Agent read path | MCP `investigate_case` + AIP Phase 2 eval/orchestrator | [aip-phase-2.md](./aip-phase-2.md), `aip/mcp-ontology`, `make aip-eval` |
| CI full loop | `.github/workflows/ci.yml` `e2e-full` | `E2E_FULL=1` |
| API contracts v1 | OpenAPI, pagination, 422 validation, error `requestId` | `api/openapi-v1.yaml`, `packages/go-common/http/*_test.go` |
| Geo map read model | `GET /v1/geo/map` platform-api | `TestGeoMapHTTP`, `/live` console |
| Attachments plane | `POST/GET /v1/attachments*` + MinIO | `TestAttachmentsHTTP` |
| Thumbnail on resource | attachment link `role=thumbnail` | console case/asset preview |
| Sandbox sectors (22) | `infra/seed/synthetic_sectors.go` + gate packets | `prove-sandbox-sectors.sh` |

Run: `./scripts/prove-operational-loop.sh` (local stack required).

Docs index: [`docs/dx/cursor-operational-parity.md`](../dx/cursor-operational-parity.md).
