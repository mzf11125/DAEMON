# Agent maturation P3 (production agent tier)

Platform GA (P2) does **not** require this tier. See [daemon-maturation-gates-v1.md](./daemon-maturation-gates-v1.md).

## Criteria (all required)

| # | Criterion | Proof |
|---|-----------|--------|
| 1 | `aip/agent-service` deployable with stable route to ontology `:8081` | `docker compose --profile merge-track` + `./scripts/smoke-agent-bridge.sh` |
| 2 | Plugin remap verified in **runtime** (not README-only) | `./scripts/prove-plugin-remap.sh`; `TestExpressCargoRulesEvaluate` |
| 3 | Eval baseline green **7 days**, flake &lt; 10% | `EVAL_RECORD_BASELINE=true make aip-eval` on `main`; CI `aip-eval` history |
| 4 | Mutating MCP remains deferred | [mutating-mcp-defer-v1.md](../aip/mutating-mcp-defer-v1.md); actions via Go `POST /v1/actions/*` only |

## Commands

```bash
make aip-build && ./scripts/prove-aip-eval.sh
make agent-bridge-smoke
./scripts/prove-plugin-remap.sh
./scripts/check-maturation-policy.sh
```

## 7-day eval baseline monitoring (2026-05-23 start)

| Day | CI `aip-eval` | Notes |
|-----|---------------|-------|
| D0 (2026-05-23) | Local 8/8 after `ensure-aip-eval-stack.sh` | Baseline not bumped; watch remote flake |
| D1 (2026-05-24) | [`26370438725`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26370438725) success (PR #5 merge) | 8/8; flake 0% on window so far |
| D2–D7 | Track GitHub Actions `aip-eval` on `main` | Target flake &lt; 10%; bump [aip/evals/baseline.json](../../aip/evals/baseline.json) only after review |

Prior failures on `main` (2026-05-22–23) pre–wave0 land; do not count toward P3 window after PR #5 merge baseline.

Bridge + plugin remap evidence: weekly on staging per [plugin-remap-v1.md](../aip/plugin-remap-v1.md); local D1 pass logged below.

## Explicitly not P3 yet

- Full `ontology-sdk` + built `ontology-engine` as primary write path (violates MERGE-STRATEGY-01)
- `ontology_execute_action` MCP tool without sign-off
- Marketing "production autonomous agent" before eval stability window
- **Listen-as-agent** task SSE/WebSocket stream (`p3-listen-as-agent`) — deferred until merge-track smoke green 7d and eval baseline stable; agents remain PROPOSE-only with human `executeAction`
