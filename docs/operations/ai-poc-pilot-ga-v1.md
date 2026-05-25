# AI POC → GA path (16-month plan)

Tracks AI gates from Phase 0 through GA per master plan § Arsitektur AI.

## Phase 0 — Pilot

| Item | Artifact | Status |
|------|----------|--------|
| Eval harness | `make aip-eval`, `.github/workflows/aip-eval.yml` | ✅ wired |
| Staging bridge | `infra/helm/agent-bridge`, GitOps `apps/aip/agent-bridge.yaml` | ✅ scaffold |
| D4–D7 baseline | [agent-maturation-p3-v1.md](../governance/agent-maturation-p3-v1.md) | Operator: run 7d on staging |

## Phase 1 — Inference plane

| Item | Artifact |
|------|----------|
| Topology ADR | [adr-ai-inference-plane-v1.md](../architecture/adr-ai-inference-plane-v1.md) |
| LLM routing | [adr-llm-routing-v1.md](../architecture/adr-llm-routing-v1.md) |
| MCP governance | [adr-mcp-tool-governance-v1.md](../architecture/adr-mcp-tool-governance-v1.md) |
| LangSmith | [langsmith-observability-v1.md](../aip/langsmith-observability-v1.md) |

## Phase 4 — Maturation

- 30 consecutive days `aip-eval` green on `main`.
- P3 maturation closeout in [agent-maturation-p3-v1.md](../governance/agent-maturation-p3-v1.md).
- Agent red-team tier-2+ per [agent-red-team-v1.md](../governance/agent-red-team-v1.md) (create if missing).

## Phase 7 — GA claims

- No customer-facing autonomous agent claims until Phase 4 gates + Phase 5 pen test remediations complete.
- Hypercare: 14d elevated monitoring on `daemon-aip` namespace.
