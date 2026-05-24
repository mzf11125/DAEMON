# ADR MERGE-STRATEGY-01: DAEMON as host monorepo

**Status:** Accepted (locked)  
**Date:** 2026-05-22  
**Supersedes:** Informal two-repo split (DAEMON data plane vs daemon-system-ontology agent/control)

## Context

DAEMON (Go operational services, console, ClickHouse/Neo4j ingestion, AIP MCP bridge) and **daemon-system-ontology** (agent runtime, control plane, YAML/Zod schema tooling, plugin SDK) were developed in parallel. We need one long-term maintainable platform without duplicating production agent paths or maintaining two write APIs for ontology objects.

## Decision

**Opsi A — DAEMON is the host monorepo (locked).** Selected components are vendored from [daemon-system-ontology](https://github.com/daemon-blockint-tech/daemon-system-ontology.git) via a pinned submodule at `external/daemon-system-ontology/` and mirrored or re-exported paths:

| Path | Role |
|------|------|
| `external/daemon-system-ontology/` | Submodule pin (source of truth for upstream rev) |
| `aip/agent-service/` | Production agent runtime (from upstream `apps/agent-service`) |
| `apps/control-plane/` | Tenant registry, health, WS logs (Merge Phase 3) |
| `apps/daemon-cli/` | Operational CLI (from upstream `apps/cli`, Merge Phase 1) |
| `packages/ontology-language/`, `packages/ontology-engine/`, `packages/ontology-sdk/` | Schema + SDK (YAML/Zod source; SDK targets Go `:8081`) |

**Product HTTP for ontology objects** remains **Go `ontology-service` on `:8081`** (`GET/POST /v1/*`), not the upstream Fastify `apps/api`. The TS ontology engine is used for validation, proposals, and compile/sync — not as the sole production read/write API.

**`packages/aip-agent`** remains the **eval and orchestrator harness** until `aip/agent-service` is the default runtime (see [docs/traceability/aip-phase-2.md](../traceability/aip-phase-2.md)).

### Rejected alternatives

| Option | Summary | Why rejected |
|--------|---------|------------|
| **B — Upstream repo as sole host** | Move DAEMON Go services into daemon-system-ontology | Loses mature data plane, Operational parity loop, and existing console integration; high migration risk |
| **C — Permanent two-repo bridge** | Indefinite cross-repo HTTP without convergence | Duplicates agent/MCP/schema ownership; no single CI/release train |

## Migration phases (merge track)

| Phase | Scope | Proof |
|-------|--------|-------|
| **Merge 1** | Redis in compose; `apps/daemon-cli` import; submodule pin | `make up`, integration tests green |
| **Merge 2** | MCP bridge; `agent-service`; SDK→`:8081`; AIP Phase 2 eval | `make aip-eval`, `./scripts/prove-aip-eval.sh` |
| **Merge 3** | Control plane tenants; `/internal/health`; log stream | CP health dashboard |

Non-goals: replace Supabase with upstream test DB only; run Fastify `apps/api` and Go `:8081` as dual write paths without an adapter; big-bang deprecate Go actions before parity tests.

## Consequences

- Budget **2–4 sprints** for Go↔TypeScript boundaries (MCP bridge, `make ontology-sync`, health, tenant headers).
- CI must treat vendored TS packages with upstream-style test discipline when submodule is updated.
- Public docs use generic product names (Console, ontology-service, AIP) — no counterparty trademarks in README/commits per NDA guardrails.

## References

- [ontology-merge-research-v1.md](./ontology-merge-research-v1.md)
- [adr-d-tenant-01.md](./adr-d-tenant-01.md)
- [docs/traceability/aip-phase-2.md](../traceability/aip-phase-2.md)
- [docs/governance/daemon-maturation-gates-v1.md](../governance/daemon-maturation-gates-v1.md)
