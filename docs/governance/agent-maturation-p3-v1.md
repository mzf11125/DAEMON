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
| D2 (2026-05-24) | [`26373421913`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26373421913) success (PR #6 merge) | Agent-bridge volume + aip-eval path filters; 8/8 |
| D3 (2026-05-25) | Local `TestExpressCargoRulesEvaluate` pass (6 express rules) + `make ontology-sync`; CI `aip-eval` run `26381422101` | 0% flake per window; awaiting next merge-track PR to count D4 |
| D4–D7 | Track GitHub Actions `aip-eval` on `main` (`.github/workflows/aip-eval.yml`) | Target flake &lt; 10%; operator records daily green in table below; bump [aip/evals/baseline.json](../../aip/evals/baseline.json) only after review |

| Day | `aip-eval` run | Flake? | Notes |
|-----|----------------|--------|-------|
| D4 | _pending operator_ | — | Staging/prod URL gates in Phase 0 |
| D5 | _pending_ | — | |
| D6 | _pending_ | — | |
| D7 | _pending_ | — | |

Prior failures on `main` (2026-05-22–23) pre–wave0 land; **do not count** toward the P3 7-day window (baseline starts at PR #5 merge [`26370438725`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26370438725)).

### Phase 4 — 30-day eval window extension (production plan)

The locked **16-month production plan** extends the P3 observation from **7 days** to **30 consecutive calendar days** before GA agent claims. Until that window closes:

| Window | Minimum | Flake cap | Baseline bump |
|--------|---------|-----------|---------------|
| P3 closeout (this doc) | 7 green days on `main` (`aip-eval`) | &lt; 10% | Per [eval-release-policy-v1.md](../aip/eval-release-policy-v1.md) |
| **Phase 4 (GA agent)** | **30 green days** on `main` | &lt; 5% recommended | Requires compliance + security sign-off in [production-readiness-v1.md](../operations/production-readiness-v1.md) |

**Extension procedure:** do not reset the 7-day counter when extending to 30 days — continue the same `main` baseline epoch (post PR #5). If `aip-eval` regresses, restart the **30-day** window from the first green day after fix. Track daily rows in this table (D0–D30) or link CI run URLs in [p1-staging-pilot-closeout-v1.md](../operations/p1-staging-pilot-closeout-v1.md).

| Run | Commit message | Root cause (summary) |
|-----|----------------|---------------------|
| [`26287772825`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26287772825) | Complete AIP merge track… | Pre–Gate 0 CI stack (eval harness / services not green) |
| [`26293542140`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26293542140) | fix(ci): Gate 0… | `permission denied for table ontology_objects` (RLS / grants before migration 005) |
| [`26327694521`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26327694521) | fix(ci): Gate 1 L1–L3… | Same era; fixed in wave0 / PR #5 |
| [`26327719806`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26327719806) | docs(traceability): Gate 1 L3… | Same era; fixed in wave0 / PR #5 |

**Current `main` (post PR #5):** last two `aip-eval` runs success — [`26347907971`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26347907971), [`26370438725`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26370438725). Refresh with `gh run list --workflow=aip-eval.yml --branch=main --limit=10`.

Bridge + plugin remap evidence: weekly on staging per [plugin-remap-v1.md](../aip/plugin-remap-v1.md); local D1 pass logged below.

## Track C closeout evidence (optional P3)

| Criterion | Local evidence (2026-05-25) | Staging evidence (pending P0.3) |
|-----------|------------------------------|----------------------------------|
| Eval 7d flake &lt; 10% | D0–D3 in table above; 0% flake | Continue `gh run list --workflow=aip-eval.yml --branch=main` |
| Agent bridge → :8081 | `make agent-bridge-smoke` when merge-track profile up | Weekly on staging URLs |
| Plugin remap runtime | `./scripts/prove-plugin-remap.sh` exit 0 | Same script against staging ontology base URL |
| Mutating MCP deferred | [mutating-mcp-defer-v1.md](../aip/mutating-mcp-defer-v1.md) unchanged | ARB sign-off before any enable |

**Staging bridge/plugin transcript template:** after P0.3, run:

```bash
export ONTOLOGY_SERVICE_URL=https://ontology.staging.example.com
./scripts/smoke-agent-bridge.sh 2>&1 | tee artifacts/staging-bridge-$(date +%Y%m%d).log
./scripts/prove-plugin-remap.sh 2>&1 | tee artifacts/staging-plugin-remap-$(date +%Y%m%d).log
```

Store logs under `artifacts/` (gitignored) or attach to [p1-staging-pilot-closeout-v1.md](../operations/p1-staging-pilot-closeout-v1.md).

## Explicitly not P3 yet

- Full `ontology-sdk` + built `ontology-engine` as primary write path (violates MERGE-STRATEGY-01)
- `ontology_execute_action` MCP tool without sign-off
- Marketing "production autonomous agent" before eval stability window
- **Listen-as-agent** task SSE/WebSocket stream (`p3-listen-as-agent`) — deferred until merge-track smoke green 7d and eval baseline stable; agents remain PROPOSE-only with human `executeAction`
