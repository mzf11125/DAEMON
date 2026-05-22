# Repository layout

Top-level directories and how they connect.

| Path | Role |
|------|------|
| `apps/console-web` | Next.js operator UI (signals, cases) |
| `services/*` | Go HTTP APIs (`platform-api`, `ontology-service`, `rules-engine`, `case-service`, `ingestion-service`) |
| `packages/go-common` | Shared config, HTTP envelope, DB clients |
| `packages/sdk-ts` | Browser/Node client for platform APIs |
| `packages/ontology-contracts` | TypeScript types aligned to ontology v2 |
| `packages/ontology-functions` | Reference implementations for ontology functions |
| `packages/ui-kit` | Lightweight React primitives for console-web |
| `ontology/v2` | Canonical ontology manifest and JSON definitions |
| `interfaces/ontology` | Cross-cutting interfaces |
| `pipelines/*` | Batch/stream processing CLIs |
| `infra/docker` | Local Postgres, ClickHouse, Neo4j |
| `infra/migrations` | SQL bootstrap for PG and CH |
| `infra/seed` | Demo tenant, objects, links, datasets |
| `connectors/` | Sample source files and connector notes |
| `observability/` | Data-health checks and lineage stubs |
| `aip/` | Agent/eval scaffolding |
| `docs/` | Architecture and developer documentation |
| `scripts/` | CI helpers (`validate-ontology`, `check-no-stub-handlers`) |

## Local workflow

```bash
make up && make migrate && make seed && make pipeline-all
make run-platform-api          # :8080
make run-ontology-service      # :8081
make run-rules-engine          # :8083
make run-case-service          # :8084
make run-ingestion-service     # :8082
pnpm --filter @daemon/console-web dev
```

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and [api.md](./api.md).
