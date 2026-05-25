# Predictive ML Phase 3 v1 (express routing propensity)

Post-P2 optional maturity: model-served scores with **documented fallback** to z-score rule `express-routing-propensity`.

## Components

| Piece | Path |
|-------|------|
| Score store | `daemon.propensity_model_scores` ([004 migration](../../infra/migrations/clickhouse/004_propensity_model_scores.sql)) |
| Training batch | `pipelines/propensity-train` (`make train-propensity-express`) |
| Model-served rule | `express-routing-propensity-ml.json` (`confidenceMethod`: `model_logistic_v1`) |
| Baseline fallback | Keep `express-routing-propensity` enabled; ML rule skipped when no score row |

## Training

```bash
make pipeline-all          # or features only after observations
make train-propensity-express
```

Writes `model_version=express-routing-logistic-v1` scores for today's routing observations using tanh(z-score) when `baseline_std > 0`.

## Backtest

```bash
./scripts/backtest-propensity-express.sh
```

Compares signal counts from z-score vs ML rules on seeded demo tenant (integration harness).

## Governance

- Bump `model_version` when retraining; never overwrite artifact in place without change control.
- Model card: input = 7d label baseline features; output = 0–1 score; known limitation = cold-start same as Phase 2.
- Production: if train job fails, z-score rule remains authoritative.
