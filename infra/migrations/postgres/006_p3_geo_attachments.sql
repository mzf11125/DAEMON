-- P3: attachment plane, links, tenant feature flags (geo map). Mirror of supabase migration 20260101000006.

-- JWT claim helpers for RLS (compatible with db.WithRLSTx request.jwt.claims).
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.jwt_tenant_id() RETURNS text AS $$
  SELECT COALESCE(auth.jwt() ->> 'tenant_id', '');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE TABLE IF NOT EXISTS attachments (
  attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id),
  object_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, object_key)
);

CREATE TABLE IF NOT EXISTS attachment_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id),
  attachment_id UUID NOT NULL REFERENCES attachments(attachment_id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'attachment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, attachment_id, resource_type, resource_id, role)
);

CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(tenant_id),
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_tenant ON attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attachment_links_resource ON attachment_links(tenant_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_attachment_links_attachment ON attachment_links(attachment_id);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_attachments ON attachments
  FOR ALL USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY tenant_isolation_attachment_links ON attachment_links
  FOR ALL USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY tenant_isolation_tenant_settings ON tenant_settings
  FOR ALL USING (tenant_id = public.jwt_tenant_id());
