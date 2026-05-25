# PR split checklist v1 (Track A1)

Use before landing express/predictive + platform waves to `main`. Do **not** mix unrelated verticals in one PR.

| PR | Scope | Key paths | Pre-merge |
|----|-------|-----------|-----------|
| **E** | CI / ruleset | `.github/workflows/ci.yml`, `scripts/apply-github-ruleset.sh`, `docs/governance/github-rulesets-v1.md` | `validate` job green on branch |
| **A** | Express + ontology + predictive | `ontology/v3/rules/express-*`, `infra/seed/express_cargo_sim.go`, CH `003`/`004`, `packages/go-common/rules`, `tests/integration/express_*`, `pipelines/features`, `pipelines/propensity-train` | `make ontology-sync`; `TestExpressCargoRulesEvaluate` |
| **B** | AIP / eval | `aip/`, `scripts/prove-aip-eval.sh` | `make aip-build`; `prove-aip-eval` |
| **D** | P3 agent bridge | `aip/agent-service`, merge-track compose, `smoke-agent-bridge.sh` | `agent-bridge-smoke` |
| **C** | Market intel (optional) | unrelated connectors/docs | isolated from A |

**Hygiene before any PR:**

- No `Neo4j-*.txt`, `clickhouse-api-key*.txt`, `.env` in git
- Run `make pre-push-gate` (or full gate when stack + AIP up)

**Exit A1:** Remote `main` required checks green per [github-rulesets-v1.md](../governance/github-rulesets-v1.md).
