# AIP developer sandbox v1

Local path for building and evaluating **ontology-aware agents** against the Daemon stack without cloud agent sandboxes or vendor-specific AIP products.

## Goals

- Reproduce the operational loop (signal → case → decision → optional work order) with synthetic tenant data.
- Exercise MCP tools and AIP orchestration against real Postgres/ClickHouse/MinIO — not mocks in runtime paths.
- Capture eval traces for regression (LangSmith or local JSON artifacts from `make aip-eval`).

## Prerequisites

Same stack as [developer-sandbox-v1.md](../dx/developer-sandbox-v1.md):

```bash
make up && make supabase-up && make migrate && make seed-sandbox && make up-apps
```

Tenant: `tenant-demo`. Demo analyst JWT from local Supabase.

## Agent developer workflow

1. **Seed context** — all 23 sector packs via `make seed-sandbox`; pick a `packId` gate packet under `docs/governance/sandbox-gates/`.
2. **Read capability map** — [capability-pattern-index-v1.md](../research/capability-pattern-index-v1.md) (`CAP-AGENT-DEVELOPER`, `CAP-PROCESS-MINING`).
3. **Run eval harness** — `make aip-eval` (forbidden-tool cases, propose-only paths).
4. **Traceability** — attach LangSmith run IDs or local eval output to PR evidence when changing prompts/tools.

## What is in scope

- `packages/agent-service`, AIP orchestrator routes, MCP tool schemas documented in-repo.
- Integration with platform-api (attachments, geo map, cases) via authenticated HTTP.
- HITL gates: agents propose; humans execute governed actions.

## Out of scope (v1)

- Vendor cloud agent workspaces or OAuth to third-party agent platforms.
- `agentListenMode: true` / long-poll asset listen (deferred per agent-maturation gates).
- Production model routing — use env-configured LLM endpoints only.

## Express-cargo sandbox scenario

Pack `logistics-express-cargo` includes:

- Ops console: `/express-cargo` (shipments, exceptions, shipment detail with linked signals).
- AIP eval cases: `express-cargo-triage`, `express-cargo-intake-propose` (G-EC-07), `express-cargo-sales-brief` (G-EC-08).
- Rubrics under `aip/evals/rubrics/express-cargo-*.json`.
- Deterministic intake fixtures: `aip/evals/fixtures/intake/bast-sim-001.json`.
- MCP tools: `extract_express_cargo_intake`, `propose_express_cargo_draft`, `generate_express_cargo_sales_brief`.

Run `./scripts/prove-express-cargo-sim.sh` after seed or pack changes.

### OIDC: eval stack vs console

| Surface | Typical `OIDC_REQUIRED` | Notes |
|---------|-------------------------|--------|
| `make aip-eval` / `./scripts/ensure-aip-eval-stack.sh` | `false` | Harness uses `X-Tenant-Id: tenant-demo`; faster CI parity |
| `console-web` + browser login | `true` | Supabase JWT; do not rely on tenant header spoofing |
| Integration tests | `false` | Same as eval; see [oidc-rls-verification-v1.md](../operations/oidc-rls-verification-v1.md) |

HITL intake (G-EC-09): `/express-cargo/intake` loads fixture `bast-sim-001`; approve calls Go `CreateShipmentDraft` via `@daemon/sdk`; reject records decision on `case-express-sla-001`.

## Related

- [developer-sandbox-v1.md](../dx/developer-sandbox-v1.md)
- [agent-maturation-p3-v1.md](../governance/agent-maturation-p3-v1.md)
- [operational-sample-patterns-v1.md](../research/operational-sample-patterns-v1.md)
