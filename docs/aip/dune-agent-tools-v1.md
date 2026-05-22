# Dune agent tools v1 (AIP)

When an analyst or agent needs chain data, pick the right layer:

| Need | Use | Do not |
|------|-----|--------|
| Manifest objects, OpenCase, policy actions | `mcp-ontology` | Put API keys in prompts |
| Ad-hoc wallet lookup, SQL exploration, dashboard design | Dune MCP or CLI/skills (Layer A) | Write to ClickHouse directly |
| Durable observations for rules / cases | `POST /v1/jobs` with `sim-dune` or `dune-sql` (Layer B) | Paste secrets into job `params` |

## Prompt hygiene

- Never include `SIM_API_KEY` or `DUNE_API_KEY` in chat, case notes, or agent transcripts.
- Prefer triggering ingestion jobs with addresses already in tenant ontology when populating rule inputs.
- For sanctions questions, use dedicated screening flows — Sim/Dune ingest is not a compliance verdict.

## Optional Cursor setup

Layer A setup (CLI, skills, MCP): [dune-agent-tooling-v1.md](../integrations/dune-agent-tooling-v1.md).

See [dune-connectors-v1.md](../integrations/dune-connectors-v1.md) for connector params and [dune-docs-index.md](../integrations/dune-docs-index.md) for API links.
