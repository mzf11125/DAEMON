-- Application role for RLS-enforced runtime and integration tests.
-- The default compose user `daemon` is a superuser with BYPASSRLS; use daemon_app for app traffic.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'daemon_app') THEN
    CREATE ROLE daemon_app LOGIN PASSWORD 'daemon_app' NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;

GRANT CONNECT ON DATABASE daemon TO daemon_app;
GRANT USAGE, CREATE ON SCHEMA public TO daemon_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO daemon_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO daemon_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO daemon_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO daemon_app;

-- Startup replay must read all tenants; app sessions use RLS per tenant.
CREATE OR REPLACE FUNCTION daemon_load_entity_snapshots()
RETURNS TABLE (
  tenant_id TEXT,
  domain_id TEXT,
  ontology_id TEXT,
  entity_id TEXT,
  entity_type TEXT,
  properties JSONB,
  version INT,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id, domain_id, ontology_id, entity_id, entity_type,
         properties, version, updated_at
  FROM daemon_entity_snapshots
  ORDER BY updated_at ASC, entity_id ASC;
$$;

GRANT EXECUTE ON FUNCTION daemon_load_entity_snapshots() TO daemon_app;

ALTER TABLE IF EXISTS daemon_audit OWNER TO daemon_app;
ALTER TABLE IF EXISTS daemon_entity_snapshots OWNER TO daemon_app;
ALTER TABLE IF EXISTS daemon_graph_edges OWNER TO daemon_app;
ALTER TABLE IF EXISTS daemon_ontology_changes OWNER TO daemon_app;
ALTER SEQUENCE IF EXISTS daemon_audit_id_seq OWNER TO daemon_app;
ALTER SEQUENCE IF EXISTS daemon_graph_edges_id_seq OWNER TO daemon_app;
ALTER SEQUENCE IF EXISTS daemon_ontology_changes_id_seq OWNER TO daemon_app;
