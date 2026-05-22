CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS tenants (
    tenant_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id),
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    roles TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    actor_id TEXT,
    action_type TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ontology_objects (
    object_rid TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    object_type TEXT NOT NULL,
    primary_key_value TEXT NOT NULL,
    properties JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, object_type, primary_key_value)
);

CREATE INDEX IF NOT EXISTS idx_ontology_objects_type ON ontology_objects (tenant_id, object_type);

CREATE TABLE IF NOT EXISTS cases (
    case_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    owner_id TEXT,
    priority TEXT,
    opened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_signals (
    case_id TEXT NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
    signal_id TEXT NOT NULL,
    PRIMARY KEY (case_id, signal_id)
);

CREATE TABLE IF NOT EXISTS ingestion_jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    connector TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lineage_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    dataset_name TEXT NOT NULL,
    source TEXT NOT NULL,
    target TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rule_runs (
    run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    rule_id TEXT NOT NULL,
    matched_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Expand-only: indexes and FKs for demo multi-tenant control plane.

ALTER TABLE ingestion_jobs
  ADD CONSTRAINT fk_ingestion_jobs_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

ALTER TABLE rule_runs
  ADD CONSTRAINT fk_rule_runs_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_tenant_status
  ON ingestion_jobs (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rule_runs_tenant_rule
  ON rule_runs (tenant_id, rule_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lineage_events_tenant_dataset
  ON lineage_events (tenant_id, dataset_name, created_at DESC);

ALTER TABLE ingestion_jobs
  ADD CONSTRAINT chk_ingestion_jobs_status
  CHECK (status IN ('pending','running','completed','failed'));
-- Expand-only: per-job connector parameters (addresses, chain_ids, query_id, column_map, etc.).
-- Secrets (SIM_API_KEY, DUNE_API_KEY) remain in environment only.

ALTER TABLE ingestion_jobs
  ADD COLUMN IF NOT EXISTS params JSONB NOT NULL DEFAULT '{}';
