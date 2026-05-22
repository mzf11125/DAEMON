# ADR D-TENANT-01: Multi-tenant DAEMON

**Status:** Accepted (locked)  
**Date:** 2026-05-22  
**Related:** [ADR MERGE-STRATEGY-01](./adr-merge-strategy-01.md), assumption A-ARCH-04 in [assumption-register-parity-v1.md](../governance/assumption-register-parity-v1.md)

## Context

Console, Go services, Postgres (Supabase), and AIP MCP tools must isolate customer data in one SaaS-style deployment. Upstream **daemon-system-ontology** historically assumed **single-tenant per deployment** with a control-plane tenant registry; DAEMON uses **`tenant_id`** with Postgres row-level security (RLS).

## Decision

**Multi-tenant DAEMON is the canonical product model.**

| Layer | Mechanism |
|-------|-----------|
| **Identity of tenant** | `tenant_id` string (demo: `tenant-demo`) |
| **HTTP** | Header `X-Tenant-Id` on platform-api, ontology-service, case-service, and MCP→Go calls |
| **Auth (when OIDC on)** | JWT claims mapped to `tenant_id` before DB access; `OIDC_REQUIRED=false` only for local dev |
| **Postgres** | RLS via `db.WithRLSTx` and session variable `app.tenant_id` |
| **MCP / eval** | Default `TENANT_ID=tenant-demo` for golden runs; no cross-tenant reads in Phase 2 tools |

### Vendored SDK mapping (integration boundary)

When **ontology-sdk** or control-plane code from daemon-system-ontology is configured in DAEMON:

| Upstream field / concept | DAEMON canonical |
|--------------------------|------------------|
| `legalEntityId` | `tenant_id` |
| Control-plane `tenantId` (registry row) | `tenant_id` (one registry row per customer tenant) |
| Per-customer dedicated deployment (upstream default) | **Not** mixed in one SaaS cluster; use explicit **on-prem single-tenant profile** if offered later |

Every SDK and agent HTTP call must set `X-Tenant-Id` (or equivalent middleware) before hitting `:8081` / `:8080`.

## Consequences

- **Merge Phase 3** owns tenant registry in vendored `apps/control-plane`; MCP does not duplicate registry logic.
- Phase 2 MCP tools are **read-only** and **tenant-scoped from header only** — no tool parameter to override tenant.
- On-prem or air-gapped **single-tenant profile** is a future stack profile (env + adapter), not a silent downgrade of SaaS RLS.

## References

- [ontology-merge-research-v1.md](./ontology-merge-research-v1.md)
- `packages/go-common/http/middleware.go` (tenant middleware)
- [docs/traceability/aip-phase-2.md](../traceability/aip-phase-2.md)
