# DAEMON Roadmap

## Vision

DAEMON is an industry-agnostic operational intelligence platform evolving into a **modular, Grafana-like dashboard ecosystem** built on the Ontology framework. It becomes the **universal source of truth** for enterprise data, with a pluggable SDK + marketplace for extensions.

### Three Pillars

1. **Daemon Dashboard** — A modular dashboard platform (Grafana-like) where every panel, data source, and action is a plugin following the ontology schema.

2. **Daemon SDK Suite** — A comprehensive developer toolkit enabling anyone to build panels, data sources, plugins, and connectors. Ships with CLI scaffolding, React components, Node.js middleware, and testing utilities.

3. **Daemon marketplace** — A centralized registry for discovering, installing, and managing plugins, panels, and domain packs. Audited, versioned, tenant-scoped.

### Grafana Integration

Daemon is **bidirectional with Grafana**:

- **Export**: Ontology schemas → Grafana dashboards via `@grafana/grafana-foundation-sdk`
- **Import**: Grafana dashboard JSON → Daemon dashboard definitions
- **Either platform**: Teams can use Daemon's native dashboard OR export to their existing Grafana instance

---

## Current State (v1)

**What works today:**

- Ontology v2: 9 object types, 9 link types, 9 action types via YAML schema
- Go microservices (8080-8084): platform-api, ontology-service, ingestion-service, rules-engine, case-service
- Console-web (Next.js 15, port 3000): operational cockpit with case detail, signal inbox, audit trail, decision form, live map
- TypeScript packages: ontology-language, ontology-engine, ontology-sdk, plugin-sdk, sdk-ts, aip-agent
- AIP stack: MCP ontology server, agent orchestrator, eval harness, 3 built-in plugins + 2 skills
- Quick start: `make demo` → all services + seed data
- Data stores: Postgres (Supabase), ClickHouse, Neo4j, Redis, MinIO

**Gaps to v2 platform:**
| Area | Status |
|------|--------|
| Modular dashboard engine | Not started |
| Panel registry system | Not started |
| Data source abstraction | `sdk-ts` has hardcoded endpoints, no plugin model |
| Dashboard-as-code | Not started |
| Plugin marketplace | `plugin-sdk` has registry, no marketplace UI/API |
| DaemonSDK (unified) | Scattered across 5 packages |
| UI Kit | 2 components (Badge, Card) |
| Grafana Foundation SDK integration | Not started |
| Dashboard studio (WYSIWYG) | Minimal `/studio` page exists |
| Cross-system federation | Not started |
| Graph-based data lineage | Not started |

---

## Phased Plan

### Phase 1: Dashboard Engine Foundation (Weeks 1-4)

**Goal:** Every visualization is a pluggable panel. Every ontology type is a typed data source. Dashboards are defined as code.

| #   | Task                                                                                                            | Package            | Priority |
| --- | --------------------------------------------------------------------------------------------------------------- | ------------------ | -------- |
| 1.1 | Expand `@daemon/shared-types` — add all SDK types (PanelCategory, GridPos, DataSourceRef, PluginManifest, etc.) | `shared-types`     | P0       |
| 1.2 | Expand `@daemon/ui-kit` — 25+ reusable components (Button, Table, Modal, Tabs, StatusIndicator, Timeline, etc.) | `ui-kit`           | P0       |
| 1.3 | Create `@daemon/dashboard-engine` — PanelPlugin, PanelRegistry, DataSourcePlugin, DataSourceRegistry            | `dashboard-engine` | P1       |
| 1.4 | Create built-in ontology data sources (Signal, Case, WorkOrder, Observation, Asset, Site, Party, etc.)          | `dashboard-engine` | P1       |
| 1.5 | Create built-in panels (SignalInbox, CaseList, AuditTrail, GeoMap, MetricsChart, etc.)                          | `dashboard-engine` | P1       |
| 1.6 | Create Dashboard-as-code: `DashboardDefinition`, `DashboardBuilder`, serializer/validator                       | `dashboard-engine` | P1       |
| 1.7 | Create variable system: `VariableDefinition`, resolver, interpolation ($var syntax)                             | `dashboard-engine` | P1       |
| 1.8 | Create inter-dashboard link resolver                                                                            | `dashboard-engine` | P2       |

### Phase 2: Daemon SDK Suite (Weeks 5-7)

**Goal:** One import gives developers everything they need.

