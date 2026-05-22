# Model card: triage-analyst (v1)

| Field | Value |
|-------|--------|
| Agent id | `triage-analyst` |
| Prompt version | `aip/prompts/triage-analyst/v1/` |
| Providers | OpenRouter, Ollama, LM Studio (via env) |
| Default model | `openai/gpt-4o-mini` (OpenRouter id) |
| Temperature | 0 |

## Intended use

Read-only listing of ontology `Signal` objects for analyst triage. No automated case creation.

## Limitations

- No guaranteed factual grounding beyond MCP tool JSON.
- English-only prompts in v1.
- Eval covers one golden case (`triage-list-signals`).

## Data boundaries

- No PII in committed prompts.
- Tool calls scoped by `TENANT_ID` / Bearer token.
- Do not paste production secrets into prompts or eval fixtures.

## Eval slice

- Case: `aip/evals/cases/triage-list-signals.json`
- Command: `make aip-eval` (requires ontology service)
