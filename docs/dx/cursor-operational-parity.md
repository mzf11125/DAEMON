# Cursor + operational parity v1

How to work this repo in Cursor during operational parity v1.

## Rules and docs

- `@docs/ux/operational-cockpit-flow-v1.md` — operator UX contract
- `@docs/traceability/operational-platform-parity-v1.md` — proof map
- `@docs/governance/assumption-register-parity-v1.md` — gated assumptions
- `@docs/governance/vendor-neutral-content-v1.md` — public naming policy
- `.cursor/rules/39-docs-operational.mdc` — doc index pointer

## Proof commands

```bash
make demo
E2E_FULL=1 ./scripts/e2e-smoke.sh
./scripts/prove-operational-loop.sh
./scripts/prove-sandbox-sectors.sh
go test -tags=integration ./tests/integration/ -run TestOperationalLoopHTTP
```

## MCP

Configure `aip/mcp-ontology` for `investigate_case` (read-only). Human writeback stays in console.
