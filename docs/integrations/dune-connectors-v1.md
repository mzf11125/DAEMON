# Dune ingestion connectors v1

Production ingestion for **Sim** (`sim-dune`) and **Dune Analytics SQL** (`dune-sql`) into `daemon.raw_observations`, then the existing transforms → features → quality chain.

## Three layers

| Layer | Purpose | DAEMON v1 |
|-------|---------|-----------|
| **A — Agent tooling** | Explore data, write SQL, dashboards | Dune CLI, [duneanalytics/skills](https://github.com/duneanalytics/skills), optional [Dune MCP](https://api.dune.com/mcp/v1) |
| **B — Production ingest** | Tenant-scoped jobs → ClickHouse bronze | `sim-dune`, `dune-sql` via `POST /v1/jobs` |
| **C — AIP runtime** | Analyst tools during cases | `mcp-ontology` + optional Dune MCP; does not replace B |

Layer B is the authoritative path for rules engine input and lineage. Agents must not write directly to ClickHouse in v1.

## Connectors

### `sim-dune`

- **API:** `https://api.sim.dune.com` (override `SIM_API_BASE_URL`)
- **Auth:** `SIM_API_KEY` → header `X-Sim-Api-Key` (env only, never in job body)
- **Params:** `addresses`, `chain_ids` (EVM), `svm_chain` (default `solana`), `sources` (`balances`, `activity`, `transactions`), `limit_per_address` (max 1000)

Example:

```json
{
  "connector": "sim-dune",
  "params": {
    "addresses": ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"],
    "chain_ids": [1, 8453],
    "svm_chain": "solana",
    "sources": ["balances", "activity"],
    "limit_per_address": 100
  }
}
```

### `dune-sql`

- **API:** `https://api.dune.com/api/v1` (override `DUNE_API_BASE_URL`)
- **Auth:** `DUNE_API_KEY` → header `X-Dune-Api-Key`
- **Modes:** `query_id` (saved query) or `execute_sql` (ad-hoc SQL with partition heuristic on large tables)
- **Params:** `column_map` required (maps result columns to bronze fields)

## Layer A onboarding (developers)

See **[dune-agent-tooling-v1.md](./dune-agent-tooling-v1.md)** for CLI install, `duneanalytics/skills` (`dune` + `sim`), official MCP (`https://api.dune.com/mcp/v1`), and Cursor configuration.

Quick check: `make dune-dev-setup` then `./scripts/dune-smoke-cli.sh` when the CLI is installed.

## Operations

- [RB-DUNE-01](../operations/runbooks/RB-DUNE-01.md) — Sim CU, 429, unsupported `chain_ids`
- [RB-DUNE-02](../operations/runbooks/RB-DUNE-02.md) — Dune query failures, credits, partition filters

## Compliance

Connector output is normalized observations for analytics and rules — not a sanctions verdict. Use Chainalysis or official lists for compliance decisions.
