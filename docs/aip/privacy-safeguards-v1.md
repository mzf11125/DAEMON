# AIP privacy safeguards v1

- No customer PII in committed prompts or eval fixtures.
- MCP and ontology calls scoped by tenant id / Bearer.
- Logs must not print raw JWT or API keys.
- Tool JSON treated as untrusted in agent prompts.
- Production: DLP on outbound LLM provider calls (phase 2).

For privacy research patterns on guardrails, see org skill `privacy-research-engineer-safeguards` (reference only).
