# ADR: Dune Sim + Analytics SQL ingestion v1

## Status

Accepted

## Context

DAEMON ingests observations into ClickHouse bronze (`raw_observations`) via `ingestion-service` and `pipeline-runner`. Only `seed-csv` existed. Product needs multi-chain wallet data (Sim) and batch SQL (Dune Analytics) without exposing API keys to clients.

## Decision

1. Add Postgres `ingestion_jobs.params JSONB` and validate connector params at job creation.
2. Implement `packages/dune-ingest` with subpackages `sim`, `analytics`, `bronze`, `ingestparams` (avoids import cycles).
3. Connectors `sim-dune` and `dune-sql` load bronze, then run existing transforms/features/quality.
4. Deterministic `observation_id` via SHA-256 hash of connector, chain, event, asset, label.
5. Secrets only in env: `SIM_API_KEY`, `DUNE_API_KEY`.
6. Document three layers: agent tooling (CLI/MCP/skills), production ingest (Go), AIP runtime (ontology + optional Dune MCP). Layer A guide: [dune-agent-tooling-v1.md](../integrations/dune-agent-tooling-v1.md).

## Consequences

- **Positive:** Reuses medallion pipeline; multi-chain via explicit `chain_ids`; idempotent re-runs.
- **Negative:** API cost and rate limits are operator concerns; live tests gated behind `DUNE_LIVE_TEST=1`.
- **Neutral:** Supabase migration ordering independent; Keycloak auth unchanged.

## Alternatives considered

- MCP-only ingest — rejected; no tenant lineage or repeatable job model.
- Single combined connector — rejected; Sim and SQL have different cost/latency profiles.
