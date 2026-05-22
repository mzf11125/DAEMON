# AIP roadmap

## Phase 2 (current)

| Item | Status |
|------|--------|
| LLM gateway (`aip/llm`) | Shipped |
| MCP read tools (6) + semver `0.2.0` | Shipped |
| Eval harness + CI | Shipped — `make aip-eval`, `./scripts/prove-aip-eval.sh` |
| Agent loop + orchestrator CLI | Shipped — `packages/aip-agent` |
| LangSmith hooks | Optional via `LANGCHAIN_TRACING_V2` |
| Mutating MCP | Deferred — [mutating-mcp-defer-v1.md](./mutating-mcp-defer-v1.md) |
| Production agent-service | Merge Phase 2 pin — [aip/agent-service/README.md](../../aip/agent-service/README.md) |

Traceability: [docs/traceability/aip-phase-2.md](../traceability/aip-phase-2.md).
