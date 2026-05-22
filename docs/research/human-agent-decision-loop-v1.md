# Human–agent decision loop v1

## Model

```text
Agent (MCP read-only) → suggests context
Human (console)     → OpenCase, RecordDecision
Platform              → audit_log (actor = JWT sub)
```

## v1 tools

| Tool | Writes? |
|------|---------|
| `investigate_case` | No |
| `summarizeCaseContext` (HTTP) | No |
| `OpenCase` / `RecordDecision` | Yes — console only |

## Research hooks (R4)

- “What would make you distrust the assistant summary?”
- See [`operational-cockpit-research-plan-v1.md`](operational-cockpit-research-plan-v1.md)

## Assumptions

A-AIP-01, A-ACCESS-02 in [`assumption-register-parity-v1.md`](../governance/assumption-register-parity-v1.md).
