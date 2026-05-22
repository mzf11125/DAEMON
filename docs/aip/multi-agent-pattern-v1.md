# Multi-agent pattern v1

v1 uses **skills + single agent + MCP tools**. No LangGraph, Deep Agents sandboxes, or programmatic tool calling (PTC).

- Read-only ontology access via `ontology_list_objects` and `ontology_manifest` MCP tools.
- Case mutations (`OpenCase`) are console-only in v1.
- Eval suite: `pnpm --filter @daemon/aip-agent eval` with LangSmith optional (`LANGCHAIN_TRACING_V2`).

## Phase 2 criteria (defer)

Adopt LangGraph custom workflow or subagents only when **all** are true:

1. Golden eval flake rate &lt; 10% for 7 days with baseline recorded.
2. More than three MCP tools in production agent path.
3. Human-in-the-loop OpenCase must remain outside automated eval.
4. Documented risk tier review for any mutating MCP tool.

Until then, keep imperative loop in `packages/aip-agent` with `AGENT_MAX_STEPS` cap.
