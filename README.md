# DAEMON

Industry-agnostic operational intelligence platform: ingest data, model it in an ontology, evaluate rules, execute actions, and operate cases through a web cockpit.

The default domain is **enterprise operations** (manufacturing, logistics, healthcare ops, energy, and similar). Optional vertical packs live under `ontology/v2/examples/packs/`. Architecture follows Foundry-style patterns (data plane, ontology, applications, observability) without requiring a single vendor stack.

## What works today (v1 parity)

- **Ontology v2** manifest, objects, and role-gated **actions** (`OpenCase`, `RecordDecision`, …)
- **Operational loop**: signal → rules → open case (with `signalIds`) → record decision → audit trail → case read model
- **Console** case detail, decision form, audit strip (`apps/console-web`)
- **Read-only functions** (`summarizeCaseContext`)
- **HTTP APIs** with shared envelope, pagination, OpenAPI spec, and TypeScript client (`packages/sdk-ts`)

Traceability: [docs/traceability/foundry-parity-v1.md](docs/traceability/foundry-parity-v1.md). UX flow: [docs/ux/operational-cockpit-flow-v1.md](docs/ux/operational-cockpit-flow-v1.md).

## Stack

| Layer | Technology |
|-------|------------|
| Console | Next.js (`apps/console-web`) |
| Services | Go 1.22+ (`services/*`) |
| Metadata | Postgres via **Supabase** local (Auth + RLS) |
| Analytics | ClickHouse (datasets) |
| Graph | Neo4j 5 (optional links) |
| Batch | Go CLIs (`pipelines/*`) |
| Agent tools | MCP ontology server (`aip/mcp-ontology`) |

## Prerequisites

- Docker (ClickHouse, Neo4j)
- [Supabase CLI](https://supabase.com/docs/guides/cli) for local Postgres + Auth
- Go 1.22+, Node.js 20+, `pnpm`

## Quick start

Run all commands from the **repository root** (not `apps/console-web`).

```bash
cp .env.example .env
make demo                    # up + supabase + migrate + seed + pipelines
./scripts/supabase-seed-auth.sh   # demo users (analyst@demo.local / analyst)
```

Start services (separate terminals):

```bash
make run-platform-api      # :8080
make run-ontology-service  # :8081
make run-ingestion-service # :8082
make run-rules-engine      # :8083
make run-case-service      # :8084
pnpm --filter @daemon/console-web dev
```

Console: http://localhost:3000 — sign in with seeded analyst credentials; tenant `tenant-demo`.

### Smoke and proof scripts

```bash
chmod +x scripts/e2e-smoke.sh scripts/prove-operational-loop.sh
./scripts/e2e-smoke.sh              # health, manifest, seed, rules, CH counts
./scripts/prove-operational-loop.sh # OpenCase → decision → audit (needs services + auth)
```

Strict loop assertions (CI-style):

```bash
E2E_FULL=1 ./scripts/e2e-smoke.sh
```

Integration tests (Docker + stack; from repo root):

```bash
make test-integration
```

Full stack in Docker (data stores + Go service images):

```bash
make up-apps
```

## API

| Service | Port | Role |
|---------|------|------|
| platform-api | 8080 | `/v1/me`, audit events |
| ontology-service | 8081 | manifest, objects, actions, functions |
| ingestion-service | 8082 | connector jobs |
| rules-engine | 8083 | rule evaluation |
| case-service | 8084 | case list/detail |

- OpenAPI: [api/openapi-v1.yaml](api/openapi-v1.yaml)
- Contracts: [docs/api-contracts/README.md](docs/api-contracts/README.md)
- Developer reference: [docs/developer-tools/api.md](docs/developer-tools/api.md)

Authenticated calls need `Authorization: Bearer <jwt>` and `X-Tenant-Id` (default `tenant-demo`).

## Repository layout

| Path | Purpose |
|------|---------|
| `apps/console-web` | Operator UI |
| `services/*` | Go HTTP services |
| `packages/go-common` | Shared auth, HTTP, DB helpers |
| `packages/sdk-ts` | Browser/Node API client |
| `ontology/v2` | Manifests, types, sector packs |
| `pipelines/*` | Raw → transform → features → quality |
| `infra/` | Docker Compose, migrations, seed |
| `supabase/` | Local Supabase config |
| `scripts/` | Smoke, auth seed, ontology validation |
| `tests/integration` | HTTP integration tests |
| `docs/` | Architecture, governance, integrations |

More detail: [CONTRIBUTING.md](CONTRIBUTING.md), [docs/developer-tools/repo-layout.md](docs/developer-tools/repo-layout.md).

## Documentation

Full index: [docs/README.md](docs/README.md)

## License

BSD 3-Clause — see [LICENSE](LICENSE).
