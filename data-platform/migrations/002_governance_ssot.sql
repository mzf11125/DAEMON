-- Commercial governance SSOT: change log, scoped graph edges, RLS

CREATE TABLE IF NOT EXISTS daemon_ontology_changes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  domain_id TEXT NOT NULL,
  ontology_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('register', 'patch')),
  payload JSONB NOT NULL DEFAULT '{}',
  pack_version TEXT,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ontology_changes_scope
  ON daemon_ontology_changes (tenant_id, domain_id, at DESC);

ALTER TABLE daemon_graph_edges ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE daemon_graph_edges ADD COLUMN IF NOT EXISTS domain_id TEXT;

-- Backfill legacy rows without tenant scope (dev-only)
UPDATE daemon_graph_edges
SET tenant_id = COALESCE(tenant_id, 'default'),
    domain_id = COALESCE(domain_id, 'foundation')
WHERE tenant_id IS NULL OR domain_id IS NULL;

ALTER TABLE daemon_graph_edges ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE daemon_graph_edges ALTER COLUMN domain_id SET NOT NULL;

ALTER TABLE daemon_graph_edges
  DROP CONSTRAINT IF EXISTS daemon_graph_edges_from_id_to_id_relation_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_graph_edges_scoped
  ON daemon_graph_edges (tenant_id, domain_id, from_id, to_id, relation);

-- Row-level security (session var app.tenant_id)
ALTER TABLE daemon_entity_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE daemon_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE daemon_ontology_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE daemon_graph_edges ENABLE ROW LEVEL SECURITY;

-- Table owners bypass RLS unless forced (dev connection uses table owner).
ALTER TABLE daemon_entity_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE daemon_audit FORCE ROW LEVEL SECURITY;
ALTER TABLE daemon_ontology_changes FORCE ROW LEVEL SECURITY;
ALTER TABLE daemon_graph_edges FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daemon_entity_snapshots_tenant ON daemon_entity_snapshots;
CREATE POLICY daemon_entity_snapshots_tenant ON daemon_entity_snapshots
  USING (tenant_id = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS daemon_audit_tenant ON daemon_audit;
CREATE POLICY daemon_audit_tenant ON daemon_audit
  USING (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS daemon_ontology_changes_tenant ON daemon_ontology_changes;
CREATE POLICY daemon_ontology_changes_tenant ON daemon_ontology_changes
  USING (tenant_id = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS daemon_graph_edges_tenant ON daemon_graph_edges;
CREATE POLICY daemon_graph_edges_tenant ON daemon_graph_edges
  USING (tenant_id = current_setting('app.tenant_id', true));
