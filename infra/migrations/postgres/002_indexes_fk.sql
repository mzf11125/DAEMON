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
