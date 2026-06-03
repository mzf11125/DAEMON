# Works in Progress

> Last updated: 2026-06-02

## ⬜ Pending — Do Not Forget

_No pending items._

| Task                                                                                                                                        | Date       |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Testing infrastructure — vitest.config.ts on all 16 packages                                                                                | 2026-06-02 |
| Test scripts (test, test:watch, test:coverage) on all packages                                                                              | 2026-06-02 |
| Write tests for 7 previously untested packages (120+ tests)                                                                                 | 2026-06-02 |
| Create `packages/testing` — shared test utilities                                                                                           | 2026-06-02 |
| CI/CD workflows: test-coverage.yml, plugin-ci.yml, performance-bench.yml                                                                    | 2026-06-02 |
| Husky pre-commit (lint-staged) + pre-push (typecheck + test)                                                                                | 2026-06-02 |
| Grafana plugin scaffold (`grafana-daemon-plugin/`)                                                                                          | 2026-06-02 |
| ROADMAP.md, AGENTS.md, docs/\*/overview.md                                                                                                  | 2026-06-02 |
| Makefile targets: ts-test, ts-coverage, go-test, test-all, coverage, lint-all, ci-full, ws-status                                           | 2026-06-02 |
| PostgreSQL setup for control-plane (port 5433, 3 databases)                                                                                 | 2026-06-02 |
| Control-plane server running on port 4000                                                                                                   | 2026-06-02 |
| ontology-engine: Created `objects`, `action_audit_log`, `schema_overrides`, `tenant_schemas` tables in `daemon_test` — all 14 tests passing | 2026-06-03 |
| console-web: Removed stray `/home/zidan/pnpm-lock.yaml` — no more lockfile root warning                                                     | 2026-06-03 |
| pnpm version pinning: Added `preinstall` check + `.npmrc` package-manager-strict + documented in AGENTS.md                                  | 2026-06-03 |
| Created `grafana-development` branch from upstream/main                                                                               | 2026-06-03 |
| Merged all local work into grafana-development (1227+ files)                                                                          | 2026-06-03 |
| Fixed @daemon/cli naming conflict (renamed upstream to @daemon/config-cli)                                                             | 2026-06-03 |
| All 21 test suites passing on grafana-development branch                                                                              | 2026-06-03 |
| Pushed grafana-development to mzf11125/DAEMON                                                                                         | 2026-06-03 |

---

## 🟡 In Progress — Phase 1: Dashboard Engine Foundation

| #   | Task                                                                                    | Package            | Status |
| --- | --------------------------------------------------------------------------------------- | ------------------ | ------ |
| 1.1 | Expand `@daemon/shared-types` — SDK type catalog                                        | `shared-types`     | ⬜     |
| 1.2 | Expand `@daemon/ui-kit` — 25+ components                                                | `ui-kit`           | ⬜     |
| 1.3 | Create `@daemon/dashboard-engine` — PanelRegistry, DataSourceRegistry, DashboardBuilder | `dashboard-engine` | ⬜     |
| 1.4 | Create built-in ontology data sources                                                   | `dashboard-engine` | ⬜     |
| 1.5 | Create built-in panels                                                                  | `dashboard-engine` | ⬜     |
| 1.6 | Dashboard-as-code: DashboardDefinition, DashboardBuilder                                | `dashboard-engine` | ⬜     |
| 1.7 | Variable system                                                                         | `dashboard-engine` | ⬜     |

---

## 🔜 Next

- [ ] Create PR from `mzf11125:grafana-development` → `daemon-blockint-tech:main`
- [ ] Expand `@daemon/shared-types` with full SDK type catalog
- [ ] Expand `@daemon/ui-kit` with 25+ components
- [ ] Create `@daemon/dashboard-engine` package

---

## Infrastructure Notes

**PostgreSQL (local, port 5433):**

```bash
# Start
pg_ctl -D .local/pgdata -l .local/pgdata/logfile start
# Stop
pg_ctl -D .local/pgdata stop
# Status
pg_isready -h localhost -p 5433
```

**Databases created:**

- `control_plane` — control-plane API
- `daemon_control` — control-plane test suite
- `daemon_test` — ontology-engine integration tests

**Running services:**

- Control-plane: `http://localhost:4000` (started via `nohup npx tsx --env-file=apps/control-plane/.env apps/control-plane/src/index.ts &`)

**Correct pnpm:** `export PATH="$HOME/.local/bin:$PATH"`