| #   | Task                                                                                                                                                                    | Package      | Priority |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------- |
| 2.1 | Create `@daemon/sdk` — unified barrel re-exporting all public APIs                                                                                                      | `sdk`        | P0       |
| 2.2 | Create `@daemon/sdk-react` — React provider, hooks (useObjects, useSignals, useActions, useDashboard, etc.), components (PanelFrame, PanelGrid, DataSourcePicker, etc.) | `sdk-react`  | P0       |
| 2.3 | Create `@daemon/sdk-node` — middleware (auth, tenant, audit, rate-limit), health checks, service registration                                                           | `sdk-node`   | P1       |
| 2.4 | Expand `@daemon/plugin-sdk` — add `ActionExtension`, `PluginBundle` export/import, compatibility validation                                                             | `plugin-sdk` | P1       |
| 2.5 | Create CLI scaffolding: `daemon-cli plugin create`, `daemon-cli panel create`, `daemon-cli datasource create`                                                           | `daemon-cli` | P1       |
| 2.6 | Create testing utilities: `TestHarness`, `createTestPlugin()`, `createMockDataSource()`                                                                                 | `sdk`        | P2       |
| 2.7 | Deprecate `@daemon/sdk-ts` — re-exported by `@daemon/sdk` for backward compat                                                                                           | `sdk-ts`     | P2       |

### Phase 3: Grafana Integration (Weeks 8-9)

**Goal:** Bidirectional interoperability with the Grafana ecosystem.

| #   | Task                                                                                                                                      | Package           | Priority |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | -------- |
| 3.1 | Create `@daemon/grafana-codegen` — `DashboardGenerator` that maps ontology schemas to Grafana Foundation SDK builders                     | `grafana-codegen` | P1       |
| 3.2 | Create panel mappings: ontology type → Grafana panel type (ObjectType → Table, time-series props → TimeSeries, geo → Geomap, enum → Stat) | `grafana-codegen` | P1       |
| 3.3 | Create export pipeline: Daemon dashboard → Grafana JSON (via Foundation SDK builder)                                                      | `grafana-codegen` | P1       |
| 3.4 | Create import pipeline: Grafana JSON → suggested Daemon dashboard mapping                                                                 | `grafana-codegen` | P2       |
| 3.5 | Install Grafana skills (`grafana/gcx`, `grafana/skills`) for development assistance                                                       | —                 | P2       |
| 3.6 | Add CLI commands: `daemon-cli grafana export --dashboard <id>`, `daemon-cli grafana import <file>`                                        | `daemon-cli`      | P2       |

### Phase 4: Marketplace & Studio (Weeks 10-12)

**Goal:** Plugins are discoverable, installable, and manageable through a web UI.

| #   | Task                                                                                                  | Package            | Priority |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------ | -------- |
| 4.1 | Create marketplace API in control-plane: register, search, install, version management                | `control-plane`    | P1       |
| 4.2 | Create marketplace UI in console-web: browse, search, install, uninstall, ratings                     | `console-web`      | P1       |
| 4.3 | Add plugin sandboxing (iframes/web workers)                                                           | `sdk-react`        | P2       |
| 4.4 | Add plugin signing/verification (optional, enterprise)                                                | `plugin-sdk`       | P3       |
| 4.5 | Dashboard studio (WYSIWYG editor): drag-and-drop panel grid, config forms, variable editor, save/load | `console-web`      | P1       |
| 4.6 | Dashboard provisioning (YAML → dashboard auto-import like Grafana provisioning)                       | `dashboard-engine` | P2       |

### Phase 5: Universal Source of Truth (Weeks 13-15)

**Goal:** Daemon becomes the canonical data model for all enterprise systems.

| #   | Task                                                                                          | Package            | Priority |
| --- | --------------------------------------------------------------------------------------------- | ------------------ | -------- |
| 5.1 | Add `LinkTraversalService` to ontology-engine — traverse object graphs via link types         | `ontology-engine`  | P2       |
| 5.2 | Create `GraphPanel` — visualize object relationships                                          | `dashboard-engine` | P2       |
| 5.3 | Create `FederationDataSource` — proxy external systems (ERP, CRM, warehouse) through ontology | `dashboard-engine` | P2       |
| 5.4 | Create connector SDK — build connector → register as federated data source                    | `sdk`              | P2       |
| 5.5 | Add schema-driven form generation (`ObjectForm` auto-generated from `ObjectTypeDefinition`)   | `sdk-react`        | P2       |
| 5.6 | Add schema-driven API routes (OpenAPI → ontology sync)                                        | `sdk-node`         | P3       |

### Phase 6: Polish & Ecosystem (Weeks 16-18)

| #   | Task                                                                   |
| --- | ---------------------------------------------------------------------- |
| 6.1 | Developer documentation portal (VitePress on `developer.daemon.dev`)   |
| 6.2 | Seed marketplace with 10+ example plugins                              |
| 6.3 | Performance: panel lazy-loading, virtualized grid, query caching       |
| 6.4 | End-to-end integration tests for full pipeline                         |
| 6.5 | Release `@daemon/sdk` to npm                                           |
| 6.6 | Community contribution guide + templates                               |
| 6.7 | Production hardening (error boundaries, loading states, accessibility) |

---

## Package Map (New & Changed)

