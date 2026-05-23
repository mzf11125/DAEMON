# Agent maturation P3 (production agent tier)

Platform GA (P2) does **not** require this tier. See [daemon-maturation-gates-v1.md](./daemon-maturation-gates-v1.md).

## Criteria (all required)

| # | Criterion | Proof |
|---|-----------|--------|
| 1 | `aip/agent-service` deployable with stable route to ontology `:8081` | `docker compose --profile merge-track` + `./scripts/smoke-agent-bridge.sh` |
| 2 | Plugin remap verified in **runtime** (not README-only) | Integration tests or staging smoke for analytics → CH, monitoring → rules-engine |
| 3 | Eval baseline green **7 days**, flake &lt; 10% | `EVAL_RECORD_BASELINE=true make aip-eval` on `main`; CI `aip-eval` history |
| 4 | Mutating MCP remains deferred | [mutating-mcp-defer-v1.md](../aip/mutating-mcp-defer-v1.md); actions via Go `POST /v1/actions/*` only |

## Commands

```bash
make aip-build && ./scripts/prove-aip-eval.sh
make agent-bridge-smoke
./scripts/check-maturation-policy.sh
```

## Explicitly not P3 yet

- Full `ontology-sdk` + built `ontology-engine` as primary write path (violates MERGE-STRATEGY-01)
- `ontology_execute_action` MCP tool without sign-off
- Marketing "production autonomous agent" before eval stability window
