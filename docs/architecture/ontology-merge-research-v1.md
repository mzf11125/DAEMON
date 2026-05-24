# Ontology merge research v1

**Date:** 2026-05-22 (R0 pipeline update)  
**Host:** [DAEMON](https://github.com/daemon-blockint-tech/DAEMON.git) (ADR MERGE-STRATEGY-01)  
**Upstream pin:** [daemon-system-ontology](https://github.com/daemon-blockint-tech/daemon-system-ontology.git) at `external/daemon-system-ontology` (subtree or submodule per branch)

## R0 authoring vs runtime layout

| Path | Role |
|------|------|
| `ontology/v3/` | **Authoring** — flat `*.object-type.yaml`, `*.link-type.yaml`, `*.action-type.yaml`, `manifest.yaml`, plus JSON `functions/`, `rules/`, `fixtures/` |
| `ontology/v2/` | **Legacy JSON** — retained for enrichment (`implements`, `backingDataset`, `string[]` action params) during compile; sector packs unchanged |
| `ontology/v2-compiled/` | **Runtime** — generated JSON consumed by Go services (gitignored; CI runs `make ontology-sync`) |
| `packages/ontology-language` | Vendored from upstream `packages/ontology-language` (`@daemon/ontology-language`) |

## Compile pipeline

```bash
pnpm ontology:port-v3      # optional: regenerate v3 from v2 JSON
pnpm --filter @daemon/ontology-language build
pnpm ontology:compile      # v3 YAML → ontology/v2-compiled/
make ontology-sync           # compile + validate
make ontology-validate     # validate v2-compiled only (after sync)
```

Scripts:

- `scripts/ontology-v3-port.ts` — one-shot v2 JSON → v3 YAML
- `scripts/compile-schemas.ts` — ontology-language parse + v2-compatible JSON emit
- `scripts/ontology-sync.sh` — build package, compile, `validate-ontology.sh`

## Component map

| Capability | DAEMON today | Upstream (vendored target) | Phase 2 boundary |
|------------|--------------|----------------------------|------------------|
| Ontology CRUD API | `services/ontology-service` `:8081` | `apps/api` (Fastify) | **Keep Go**; SDK points to `:8081` |
| Object schema source | `ontology/v3` → `v2-compiled` | `packages/ontology-language` | `make ontology-sync` |
| Agent runtime | `packages/aip-agent` (eval) | `apps/agent-service` | MCP bridge + eval smoke |
| MCP tools | `aip/mcp-ontology` | plugin-sdk patterns | HTTP to Go services |
| Control plane | (planned) | `apps/control-plane` | Merge Phase 3 |
| CLI | — | `apps/cli` → `apps/daemon-cli` | Merge Phase 1 placeholder |
| Analytics plugins | ClickHouse pipelines | `analytics/core` | Map to CH in Merge 2 |
| Monitoring plugins | rules-engine | `monitoring/core` | Health/rules reads |
| Console | `apps/console-web` | — | DAEMON-owned UX |

## Production-readiness scorecard (qualitative)

| Area | DAEMON | Notes |
|------|--------|-------|
| Data plane / RLS | Strong | Postgres + tenant middleware |
| Operational loop | Strong | Operational parity v1 path |
| Agent production | Maturing | Phase 2: eval green + MCP ≥6 read tools |
| Schema single source | Improving | v3 YAML + compile to v2-compiled |
| Control plane | Early | Vendored in Phase 3 |

## Three integration boundaries

1. **HTTP contract** — `/v1/objects/*`, `/v1/ontology/v2/manifest`, functions; JWT/`X-Tenant-Id` (manifest path name unchanged).
2. **Schema** — `ontology/v3` ↔ `@daemon/ontology-language` ↔ `ontology/v2-compiled` for Go runtime.
3. **Agent** — MCP stdio/SSE for IDE; `agent-service` for long-running runs (Merge 2).

## Parity script

```bash
./scripts/prove-aip-eval.sh          # AIP golden + ontology health
make platform-check                  # operational loop
make ontology-sync                   # compile v3 → v2-compiled + validate
make demo                            # includes ontology-sync
```

## Naming (UX)

Use **DAEMON**, **Console**, **ontology-service**, **AIP**, **control plane** — not upstream repo abbreviations in product copy.

## Decisions locked

- [adr-merge-strategy-01.md](./adr-merge-strategy-01.md)
- [adr-d-tenant-01.md](./adr-d-tenant-01.md)

## Defer

- Mutating MCP `ontology_execute_action` — see [docs/aip/mutating-mcp-defer-v1.md](../aip/mutating-mcp-defer-v1.md)
- Full monorepo of upstream `apps/api` — rejected for production path
- Sector packs as YAML — still JSON under `ontology/v2/examples/packs/`
