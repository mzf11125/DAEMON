# Ontology merge research v1

**Date:** 2026-05-22  
**Host:** [DAEMON](https://github.com/daemon-blockint-tech/DAEMON.git) (ADR MERGE-STRATEGY-01)  
**Upstream pin:** [daemon-system-ontology](https://github.com/daemon-blockint-tech/daemon-system-ontology.git)

## Component map

| Capability | DAEMON today | Upstream (vendored target) | Phase 2 boundary |
|------------|--------------|----------------------------|------------------|
| Ontology CRUD API | `services/ontology-service` `:8081` | `apps/api` (Fastify) | **Keep Go**; SDK points to `:8081` |
| Object schema source | `ontology/v2/*.yaml` | `packages/ontology-language` | `make ontology-sync` pilot |
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
| Operational loop | Strong | Foundry parity v1 path |
| Agent production | Maturing | Phase 2: eval green + MCP ≥6 read tools |
| Schema single source | Partial | YAML in repo; TS compile TBD |
| Control plane | Early | Vendored in Phase 3 |

## Three integration boundaries

1. **HTTP contract** — `/v1/objects/*`, `/v1/ontology/v2/manifest`, functions; JWT/`X-Tenant-Id`.
2. **Schema** — `ontology/v2` artifacts ↔ ontology-language YAML (`scripts/ontology-sync.sh`).
3. **Agent** — MCP stdio/SSE for IDE; `agent-service` for long-running runs (Merge 2).

## Parity script

```bash
./scripts/prove-aip-eval.sh          # AIP golden + ontology health
make platform-check                # operational loop
./scripts/ontology-sync.sh         # schema validate
```

## Naming (UX)

Use **DAEMON**, **Console**, **ontology-service**, **AIP**, **control plane** — not upstream repo abbreviations in product copy.

## Decisions locked

- [adr-merge-strategy-01.md](./adr-merge-strategy-01.md)
- [adr-d-tenant-01.md](./adr-d-tenant-01.md)

## Defer

- Mutating MCP `ontology_execute_action` — see [docs/aip/mutating-mcp-defer-v1.md](../aip/mutating-mcp-defer-v1.md)
- Full monorepo of upstream `apps/api` — rejected for production path
