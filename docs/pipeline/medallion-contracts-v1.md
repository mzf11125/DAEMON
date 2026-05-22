# Medallion contracts v1

| Layer | Table | Owner pipeline | Grain |
|-------|-------|----------------|-------|
| Bronze | `daemon.raw_observations` | raw-ingest / seed-csv | observation_id |
| Silver | `daemon.dataset_observations` | transforms (runner) | observation_id + tenant_id |
| Gold | `daemon.features_asset_daily` | features | asset_id, day |

## Contracts

- Bronze → Silver: 1:1 row map on ingest; `tenant_id` from `TENANT_ID` env.
- Silver must have `value`, `observed_at`, `asset_id` for rules SQL.
- Quality checks: `observability/checks/*.json` min row counts.

## Lineage

Postgres `lineage_events` records connector runs from ingestion-service.
