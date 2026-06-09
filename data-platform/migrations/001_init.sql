-- Daemon platform initial schema (idempotent)

CREATE TABLE IF NOT EXISTS daemon_audit (
  id SERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  resource TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('allow', 'deny')),
  tenant_id TEXT,
  domain_id TEXT,
  metadata JSONB
);

ALTER TABLE daemon_audit ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE daemon_audit ADD COLUMN IF NOT EXISTS domain_id TEXT;
ALTER TABLE daemon_audit ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE TABLE IF NOT EXISTS daemon_entity_snapshots (
  tenant_id TEXT NOT NULL,
  domain_id TEXT NOT NULL,
  ontology_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_type TEXT,
  properties JSONB NOT NULL DEFAULT '{}',
  version INT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, domain_id, ontology_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_snapshots_scope
  ON daemon_entity_snapshots (tenant_id, domain_id, updated_at, entity_id);

CREATE TABLE IF NOT EXISTS daemon_graph_edges (
  id SERIAL PRIMARY KEY,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  relation TEXT NOT NULL,
  UNIQUE (from_id, to_id, relation)
);
