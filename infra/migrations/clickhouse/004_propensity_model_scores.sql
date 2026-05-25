-- ML-served propensity scores (Phase 3). Populated by pipelines/propensity-train.

CREATE TABLE IF NOT EXISTS daemon.propensity_model_scores (
    asset_id String,
    label String,
    day Date,
    tenant_id String DEFAULT 'tenant-demo',
    model_version String,
    score Float64,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree ORDER BY (tenant_id, label, model_version, asset_id, day);
