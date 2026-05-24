# AIP Phase 2 traceability

**Status:** Implemented (baseline recording optional via `EVAL_RECORD_BASELINE=true`)  
**Related:** [Operational parity v1](./operational-parity-v1.md), [AIP roadmap](../aip/roadmap.md)

## Capabilities delivered

| ID | Capability | Proof |
|----|------------|-------|
| P2-1 | Multi-case golden eval | `aip/evals/cases/*.json`, `packages/aip-agent/src/eval.ts` |
| P2-2 | MCP read tools (6) | `aip/mcp-ontology` semver `0.2.0` |
| P2-3 | LLM gateway | `aip/llm`, `LLM_GATEWAY_URL` |
| P2-4 | Agent loop + prompts | `packages/aip-agent/src/agent.ts`, `aip/prompts/triage-analyst/v1/` |
| P2-5 | Orchestrator CLI | `pnpm --filter @daemon/aip-agent orchestrator` |
| P2-6 | Observability hooks | `LANGCHAIN_TRACING_V2`, `aip/evals/runs/` |
| P2-7 | Safeguards | `docs/aip/safeguards-phase2-v1.md`, `limits.ts`, `redact.ts` |
| P2-8 | CI eval job | `.github/workflows/aip-eval.yml` |
| P2-9 | Merge ADRs + research | `docs/architecture/adr-*.md`, `ontology-merge-research-v1.md` |
| P2-10 | `/internal/health` | `packages/go-common/http/health.go` on Go services |

## Proof commands (repo root)

```bash
make aip-build
# ontology :8081 (+ platform :8080, case :8084 for audit/get_case cases)
export OIDC_REQUIRED=false
export EVAL_DETERMINISTIC=true
make aip-eval
./scripts/prove-aip-eval.sh
```

Record first green:

```bash
EVAL_RECORD_BASELINE=true make aip-eval
```

Then remove `continue-on-error` from CI (already removed in Phase 2 workflow).

## Mutating tools

**Not in Phase 2 completion.** Checklist: [mutating-mcp-defer-v1.md](../aip/mutating-mcp-defer-v1.md).

## Merge placeholders

| Path | Phase |
|------|-------|
| `aip/agent-service/` | 2 |
| `apps/control-plane/` | 3 |
| `apps/daemon-cli/` | 1 |
| `external/daemon-system-ontology/` | pin |
| `packages/ontology-language/` | schema bridge |
