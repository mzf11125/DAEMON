-- Express HITL: durable action proposals (Postgres; not Redis TS duplicate).

CREATE TABLE IF NOT EXISTS action_proposals (
  proposal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id),
  action_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed',
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  requires_human_approval BOOLEAN NOT NULL DEFAULT true,
  case_id TEXT,
  review_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT action_proposals_status_check CHECK (
    status IN ('proposed', 'approved', 'rejected', 'executed', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_action_proposals_tenant ON action_proposals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_action_proposals_case ON action_proposals(tenant_id, case_id);
CREATE INDEX IF NOT EXISTS idx_action_proposals_status ON action_proposals(tenant_id, status);

ALTER TABLE action_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_action_proposals ON action_proposals;
CREATE POLICY tenant_isolation_action_proposals ON action_proposals
  FOR ALL USING (tenant_id = public.jwt_tenant_id());
