# Daemon mapping

## Postgres and Neo4j

Postgres is the system of record for ontology objects, cases, and ingestion jobs. Neo4j receives best-effort link writes (for example `RecordObservation` creates an `OBSERVED` edge). There is no distributed transaction across Postgres and Neo4j in the scaffold hardening sprint—failures on the graph side are logged but do not roll back relational writes.

## Ingestion and pipelines

`ingestion-service` runs the same ClickHouse pipeline chain as `make pipeline-all` when a job uses the `seed-csv` connector. Jobs are tenant-scoped on read; pipeline execution uses shared `packages/pipeline-runner` logic.

## Testing

Integration tests use testcontainers for Postgres, ClickHouse, and Neo4j. They validate seed counts, rules evaluation, and ingestion job completion without requiring manually started services.
