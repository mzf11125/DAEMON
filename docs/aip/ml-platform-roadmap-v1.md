# AIP ML platform roadmap v1

Sprint delivers **agent loop + MCP + eval**, not full ML platform.

| Capability | v1 | Phase 2 |
|------------|----|---------|
| LLM routing | env-based OpenRouter/Ollama | gateway service |
| Safeguards | prompt limits, read-only tools | `ml-infrastructure-engineer-safeguards` patterns |
| Eval | golden case harness | CI gate + baseline |
| Observability | optional LangSmith | mandatory traces in staging |
| Model registry | none | versioned prompts + MCP semver |

See `docs/aip/privacy-safeguards-v1.md` for PII handling.
