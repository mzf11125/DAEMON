# Predictive cold-start policy v1 (express)

Rules that compare today's observations to a **7-day label baseline** (`features_label_daily`) require history before firing with meaningful confidence.

## Minimum baseline window

| Rule | Label | Min prior days | Behavior when cold |
|------|-------|----------------|---------------------|
| `express-routing-propensity` | `express_routing_variance_pct` | 7 calendar days before today | No match when baseline row missing; z-score uses `nullIf(baseline_std, 0)` → propensity 0 |
| `express-volume-trend-anomaly` | `tier_a_daily_volume` | 7 prior days with `baseline_avg > 0` | No match when baseline missing |
| `express-routing-propensity-ml` | `express_routing_variance_pct` | Features + train job run | Falls back operationally to z-score rule when scores absent |

## Demo tenant contract (`tenant-demo`)

Seed [`infra/seed/express_cargo_sim.go`](../../infra/seed/express_cargo_sim.go) loads **6 prior days** of baseline observations plus **today's spike** so local prove and integration tests always pass without waiting a week.

## Production guidance

1. Run `pipelines/features` daily after silver ingest so `features_label_daily` is current.
2. Alert when `baseline_std = 0` for 3+ consecutive days (flat baseline — review ingest or label mapping).
3. Do not lower propensity thresholds during cold-start; add seed/backfill for new assets instead.
4. Document go-live date per asset; suppress customer-facing propensity alerts until day 8 unless manual override.

## Related

- [predictive-roadmap-v1.md](./predictive-roadmap-v1.md)
- [medallion-contracts-v1.md](../pipeline/medallion-contracts-v1.md)
