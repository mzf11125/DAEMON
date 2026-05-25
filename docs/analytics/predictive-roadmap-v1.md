# Predictive analytics roadmap v1

Foundations (shipped):

- ClickHouse `features_asset_daily` and `features_label_daily` for aggregates.
- Postgres signals/cases for labels.

Phase 2 (complete):

- Label-grain gold features (`features_label_daily`) populated by `pipelines/features`.
- Baseline-relative propensity rule `express-routing-propensity` (z-score vs 7-day label baseline, confidence on Signal properties).
- Volume trend rule `express-volume-trend-anomaly` (ec-sm-011, 7-day drop vs baseline, `confidenceMethod: volume_drop_baseline_7d`).
- Cold-start guidance: [predictive-cold-start-v1.md](./predictive-cold-start-v1.md).

Phase 3 (optional scaffold):

- ML score store `propensity_model_scores`, train pipeline `pipelines/propensity-train`, rule `express-routing-propensity-ml` with heuristic fallback.
- See [predictive-ml-phase3-v1.md](./predictive-ml-phase3-v1.md) and `make backtest-propensity-express`.
