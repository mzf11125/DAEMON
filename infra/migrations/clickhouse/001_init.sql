CREATE DATABASE IF NOT EXISTS daemon;

CREATE TABLE IF NOT EXISTS daemon.raw_observations (
    observation_id String,
    asset_id String,
    label String,
    value Float64,
    unit String,
    observed_at DateTime64(3),
    ingested_at DateTime64(3) DEFAULT now64(3)
) ENGINE = MergeTree ORDER BY (asset_id, observed_at);

CREATE TABLE IF NOT EXISTS daemon.dataset_organizations (
    organization_id String,
    name String,
    tenant_id String,
    status String,
    external_id String,
    created_at DateTime64(3),
    updated_at DateTime64(3)
) ENGINE = MergeTree ORDER BY organization_id;

CREATE TABLE IF NOT EXISTS daemon.dataset_sites (
    site_id String,
    name String,
    region String,
    latitude Float64,
    longitude Float64,
    created_at DateTime64(3),
    updated_at DateTime64(3)
) ENGINE = MergeTree ORDER BY site_id;

CREATE TABLE IF NOT EXISTS daemon.dataset_assets (
    asset_id String,
    name String,
    tenant_id String,
    status String,
    external_id String,
    created_at DateTime64(3),
    updated_at DateTime64(3)
) ENGINE = MergeTree ORDER BY asset_id;

CREATE TABLE IF NOT EXISTS daemon.dataset_parties (
    party_id String,
    display_name String,
    email String,
    created_at DateTime64(3),
    updated_at DateTime64(3)
) ENGINE = MergeTree ORDER BY party_id;

CREATE TABLE IF NOT EXISTS daemon.dataset_work_orders (
    work_order_id String,
    title String,
    owner_id String,
    priority String,
    status String,
    opened_at DateTime64(3),
    created_at DateTime64(3),
    updated_at DateTime64(3)
) ENGINE = MergeTree ORDER BY work_order_id;

CREATE TABLE IF NOT EXISTS daemon.dataset_observations (
    observation_id String,
    label String,
    value Float64,
    unit String,
    observed_at DateTime64(3),
    asset_id String,
    created_at DateTime64(3),
    updated_at DateTime64(3)
) ENGINE = MergeTree ORDER BY (asset_id, observed_at);

CREATE TABLE IF NOT EXISTS daemon.dataset_signals (
    signal_id String,
    summary String,
    severity String,
    owner_id String,
    priority String,
    status String,
    opened_at DateTime64(3),
    created_at DateTime64(3),
    updated_at DateTime64(3)
) ENGINE = MergeTree ORDER BY signal_id;

CREATE TABLE IF NOT EXISTS daemon.dataset_cases (
    case_id String,
    title String,
    owner_id String,
    priority String,
    status String,
    opened_at DateTime64(3),
    created_at DateTime64(3),
    updated_at DateTime64(3)
) ENGINE = MergeTree ORDER BY case_id;

CREATE TABLE IF NOT EXISTS daemon.dataset_decisions (
    decision_id String,
    outcome String,
    case_id String,
    created_at DateTime64(3),
    updated_at DateTime64(3)
) ENGINE = MergeTree ORDER BY decision_id;

CREATE TABLE IF NOT EXISTS daemon.features_asset_daily (
    asset_id String,
    day Date,
    observation_count UInt64,
    avg_value Float64,
    max_value Float64
) ENGINE = MergeTree ORDER BY (asset_id, day);
