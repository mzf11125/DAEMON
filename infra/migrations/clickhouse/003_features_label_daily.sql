-- Label-grain gold features for baseline-relative rules (express routing propensity).

CREATE TABLE IF NOT EXISTS daemon.features_label_daily (
    asset_id String,
    label String,
    day Date,
    tenant_id String DEFAULT 'tenant-demo',
    observation_count UInt64,
    avg_value Float64,
    max_value Float64,
    stddev_value Float64
) ENGINE = MergeTree ORDER BY (tenant_id, label, asset_id, day);
