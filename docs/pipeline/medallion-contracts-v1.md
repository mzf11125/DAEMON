# Medallion contracts v1

| Layer | Table | Owner pipeline | Grain |
|-------|-------|----------------|-------|
| Bronze | `daemon.raw_observations` | raw-ingest / seed-csv | observation_id |
| Silver | `daemon.dataset_observations` | transforms (runner) | observation_id + tenant_id |
| Gold | `daemon.features_asset_daily` | features | asset_id, day |
| Gold | `daemon.features_label_daily` | features | asset_id, label, day, tenant_id |
| Gold | `daemon.propensity_model_scores` | propensity-train | asset_id, label, day, tenant_id, model_version |

Express predictive labels in `features_label_daily`: `routing_cost_variance`, `tier_a_daily_volume` (ec-sm-011 volume trend rule).

## Contracts

- Bronze → Silver: 1:1 row map on ingest; `tenant_id` from `TENANT_ID` env.
- Silver must have `value`, `observed_at`, `asset_id` for rules SQL.
- Quality checks: `observability/checks/*.json` min row counts.

## Lineage

Postgres `lineage_events` records connector runs from ingestion-service.
