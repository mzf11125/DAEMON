# Ontology-grounded agent (OAG) pattern v1

Maps the **ontology-grounded agent** pattern to Daemon: the agent reads typed ontology objects, proposes **Action types** with citations, and never mutates state without HITL.

## Layers

| Layer | Daemon |
|-------|--------|
| Ground truth | Postgres `ontology_objects` + Neo4j links (tenant RLS) |
| Tooling | ontology-service actions, platform-api read APIs, MCP (Range, Exa) |
| Agent | LangGraph propose → approval → `ontology_execute_action` |
| Audit | `audit_events` on Case/WorkOrder/Decision |

## Propose → HITL flow

1. Agent gathers context (`listObjects`, `investigate_case`, geo map when enabled).
2. Agent **proposes** one of allowlisted actions (`OpenCase`, `CreateWorkOrder`, `ExecuteWorkOrder`, `RecordDecision`, `EscalateSignal`).
3. Human approves in console **AgentProposalStrip** (listen-as-agent gated by `agentListenMode` feature).
4. platform-api/ontology-service executes; audit row written.

## Citations

Narratives must cite **object IDs** (`signalId`, `caseId`, `siteId`) from API responses — not invented entities.

## Non-goals

- Autonomous execution without approval when `agentListenMode` is false (default).
- RAG-only answers without ontology IDs for operational mutations.

## Related

- [`docs/governance/agent-maturation-p3-v1.md`](../governance/agent-maturation-p3-v1.md)
- [`range-mcp-investigation-v1.md`](range-mcp-investigation-v1.md)
