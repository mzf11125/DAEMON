# Data quality v1

| Check | Rule | On fail |
|-------|------|---------|
| Row count | `dataset_observations` ≥ 1 after pipeline | P2 re-ingest |
| Null rate | `value` present on seed rows | warning log |
| Rule signals | integration `rules_test` ≥ 1 signal | P2 rules track |

Primary enforcement: `scripts/data-health-check.sh` and `tests/integration`.
