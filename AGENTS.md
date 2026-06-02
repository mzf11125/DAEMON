# AGENTS.md

Instructions for AI coding agents working on the DAEMON repository.

## Project overview

DAEMON is an industry-agnostic operational intelligence platform evolving into a **modular, Grafana-like dashboard ecosystem** built on an Ontology framework. It provides:

- **Ontology engine** — schema-driven data modeling (objects, links, actions) with YAML-defined types
- **Dashboard platform** — pluggable panels, typed data sources, dashboard-as-code
- **AIP stack** — LangChain agent orchestrator + MCP server for LLM-powered case analysis
- **Go microservices** — high-performance backend (platform-api, ontology-service, rules-engine, case-service, ingestion-service)
- **Plugin marketplace** — registry for panels, data sources, and action extensions

**Current focus:** Phase 1 — Dashboard Engine Foundation (see [ROADMAP.md](ROADMAP.md))

## Quick setup

```bash
# Use pnpm 9.15.0 (not 11.x — lockfile incompatible)
export PATH="$HOME/.local/bin:$PATH"
pnpm --version  # must be 9.15.0

# Install + build
pnpm install
pnpm build

# Run dev (exclude CLI since it requires arguments)
pnpm dev --filter '!@daemon/cli'
```

Console-web runs on `http://localhost:3000`. Control-plane on `:4000`, agent-service on `:3001`.

**Prerequisites:** PostgreSQL on :5432, Docker for data stores (`make demo`).

For **control-plane** (tests + server), a local PostgreSQL instance is needed on port 5433:

```bash
# Initialize (one-time)
initdb -D .local/pgdata --username=daemon --auth=trust
echo "port = 5433" >> .local/pgdata/postgresql.conf
echo "listen_addresses = 'localhost'" >> .local/pgdata/postgresql.conf
pg_ctl -D .local/pgdata -l .local/pgdata/logfile start

# Create databases + migrations
createdb -h localhost -p 5433 -U daemon daemon_control
createdb -h localhost -p 5433 -U daemon control_plane
psql -h localhost -p 5433 -U daemon -d daemon_control -f apps/control-plane/src/db/migrations/0001_initial.sql
psql -h localhost -p 5433 -U daemon -d control_plane -f apps/control-plane/src/db/migrations/0001_initial.sql

# Run tests
pnpm --filter @daemon/control-plane test

# Start server
nohup npx tsx --env-file=apps/control-plane/.env apps/control-plane/src/index.ts &
```

Stop PostgreSQL: `pg_ctl -D .local/pgdata stop`

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
├── sdk-ts/               # Browser/Node HTTP client → being replaced by @daemon/sdk
├── shared-types/         # Shared TS types
├── ui-kit/               # React components (expanding from 2 → 25+)
├── dashboard-engine/     # NEW: PanelRegistry, DataSourceRegistry, DashboardBuilder
├── sdk/                  # NEW: Unified developer SDK
├── sdk-react/            # NEW: React hooks + components
├── sdk-node/             # NEW: Node.js middleware + utilities
└── grafana-codegen/      # NEW: Ontology → Grafana dashboard generator

aip/
├── agent-service/        # Fastify HTTP bridge to Go services
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

## Build system

- **Monorepo:** pnpm workspaces + Turborepo
- **Build order:** `ontology-language` → `ontology-engine` → `ontology-sdk` → `plugin-sdk` (bottom-up via turbo `dependsOn: ["^build"]`)
- **TypeScript:** ES2022, NodeNext modules, strict mode (`tsconfig.base.json`)
- **Go:** Each service has its own `go.mod`

## Code conventions

### TypeScript

- ES modules only (`"type": "module"`)
- Barrel exports via `src/index.ts`
- Use Zod for runtime type validation
- Use Drizzle ORM for Postgres (in `ontology-engine`)
- React components: named function exports, TypeScript generics for config `P`
- Package naming: `@daemon/<name>`
- Avoid default exports (use named exports)

### Go

- Standard library + minimal dependencies
- Each service: `cmd/server/main.go` → `internal/` packages
- OpenAPI spec at `api/openapi-v1.yaml`

### General

- No comments in code unless asked (AGENTS.md instruction)
- Follow existing patterns when adding to packages
- Env vars: `.env.example` → copy to `.env` (never commit `.env`)
- Test files: `__tests__/` directory with `.test.ts`

## Key architectural decisions

| Decision                           | Rationale                                                                              |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| Hybrid Go + TypeScript             | Go for high-perf data ops, TypeScript for dashboards/plugins/SDK                       |
| Ontology schema as source of truth | Every type, link, and action is defined in YAML → drives UI, API, and validation       |
| Panel = Plugin                     | Every dashboard visualization is a registered plugin with typed config                 |
| Data source = Ontology type        | Every `ObjectType` becomes a typed `DataSourcePlugin`                                  |
| HITL by default                    | Actions with `requiresApproval: true` create Redis proposals → human approves          |
| Multi-tenant                       | All queries include `tenantId`, isolated per tenant                                    |
| Dashboard-as-code                  | Dashboards are `DashboardDefinition` objects, serializable to JSON, version-controlled |
| Grafana bidirectional              | Export to Grafana JSON via Foundation SDK; import Grafana JSON → Daemon                |

## Common tasks

### Run dev (full stack)

```bash
pnpm dev --filter '!@daemon/cli'
```

### Build everything

```bash
pnpm build
```

### Typecheck

