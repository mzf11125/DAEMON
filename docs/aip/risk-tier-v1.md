# AI risk tier v1 (DAEMON sprint)

Educational mapping for console, rules, ontology, MCP, and agent paths. Not legal advice.

| Use case | Tier | Controls v1 |
|----------|------|-------------|
| Console read (signals/cases) | Low–Medium | OIDC + tenant JWT |
| `POST /v1/evaluate` | Medium | AuthZ tenant; SELECT-only rules SQL |
| `OpenCase` (human via UI) | Medium | `requiredRoles`; audit trail |
| MCP `ontology_list_objects` | Medium | Read-only tool; Bearer on SSE |
| LangChain agent loop | Medium | Max steps/tokens; no direct DB |
| MCP `ontology_execute_action` | Out of v1 golden path | HITL in console; eval forbids mutating tools |

## Mitigations

- Identity perimeter: tenant and roles from JWT when `OIDC_REQUIRED=true`.
- Least privilege tools: manifest + list objects only in eval golden path.
- Untrusted inputs: treat LLM and MCP JSON as untrusted; no shell/SQL from model output.

## Residual risk

- Provider outage or model drift without human review on new prompts.
- SSE MCP without network segmentation in production (rate limit v1 only).
