-- Phase 2.5 — audit archival schema additions.
-- Adds event_class to audit_log, archived flag, and audit_archive_batches hash-chain table.

-- 1. Add event_class column (nullable initially for backward compat; backfilled in application code).
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS event_class TEXT;

-- 2. Add archived flag so the archival job can skip already-processed rows.
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

-- 3. Partial index: only hot rows (not yet archived) for fast archival query.
CREATE INDEX IF NOT EXISTS idx_audit_log_hot
  ON audit_log(tenant_id, created_at)
  WHERE archived = false;

-- 4. Audit archive batch tracking — hash-chained per docs/governance/audit-retention-v1.md.
CREATE TABLE IF NOT EXISTS audit_archive_batches (
  batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id),
  event_class TEXT NOT NULL,
  -- Time range covered by this batch.
  from_created_at TIMESTAMPTZ NOT NULL,
  to_created_at TIMESTAMPTZ NOT NULL,
  -- Count and integrity.
  row_count INT NOT NULL,
  payload_hash TEXT NOT NULL,      -- SHA-256 hex over deterministic JSONL of payloads
  previous_batch_hash TEXT,        -- hash of previous batch for chain integrity (nullable for genesis)
  -- Object store location.
  archive_bucket TEXT NOT NULL,
  archive_key TEXT NOT NULL,
  archive_etag TEXT,
  archive_size_bytes BIGINT NOT NULL DEFAULT 0,
  -- Lifecycle.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,          -- object-store lifecycle rule target (nullable = keep forever)
  -- Verification flag.
  verified_at TIMESTAMPTZ          -- last time hash chain was verified end-to-end
);

-- 5. Indexes for compliance queries and hash-chain verification.
CREATE INDEX IF NOT EXISTS idx_audit_archive_batches_tenant_class
  ON audit_archive_batches(tenant_id, event_class, from_created_at);

CREATE INDEX IF NOT EXISTS idx_audit_archive_batches_expires
  ON audit_archive_batches(expires_at) WHERE expires_at IS NOT NULL;

-- 6. RLS on audit_archive_batches (tenant-scoped, same policy pattern as audit_log).
ALTER TABLE audit_archive_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_audit_archive_batches ON audit_archive_batches;
CREATE POLICY tenant_isolation_audit_archive_batches ON audit_archive_batches
  FOR ALL USING (tenant_id = public.jwt_tenant_id());

-- 7. Comment for schema documentation.
COMMENT ON TABLE audit_archive_batches IS
  'Immutable batch records for audit_log cold archival. Hash-chained (payload_hash -> previous_batch_hash). Written by pipelines/audit-archival. Read by compliance queries and DR restore procedures.';