| Package                     | Action        | Purpose                                                    |
| --------------------------- | ------------- | ---------------------------------------------------------- |
| `packages/shared-types`     | **ENHANCE**   | Central type catalog for all SDK packages                  |
| `packages/ui-kit`           | **ENHANCE**   | 25+ reusable React components                              |
| `packages/dashboard-engine` | **NEW**       | Panel registry, data source abstraction, dashboard-as-code |
| `packages/sdk`              | **NEW**       | Unified developer SDK (single entry point)                 |
| `packages/sdk-react`        | **NEW**       | React hooks, providers, components                         |
| `packages/sdk-node`         | **NEW**       | Node.js middleware, health checks, service registration    |
| `packages/grafana-codegen`  | **NEW**       | Ontology → Grafana Foundation SDK code generator           |
| `packages/plugin-sdk`       | **ENHANCE**   | ActionExtension, PluginBundle, compatibility checks        |
| `packages/sdk-ts`           | **DEPRECATE** | Re-exported by `@daemon/sdk`                               |
| `apps/console-web`          | **ENHANCE**   | Dashboard studio, marketplace UI, import/export            |
| `apps/control-plane`        | **ENHANCE**   | Plugin API, marketplace API, dashboard CRUD                |
| `apps/daemon-cli`           | **ENHANCE**   | Plugin scaffolding, Grafana export/import                  |

---

## Dependency Graph (Target)

```
                        ┌─────────────────────┐
                        │   @daemon/sdk       │  unified entry point
                        │   (re-exports all)  │
                        └─────────┬───────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
  ┌───────▼───────┐   ┌───────────▼──────────┐   ┌───────▼───────┐
  │ @daemon/      │   │ @daemon/             │   │ @daemon/      │
  │ sdk-react     │   │ sdk-node             │   │ grafana-      │
  │ (hooks + UI)  │   │ (middleware)          │   │ codegen       │
  └───────┬───────┘   └───────────┬──────────┘   └───────┬───────┘
          │                       │                      │
  ┌───────▼───────────────────────▼──────────────────────▼───────┐
  │                     @daemon/dashboard-engine                │
  │    PanelRegistry  DataSourceRegistry  DashboardBuilder      │
  └───────────┬─────────────────────────────────────┬──────────┘
              │                                     │
  ┌───────────▼───────────┐             ┌───────────▼───────────┐
  │ @daemon/plugin-sdk    │             │ @daemon/ontology-sdk  │
  │ (agents + extensions) │             │ (client + queries)    │
  └───────────┬───────────┘             └───────────┬───────────┘
              │                                     │
  ┌───────────▼─────────────────────────────────────▼───────────┐
  │                 @daemon/ontology-engine                     │
  │            (runtime: objects, actions, audit)               │
  └───────────────────────────┬─────────────────────────────────┘
                              │
  ┌───────────────────────────▼─────────────────────────────────┐
  │                 @daemon/ontology-language                    │
  │            (types, YAML parser, Zod schemas)                │
  └─────────────────────────────────────────────────────────────┘
```

---

## Completed (Sprint 0 — Testing Infrastructure)

| #   | Task                                                                                                     | Status |
| --- | -------------------------------------------------------------------------------------------------------- | ------ |
| T1  | Add `vitest.config.ts` to all 16 packages                                                                | ✅     |
| T2  | Add `test`/`test:watch`/`test:coverage` scripts to all packages                                          | ✅     |
| T3  | Create `packages/testing` — shared test utilities (fixtures, mocks, matchers)                            | ✅     |
| T4  | Write tests for 7 previously untested packages (120+ tests)                                              | ✅     |
| T5  | Create `test-coverage.yml` GitHub Actions workflow                                                       | ✅     |
| T6  | Create `plugin-ci.yml` (marketplace plugin CI)                                                           | ✅     |
| T7  | Create `performance-bench.yml` (Lighthouse + bundle size)                                                | ✅     |
| T8  | Add Husky pre-commit (lint-staged) + pre-push (typecheck + test)                                         | ✅     |
| T9  | Create `grafana-daemon-plugin` — Grafana data source + panels                                            | ✅     |
| T10 | Add Makefile targets: `ts-test`, `ts-coverage`, `go-test`, `test-all`, `coverage`, `lint-all`, `ci-full` | ✅     |

---

## Milestones

| Milestone             | Target    | Key Deliverable                                                         |
| --------------------- | --------- | ----------------------------------------------------------------------- |
| M1 — Dashboard Engine | Month 1   | `dashboard-engine` with panel registry, data sources, dashboard-as-code |
| M2 — SDK Suite        | Month 2   | `@daemon/sdk` published, `sdk-react` with hooks + components            |
| M3 — Grafana Bridge   | Month 2.5 | `grafana-codegen` generating real Grafana dashboards from ontology      |
| M4 — Marketplace MVP  | Month 3   | Console-web marketplace UI, plugin install/uninstall flow               |
| M5 — Source of Truth  | Month 4   | Federation, lineage, cross-system queries                               |
| M6 — GA               | Month 5   | npm publish, docs, community plugins, production hardening              |

---

## Tracking

Status legend: `⬜` not started, `🟡` in progress, `✅` complete, `⏸️` blocked.

Current phase: **Phase 1 — Dashboard Engine Foundation**
