-- DAEMON Cross-Store Cryptographic Provenance Protocol
-- Migration 012: Sparse Merkle Tree Provenance Tables
--
-- Implements Phase 1 MVP from:
--   03C_DAEMON_CROSS_STORE_CRYPTOGRAPHIC_PROVENANCE_PROTOCOL_DESIGN.md
--
-- References:
--   Dahlberg et al. (IACR 2016/683) - Efficient Sparse Merkle Trees
--   Notus (USENIX Security 2024) - Epoch-based hash chains with O(1) audit overhead
--
-- Security note: these tables must NOT be modifiable by the daemon_app role.
-- In production, consider a separate read-only role for the provenance tables.
-- The epoch_root chain provides tamper-evidence: altering past roots breaks
-- the chain and is detectable by verifyEpochChain().

-- Epoch registry: hash chain of Merkle roots
-- Each row represents one finalized epoch. The chain:
--   epoch N.prev_root = epoch (N-1).epoch_root
-- Making the chain tamper-evident (Notus design pattern).
CREATE TABLE IF NOT EXISTS daemon_epoch_registry (
  epoch_id      BIGSERIAL PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  domain_id     TEXT NOT NULL,
  -- Finalized Merkle root (NULL while epoch is open)
  epoch_root    TEXT,
  -- Hash chain link: reference to previous epoch
  prev_epoch_id BIGINT REFERENCES daemon_epoch_registry(epoch_id) ON DELETE RESTRICT,
  -- Cached root value of previous epoch (for chain validation without JOIN)
  prev_root     TEXT,
  opened_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- NULL = epoch still open
  closed_at     TIMESTAMPTZ,
  entity_count  INT NOT NULL DEFAULT 0,
  -- Constraint: if closed, must have a root
  CONSTRAINT epoch_root_when_closed CHECK (
    closed_at IS NULL OR epoch_root IS NOT NULL
  )
);

-- Index for fast lookup of the active epoch per scope
CREATE INDEX IF NOT EXISTS idx_daemon_epoch_scope_active
  ON daemon_epoch_registry (tenant_id, domain_id, epoch_id DESC)
  WHERE closed_at IS NULL;

-- Index for chain traversal
CREATE INDEX IF NOT EXISTS idx_daemon_epoch_prev
  ON daemon_epoch_registry (prev_epoch_id)
  WHERE prev_epoch_id IS NOT NULL;

-- Per-entity proof log within an epoch.
-- Each row stores the Merkle path for one entity commit.
-- This allows reconstruction of inclusion/non-inclusion proofs
-- for historical epochs without keeping SMT state in memory.
CREATE TABLE IF NOT EXISTS daemon_entity_proof_log (
  id            BIGSERIAL PRIMARY KEY,
  epoch_id      BIGINT NOT NULL REFERENCES daemon_epoch_registry(epoch_id) ON DELETE RESTRICT,
  tenant_id     TEXT NOT NULL,
  domain_id     TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  -- SHA-256(entityId || "|" || JSON(properties) || "|" || version)
  entity_hash   TEXT NOT NULL,
  -- SHA-256(entityId) — the SMT leaf key
  smt_key       TEXT NOT NULL,
  -- Serialized MerklePathNode[] for the inclusion proof at time of commit
  proof_path    JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Each entity can only appear once per epoch
  UNIQUE (epoch_id, tenant_id, domain_id, entity_id)
);

-- Fast lookup: all proof entries for a given epoch
CREATE INDEX IF NOT EXISTS idx_daemon_proof_log_epoch
  ON daemon_entity_proof_log (epoch_id, tenant_id, domain_id);

-- Fast lookup: history of epochs for a given entity (most recent first)
CREATE INDEX IF NOT EXISTS idx_daemon_proof_log_entity
  ON daemon_entity_proof_log (tenant_id, domain_id, entity_id, epoch_id DESC);

-- Fast SMT reconstruction: lookup by smt_key within an epoch
CREATE INDEX IF NOT EXISTS idx_daemon_proof_log_smt_key
  ON daemon_entity_proof_log (epoch_id, smt_key);
