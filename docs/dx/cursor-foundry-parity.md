# Cursor + Foundry Parity v1

How to work this repo in Cursor during Parity v1.

## Rules and docs

- `@docs/ux/operational-cockpit-flow-v1.md` — operator UX contract
- `@docs/traceability/foundry-parity-v1.md` — proof map
- `@docs/governance/assumption-register-parity-v1.md` — gated assumptions
- `.cursor/rules/39-docs-foundry.mdc` — doc index pointer

## Plans

Frozen plan snapshot (read-only): `.cursor/plans/foundry_parity_v1_428f80a3.plan.md` — do not treat as live spec; code + traceability win conflicts.

## Proof commands

```bash
make demo
E2E_FULL=1 ./scripts/e2e-smoke.sh
./scripts/prove-operational-loop.sh
go test -tags=integration ./tests/integration/ -run TestOperationalLoopHTTP
```

## MCP

Configure `aip/mcp-ontology` for `investigate_case` (read-only). Human writeback stays in console.
