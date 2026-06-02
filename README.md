# DAEMON

Industry-agnostic operational intelligence platform — **modular, Grafana-like dashboard ecosystem** built on the Ontology framework.

DAEMON ingests data, models it in an ontology, evaluates rules, executes actions, and operates cases through a pluggable dashboard platform. It serves as the **universal source of truth** for enterprise operations, with an SDK + marketplace for extensions, and bidirectional Grafana interoperability.

> **[ROADMAP.md](ROADMAP.md)** — Phased plan for dashboard engine, SDK suite, marketplace, and Grafana integration.
> **[AGENTS.md](AGENTS.md)** — Instructions for AI coding agents working on this repo.

## Vision

| Pillar                  | Description                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard platform**  | Pluggable panels, typed data sources, dashboard-as-code. Every visualization is a registered plugin.                                        |
| **SDK suite**           | `@daemon/sdk` — one import for panel, data source, action, and plugin development.                                                          |
| **Marketplace**         | Discover, install, and manage plugins. Tenant-scoped activation with version management.                                                    |
| **Grafana integration** | Bidirectional — export ontology dashboards to Grafana JSON via `@grafana/grafana-foundation-sdk`, or import Grafana dashboards into Daemon. |

## What works today (v1)

- **Ontology v2** manifest, objects, and role-gated **actions** (`OpenCase`, `RecordDecision`, …)
- **Operational loop**: signal → rules → open case (with `signalIds`) → record decision → audit trail → case read model
- **Console** case detail, decision form, audit strip (`apps/console-web`)
- **Read-only functions** (`summarizeCaseContext`)
- **HTTP APIs** with shared envelope, pagination, OpenAPI spec, and TypeScript client (`packages/sdk-ts`)

Traceability: [docs/traceability/operational-platform-parity-v1.md](docs/traceability/operational-platform-parity-v1.md). UX flow: [docs/ux/operational-cockpit-flow-v1.md](docs/ux/operational-cockpit-flow-v1.md).

## Stack

| Layer         | Technology                                        |
| ------------- | ------------------------------------------------- |
| Console       | Next.js 15 (`apps/console-web`)                   |
| Control plane | Fastify (`apps/control-plane`)                    |
| Services      | Go 1.22+ (`services/*`)                           |
| Metadata      | Postgres via **Supabase** local (Auth + RLS)      |
| Analytics     | ClickHouse (datasets)                             |
| Graph         | Neo4j 5 (optional links)                          |
| Batch         | Go CLIs (`pipelines/*`)                           |
| Agent tools   | MCP ontology server (`aip/mcp-ontology`)          |
| SDK           | TypeScript monorepo — pnpm workspaces + Turborepo |

## Prerequisites

- Docker (ClickHouse, Neo4j)
- [Supabase CLI](https://supabase.com/docs/guides/cli) for local Postgres + Auth
- Go 1.22+, Node.js 20+, `pnpm` 9.15.0

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

### TypeScript tests

```bash
# All TypeScript unit tests (15 packages)
pnpm -r test --if-present

# Coverage reports
pnpm -r test:coverage --if-present

# Full CI gate
make ci-full
```

### Control-plane (port 4000)

Requires local PostgreSQL on port 5433:

```bash
# One-time setup
initdb -D .local/pgdata --username=daemon --auth=trust
echo "port = 5433" >> .local/pgdata/postgresql.conf
echo "listen_addresses = 'localhost'" >> .local/pgdata/postgresql.conf
pg_ctl -D .local/pgdata -l .local/pgdata/logfile start
createdb -h localhost -p 5433 -U daemon daemon_control
createdb -h localhost -p 5433 -U daemon control_plane
psql -h localhost -p 5433 -U daemon -d daemon_control -f apps/control-plane/src/db/migrations/0001_initial.sql
psql -h localhost -p 5433 -U daemon -d control_plane -f apps/control-plane/src/db/migrations/0001_initial.sql

# Run tests
pnpm --filter @daemon/control-plane test

# Start server
pnpm --filter @daemon/control-plane dev
```

### AIP (agents, MCP, golden eval)

Requires **ontology-service** on `:8081` (and `:8080` / `:8084` for audit/case MCP tools).

```bash
make aip-build
export OIDC_REQUIRED=false
export EVAL_DETERMINISTIC=true   # CI parity without API keys
make aip-eval
./scripts/prove-aip-eval.sh
```

Optional: LLM gateway on `:8092` (`LLM_GATEWAY_ENABLED=true`), LangSmith (`LANGCHAIN_TRACING_V2=true` in staging). See [docs/traceability/aip-phase-2.md](docs/traceability/aip-phase-2.md).

Full stack in Docker (data stores + Go service images):

```bash
make up-apps
```

## API

| Service           | Port | Role                                  |
| ----------------- | ---- | ------------------------------------- |
| platform-api      | 8080 | `/v1/me`, audit events                |
| ontology-service  | 8081 | manifest, objects, actions, functions |
| ingestion-service | 8082 | connector jobs                        |
| rules-engine      | 8083 | rule evaluation                       |
| case-service      | 8084 | case list/detail                      |

- OpenAPI: [api/openapi-v1.yaml](api/openapi-v1.yaml)
- Contracts: [docs/api-contracts/README.md](docs/api-contracts/README.md)
- Developer reference: [docs/developer-tools/api.md](docs/developer-tools/api.md)

Authenticated calls need `Authorization: Bearer <jwt>` and `X-Tenant-Id` (default `tenant-demo`).

## Repository layout

```
apps/
├── console-web/          # Next.js 15 operator dashboard (port 3000)
├── control-plane/        # Fastify control-plane server (port 4000)
└── daemon-cli/           # Commander.js CLI

packages/
├── ontology-language/    # Core types (Zod) + YAML parser
├── ontology-engine/      # Runtime: objects, actions, audit, schema registry
├── ontology-sdk/         # OntologyClient, ObjectQueryBuilder, ActionProposer
├── ontology-contracts/   # Manifest schema, canonical object/action lists
├── ontology-functions/   # Pure functions (aggregate, summarize, match)
├── plugin-sdk/           # PluginRegistry, SkillRegistry, DynamicAgentBuilder
├── aip-agent/            # Agent orchestrator + MCP client
├── sdk-ts/               # Browser/Node HTTP API client
├── shared-types/         # Shared TS types
├── ui-kit/               # React component library
├── dashboard-engine/     # (NEW) PanelRegistry, DataSourceRegistry, DashboardBuilder
├── sdk/                  # (NEW) Unified developer SDK barrel
├── sdk-react/            # (NEW) React hooks + components
├── sdk-node/             # (NEW) Node.js middleware + utilities
└── grafana-codegen/      # (NEW) Ontology → Grafana dashboard generator

aip/
├── agent-service/        # Fastify HTTP bridge (port 3001)
├── mcp-ontology/         # MCP server exposing ontology as LLM tools
├── llm/                  # LLM gateway stub
├── agents/               # Agent definitions
├── prompts/              # System prompts
└── evals/                # Evaluation cases + fixtures

services/                 # Go microservices (8080-8084)
ontology/                 # Ontology schema files (v2 compiled, v3 source YAML)
infra/                    # Docker, migrations, k8s, terraform, helm
pipelines/                # Data pipeline CLIs
connectors/               # External data connectors
```

## Documentation

Full index: [docs/README.md](docs/README.md)

Platform master PRD: [docs/product/PRD-daemon-platform.md](docs/product/PRD-daemon-platform.md)

## License

BSD 3-Clause — see [LICENSE](LICENSE).
