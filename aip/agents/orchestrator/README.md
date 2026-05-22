# Orchestrator

Phase 2 orchestration runs via **`packages/aip-agent`**:

```bash
make aip-orchestrator
# or
pnpm --filter @daemon/aip-agent orchestrator -- --case triage-list-signals
```

Environment: `AGENT_MAX_STEPS`, `PROMPT_VERSION`, `ORCHESTRATOR_MESSAGE`, `LLM_GATEWAY_ENABLED`.

Long-running production orchestration moves to **`aip/agent-service`** after Merge Phase 2.