```bash
pnpm typecheck
```

### Lint

```bash
pnpm lint
```

### Run tests for a package

```bash
pnpm --filter @daemon/ontology-engine test
pnpm --filter @daemon/plugin-sdk test
```

### Add a new panel plugin

```typescript
import { PanelPlugin, PanelBuilder } from "@daemon/dashboard-engine";

const myPanel: PanelPlugin<{ showCount: boolean }> = {
  id: "my-panel",
  name: "My Panel",
  category: "custom",
  configSchema: z.object({ showCount: z.boolean().default(true) }),
  defaultSize: { w: 6, h: 4 },
  component: ({ config, datasource, variables, timeRange }) => {
    // React component using useDataSource(datasource)
  },
};

panelRegistry.register(myPanel);
```

### Add a new data source

```typescript
import { DataSourcePlugin } from '@daemon/dashboard-engine';

const signalDs: DataSourcePlugin<{ severity?: string }> = {
  id: 'signal',
  name: 'Signals',
  objectType: 'Signal',
  querySchema: z.object({ severity: z.string().optional() }),
  async query(params) {
    const signals = await client.listSignals({ ...params.query, ...params.pagination });
    return { fields: [...], rows: signals.items, meta: signals.meta };
  },
  async metadata() { return { fields: [...], primaryKey: 'signalId' }; },
  async testConnection() { return { ok: true, message: 'connected' }; },
};

dataSourceRegistry.register(signalDs);
```

### Create a dashboard from code

```typescript
import { DashboardBuilder } from "@daemon/dashboard-engine";

const dashboard = new DashboardBuilder("Signal Monitor")
  .withVariable("severity", {
    name: "severity",
    label: "Severity",
    type: "query",
    datasource: { type: "ontology", uid: "Signal" },
    query: { field: "severity" },
  })
  .withPanel(
    new PanelBuilder("signal-inbox")
      .title("Active Signals")
      .datasource({ type: "ontology", uid: "Signal" })
      .config({ severity: "$severity" })
      .gridPos({ x: 0, y: 0, w: 12, h: 6 }),
  )
  .build();
```

### Export to Grafana

```typescript
import { DashboardGenerator } from "@daemon/grafana-codegen";

const generator = new DashboardGenerator({ grafanaVersion: "11.0" });
const dashboards = await generator.fromManifest(manifest);
console.log(JSON.stringify(dashboards[0].json, null, 2));
```

## Testing

- **All packages** now have `vitest.config.ts` and `test`/`test:coverage` scripts
- Unit tests: `vitest` (TypeScript packages) — run with `pnpm -r test --if-present`
- Integration tests: Docker stack (`make test-integration`)
- E2E smoke: `./scripts/e2e-smoke.sh`
- Operational loop: `./scripts/prove-operational-loop.sh`
- AIP evals: `make aip-eval` (needs `EVAL_DETERMINISTIC=true` for CI)
- Shared test utilities: `@daemon/testing` (fixtures, mocks, matchers)
- Pre-commit: Husky + lint-staged (format TS/TSX/Go/YAML/JSON/MD)
- Pre-push: typecheck + test
- CI: `.github/workflows/test-coverage.yml`, `plugin-ci.yml`, `performance-bench.yml`
- Makefile targets: `ts-test`, `ts-coverage`, `go-test`, `test-all`, `coverage`, `lint-all`, `ci-full`

### Test patterns per package type

| Package        | Environment | Test directory                      | Framework                           |
| -------------- | ----------- | ----------------------------------- | ----------------------------------- |
| Node packages  | `node`      | `__tests__/` or `src/**/__tests__/` | Vitest 1.6                          |
| React packages | `jsdom`     | `__tests__/`                        | Vitest 1.6 + @testing-library/react |
| Go services    | —           | `*_test.go`                         | standard `testing` + testify        |
| Integration    | —           | `tests/integration/`                | testcontainers-go                   |

## Package conventions

When creating a new package:

1. `package.json`: `"name": "@daemon/<name>"`, `"type": "module"`, add `"build": "tsc"`
2. `tsconfig.json`: extends `../../tsconfig.base.json`
3. `src/index.ts`: barrel export of public API
4. Add to `pnpm-workspace.yaml` if not auto-detected
5. Add `allowBuilds` config in `pnpm-workspace.yaml` for any native deps
6. Update `turbo.json` if build outputs differ from `dist/**`

## Dependencies to know

- `@langchain/core` + `@langchain/openai` — agent orchestrator LLM integration
- `@modelcontextprotocol/sdk` — MCP server/client for agent-ontology communication
- `commander` — CLI framework (daemon-cli)
- `fastify` — HTTP server (control-plane, agent-service)
- `drizzle-orm` + `pg` — Postgres ORM (ontology-engine)
- `ioredis` — Redis client (caching, proposals, pub/sub)
- `zod` — Schema validation everywhere
- `@grafana/grafana-foundation-sdk` — Grafana dashboard code generation (new)

## Current active work

> See [ROADMAP.md](ROADMAP.md) for the full phased plan.

**Phase 1 — Dashboard Engine Foundation (in progress):**

- [ ] `packages/dashboard-engine` — PanelRegistry, DataSourceRegistry, DashboardBuilder
- [ ] `packages/sdk` — Unified developer SDK barrel
- [ ] `packages/sdk-react` — React hooks and components
- [ ] `packages/shared-types` — Expanded type catalog
- [ ] `packages/ui-kit` — Expanded component library
