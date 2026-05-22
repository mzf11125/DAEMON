# Data architecture v1 (ADR)

## Status

Accepted for sprint demo.

## Context

DAEMON uses polyglot persistence: Postgres (control), ClickHouse (analytics), Neo4j (graph). Batch pipelines run via `pipeline-runner` and Makefile targets.

## Decision

Keep medallion-lite in ClickHouse (`raw_observations` → `dataset_observations` → `features_asset_daily`) with Postgres for jobs, lineage, rules audit, and ontology object cache.

Reject for v1: dbt-only warehouse, Airflow, single DynamoDB/Mongo primary store (see `nosql-alternatives-v1.md`).

## Consequences

- Rules SQL runs on ClickHouse with tenant column (migration 002).
- Full reload transform acceptable for demo; watermarking deferred.
- RLS on Postgres deferred to migration 003 post-OIDC hardening.

## Revisit

Quarterly or when multi-tenant production SLAs are defined.
