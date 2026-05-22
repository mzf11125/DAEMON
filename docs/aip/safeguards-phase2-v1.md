# AIP safeguards — Phase 2

Read-only agent scope for golden eval and MCP.

## Enforced in code

| Control | Location |
|---------|----------|
| Read-only MCP tool allowlist | `packages/aip-agent/src/agent.ts` (`READ_ONLY_TOOLS`) |
| Forbidden tools in eval | `aip/evals/cases/*.json` → `expect.forbiddenTools` |
| Rate limit per MCP identity | `aip/mcp-ontology/src/services.ts` |
| Max prompt / output size | `packages/aip-agent/src/limits.ts`, gateway timeout |
| Log/trace redaction | `packages/aip-agent/src/redact.ts` |
| No auto OpenCase in investigate | MCP tool copy + eval assertions |

## Policy-only (human/console)

- Risk tier sign-off before mutating MCP tools ([risk-tier-v1.md](./risk-tier-v1.md))
- LangSmith required in staging ([langsmith-observability-v1.md](./langsmith-observability-v1.md))
- Writes via Console approval flows, not agent automation

## Golden eval rules

- Cases must not call `ontology_execute_action` or `OpenCase`
- Touch `aip/prompts/**` or MCP tools → run `make aip-eval` ([eval-release-policy-v1.md](./eval-release-policy-v1.md))
