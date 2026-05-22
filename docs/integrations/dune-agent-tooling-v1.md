# Dune agent tooling v1 (Layer A)

Layer A is for **exploration and ad-hoc analysis** — CLI, Agent Skills, and MCP. It does **not** replace production ingest (`sim-dune` / `dune-sql`). See [dune-connectors-v1.md](./dune-connectors-v1.md) for Layer B and [dune-agent-tools-v1.md](../aip/dune-agent-tools-v1.md) for AIP routing.

**Documentation index:** [dune-docs-index.md](./dune-docs-index.md) (curated links). Machine-readable full index: [https://docs.dune.com/llms.txt](https://docs.dune.com/llms.txt). Sim-specific docs: [https://docs.sim.dune.com](https://docs.sim.dune.com).

## Prerequisites

- A Dune account with API access
- `DUNE_API_KEY` for Analytics API, CLI, and official MCP (same key family per [Dune docs](https://docs.dune.com/api-reference/overview/authentication.md))
- `SIM_API_KEY` for Sim realtime APIs (production `sim-dune` connector uses this in service env only)

Never commit API keys. Store in shell env, `~/.config/dune/config.yaml` (CLI), or Cursor secret env — not in git, job `params`, or console `localStorage`.

## 1. Dune CLI

Install and authenticate ([CLI & Skills](https://docs.dune.com/api-reference/agents/cli-and-skills.md)):

```bash
curl -sSfL https://dune.com/cli/install.sh | sh
export DUNE_API_KEY="your-key"   # or: dune auth
dune query run-sql --sql "SELECT 1 AS ok" -o json
```

DAEMON helpers:

```bash
make dune-dev-setup          # prints install reminders
./scripts/dune-smoke-cli.sh  # requires CLI + DUNE_API_KEY
```

## 2. Agent Skills (`duneanalytics/skills`)

Upstream repo: [github.com/duneanalytics/skills](https://github.com/duneanalytics/skills)

| Skill | Use for |
|-------|---------|
| `dune` | Dataset search, DuneSQL, `dune query run-sql`, partition/cost guidance |
| `sim` | Realtime wallet/token lookups (aligns with `sim-dune` connector semantics) |

**Install (recommended):**

```bash
npx skills add duneanalytics/skills
```

**Cursor — remote rule (no copy):**

1. Cursor → **Settings → Rules → Remote Rule (GitHub)**
2. Add repository: `duneanalytics/skills`

**Cursor — project-local copy (optional):**

```bash
# From repo root; skills land under .cursor/skills/ per upstream layout
git clone --depth 1 https://github.com/duneanalytics/skills.git /tmp/dune-skills
cp -R /tmp/dune-skills/skills/dune /tmp/dune-skills/skills/sim .cursor/skills/
```

Do not commit `.cursor/skills/dune` or `.cursor/skills/sim` if they contain local overrides with secrets.

## 3. Official Dune MCP (Cursor / Codex)

Docs: [MCP](https://docs.dune.com/api-reference/agents/mcp.md). Remote endpoint:

```text
https://api.dune.com/mcp/v1
```

Header: `x-dune-api-key: <DUNE_API_KEY>` (or OAuth where your IDE supports it).

**Example merge into `.cursor/mcp.json`** (see also [cursor-mcp-dune.example.json](./cursor-mcp-dune.example.json)):

```json
{
  "mcpServers": {
    "dune-official": {
      "url": "https://api.dune.com/mcp/v1",
      "headers": {
        "x-dune-api-key": "REPLACE_WITH_ENV_OR_SECRET_STORE"
      }
    }
  }
}
```

Prefer setting the key via your IDE’s secret/env mechanism rather than committing it in `mcp.json`.

**Coexistence with `user-dune` MCP:** If you already use a Dune MCP in Cursor (e.g. `user-dune`), you can keep it until migrated. For new setups, prefer the official remote MCP above. Production ingest (Layer B) does not use MCP — it uses `packages/dune-ingest` HTTP clients.

**Long-running queries:** `getExecutionResults` and similar tools may exceed default ~60s MCP timeouts. Increase the client tool timeout in Cursor/Codex settings when polling large executions (see Dune MCP troubleshooting in their docs).

## 4. Mapping skills to DAEMON connectors

| Layer A (explore) | Layer B (ingest job) |
|-------------------|----------------------|
| `sim` skill / Sim API docs | `connector: "sim-dune"` + `params.addresses`, `chain_ids`, `sources` |
| `dune` skill / `dune query run-sql` | `connector: "dune-sql"` + `mode: "execute_sql"` or `query_id` + `column_map` |

After a SQL or Sim exploration looks correct, promote to a saved query or job params and trigger `POST /v1/jobs` — do not paste API keys into the job body.

## 5. Related docs

- [dune-connectors-v1.md](./dune-connectors-v1.md) — connector params, env vars, runbooks
- [adr-dune-ingestion-v1.md](../architecture/adr-dune-ingestion-v1.md) — architecture (Layers A/B/C)
- [env-contract.md](../developer-tools/env-contract.md) — `SIM_API_KEY`, `DUNE_API_KEY`
