/**
 * DAEMON Epoch Manager
 *
 * Manages epoch lifecycle for the Cross-Store Cryptographic Provenance Protocol.
 * An epoch is a discrete batch of entity mutations that share a single Merkle root.
 * Epochs form a tamper-evident hash chain: epoch N stores the finalized root of epoch N-1.
 *
 * Protocol role: implements steps 1 & 4 from the CSCP² design (03C document).
 *
 * Manual epoch close: operators call closeEpoch() explicitly (Phase 1 design decision).
 * Auto-close by time window is deferred to Phase 2.
 *
 * Hash chain reference:
 *   Notus (USENIX Security 2024) — "each epoch builds a Merkle tree over updated users,
 *   and auditors verify from the last checkpoint using a hash chain plus a single
 *   Merkle membership proof, with auditor overhead O(1) per epoch."
 */

import type { PostgresClient } from "../operational-store/postgres-client.js";
import {
  SparseMerkleTree,
  deriveSmtKey,
  deriveEntityHash,
  hashLeaf,
  verifyInclusion,
  verifyNonInclusion,
} from "./smt.js";
import type {
  EpochRecord,
  EntityProofEntry,
  InclusionProof,
  NonInclusionProof,
  Neo4jProvenanceAnnotation,
  ProvenanceRef,
  HexHash,
  MerklePathNode,
} from "./types.js";

export type { EpochRecord, EntityProofEntry, InclusionProof, NonInclusionProof, Neo4jProvenanceAnnotation, ProvenanceRef };

export interface EntityCommitInput {
  tenantId: string;
  domainId: string;
  entityId: string;
  properties: Record<string, unknown>;
  version: number;
}

export interface EpochCommitResult {
  epochId: number;
  epochRoot: HexHash;
  entityCount: number;
}

/**
 * EpochManager: handles the lifecycle of provenance epochs in PostgreSQL.
 *
 * Usage pattern (per-scope):
 *   1. openEpoch() — create a new epoch, returns epochId
 *   2. recordEntityCommit() — call for each entity upserted in this epoch
 *   3. closeEpoch() — finalize the Merkle root, persist to epoch_registry
 *
 * Concurrency note: for Phase 1, a single "active epoch" per (tenantId, domainId) pair
 * is assumed. Concurrent writes within the same epoch are serialized by PostgreSQL
 * transaction isolation.
 */
export class EpochManager {
  /** In-memory SMT per scope key "tenantId:domainId:epochId" */
  private readonly trees = new Map<string, SparseMerkleTree>();

  constructor(private readonly pg: PostgresClient) {}

  // ─── Schema ──────────────────────────────────────────────────────────────

  async ensureSchema(): Promise<void> {
    await this.pg.query(`
      CREATE TABLE IF NOT EXISTS daemon_epoch_registry (
        epoch_id      BIGSERIAL PRIMARY KEY,
        tenant_id     TEXT NOT NULL,
        domain_id     TEXT NOT NULL,
        epoch_root    TEXT,
        prev_epoch_id BIGINT REFERENCES daemon_epoch_registry(epoch_id),
        prev_root     TEXT,
        opened_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        closed_at     TIMESTAMPTZ,
        entity_count  INT NOT NULL DEFAULT 0
      )
    `);
    await this.pg.query(`
      CREATE TABLE IF NOT EXISTS daemon_entity_proof_log (
        id          BIGSERIAL PRIMARY KEY,
        epoch_id    BIGINT NOT NULL REFERENCES daemon_epoch_registry(epoch_id),
        tenant_id   TEXT NOT NULL,
        domain_id   TEXT NOT NULL,
        entity_id   TEXT NOT NULL,
        entity_hash TEXT NOT NULL,
        smt_key     TEXT NOT NULL,
        proof_path  JSONB NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await this.pg.query(`
      CREATE INDEX IF NOT EXISTS idx_daemon_proof_log_epoch
        ON daemon_entity_proof_log (epoch_id, tenant_id, domain_id)
    `);
    await this.pg.query(`
      CREATE INDEX IF NOT EXISTS idx_daemon_proof_log_entity
        ON daemon_entity_proof_log (tenant_id, domain_id, entity_id, epoch_id DESC)
    `);
  }

  // ─── Epoch lifecycle ──────────────────────────────────────────────────────

  /**
   * Open a new epoch for a given scope.
   * Creates an open epoch entry in daemon_epoch_registry.
   * Links to the most recently closed epoch for hash chain continuity.
   */
  async openEpoch(tenantId: string, domainId: string): Promise<number> {
    await this.ensureSchema();

    // Find most recently closed epoch for this scope (for hash chaining)
    const prevResult = await this.pg.query<{
      epoch_id: string;
      epoch_root: string;
    }>(
      `SELECT epoch_id, epoch_root FROM daemon_epoch_registry
       WHERE tenant_id = $1 AND domain_id = $2 AND closed_at IS NOT NULL
       ORDER BY epoch_id DESC LIMIT 1`,
      [tenantId, domainId],
    );

    const prev = prevResult.rows[0];
    const prevEpochId = prev ? parseInt(prev.epoch_id, 10) : null;
    const prevRoot = prev?.epoch_root ?? null;

    const result = await this.pg.query<{ epoch_id: string }>(
      `INSERT INTO daemon_epoch_registry
         (tenant_id, domain_id, prev_epoch_id, prev_root)
       VALUES ($1, $2, $3, $4)
       RETURNING epoch_id`,
      [tenantId, domainId, prevEpochId, prevRoot],
    );

    const epochId = parseInt(result.rows[0]!.epoch_id, 10);
    // Initialize the SMT for this epoch
    this.trees.set(scopeKey(tenantId, domainId, epochId), new SparseMerkleTree());
    return epochId;
  }

  /**
   * Get or create the active epoch for a scope.
   * If no open epoch exists, opens a new one automatically.
   */
  async getOrOpenEpoch(tenantId: string, domainId: string): Promise<number> {
    const active = await this.getActiveEpochId(tenantId, domainId);
    if (active !== null) return active;
    return this.openEpoch(tenantId, domainId);
  }

  /**
   * Record an entity commit into the current active epoch.
   * Computes the entity hash, inserts into proof log, and updates the SMT.
   *
   * Returns the provenance metadata needed to annotate Neo4j and NATS events.
   */
  async recordEntityCommit(
    epochId: number,
    input: EntityCommitInput,
  ): Promise<{ provenanceRef: ProvenanceRef; annotation: Neo4jProvenanceAnnotation }> {
    const { tenantId, domainId, entityId, properties, version } = input;

    const smtKey = deriveSmtKey(entityId);
    const entityHash = deriveEntityHash(entityId, properties, version);
    const leafHash = hashLeaf(smtKey, entityHash);

    // Update in-memory SMT
    const key = scopeKey(tenantId, domainId, epochId);
    let tree = this.trees.get(key);
    if (!tree) {
      tree = new SparseMerkleTree();
      this.trees.set(key, tree);
    }
    tree.insert(smtKey, leafHash);

    // Compute current (uncommitted) root for the annotation
    const currentRoot = tree.getRoot();

    // Generate inclusion proof path
    const proof = tree.generateInclusionProof(
      entityId,
      smtKey,
      leafHash,
      currentRoot,
      epochId,
    );
    const proofPath: MerklePathNode[] = proof?.path ?? [];

    // Persist proof log entry
    await this.pg.query(
      `INSERT INTO daemon_entity_proof_log
         (epoch_id, tenant_id, domain_id, entity_id, entity_hash, smt_key, proof_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT DO NOTHING`,
      [
        epochId,
        tenantId,
        domainId,
        entityId,
        entityHash,
        smtKey,
        JSON.stringify(proofPath),
      ],
    );

    // Update entity count on the epoch
    await this.pg.query(
      `UPDATE daemon_epoch_registry
       SET entity_count = entity_count + 1
       WHERE epoch_id = $1`,
      [epochId],
    );

    const provenanceRef: ProvenanceRef = {
      epochId,
      epochRoot: currentRoot, // will be finalized on closeEpoch
      entityHash,
    };

    const annotation: Neo4jProvenanceAnnotation = {
      __epoch_root: currentRoot,
      __epoch_id: epochId,
      __entity_hash: entityHash,
      __proof: JSON.stringify(proofPath),
    };

    return { provenanceRef, annotation };
  }

  /**
   * Close an epoch and finalize its Merkle root.
   * After closing, no more entities can be added to this epoch.
   * The finalized root is persisted to daemon_epoch_registry.
   *
   * This is a manual operation — operators invoke this explicitly.
   */
  async closeEpoch(epochId: number): Promise<EpochCommitResult> {
    const epochResult = await this.pg.query<{
      epoch_id: string;
      tenant_id: string;
      domain_id: string;
      entity_count: string;
    }>(
      `SELECT epoch_id, tenant_id, domain_id, entity_count
       FROM daemon_epoch_registry
       WHERE epoch_id = $1 AND closed_at IS NULL`,
      [epochId],
    );

    const epoch = epochResult.rows[0];
    if (!epoch) {
      throw new Error(`Epoch ${epochId} not found or already closed`);
    }

    const { tenant_id: tenantId, domain_id: domainId } = epoch;
    const entityCount = parseInt(epoch.entity_count, 10);

    // Get finalized tree root
    const key = scopeKey(tenantId, domainId, epochId);
    const tree = this.trees.get(key) ?? new SparseMerkleTree();
    const epochRoot = tree.getRoot();

    // Persist finalized root
    await this.pg.query(
      `UPDATE daemon_epoch_registry
       SET epoch_root = $1, closed_at = NOW()
       WHERE epoch_id = $2`,
      [epochRoot, epochId],
    );

    // Clean up in-memory tree to free RAM
    this.trees.delete(key);

    return { epochId, epochRoot, entityCount };
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  /**
   * Get the ID of the currently open epoch for a scope.
   * Returns null if no open epoch exists.
   */
  async getActiveEpochId(tenantId: string, domainId: string): Promise<number | null> {
    const result = await this.pg.query<{ epoch_id: string }>(
      `SELECT epoch_id FROM daemon_epoch_registry
       WHERE tenant_id = $1 AND domain_id = $2 AND closed_at IS NULL
       ORDER BY epoch_id DESC LIMIT 1`,
      [tenantId, domainId],
    );
    const row = result.rows[0];
    return row ? parseInt(row.epoch_id, 10) : null;
  }

  /**
   * Retrieve a finalized epoch record.
   */
  async getEpoch(epochId: number): Promise<EpochRecord | null> {
    const result = await this.pg.query<{
      epoch_id: string;
      tenant_id: string;
      domain_id: string;
      epoch_root: string | null;
      prev_epoch_id: string | null;
      prev_root: string | null;
      opened_at: Date;
      closed_at: Date | null;
      entity_count: string;
    }>(
      `SELECT * FROM daemon_epoch_registry WHERE epoch_id = $1`,
      [epochId],
    );
    const row = result.rows[0];
    if (!row) return null;

    return {
      epochId: parseInt(row.epoch_id, 10),
      tenantId: row.tenant_id,
      domainId: row.domain_id,
      epochRoot: row.epoch_root,
      prevEpochId: row.prev_epoch_id ? parseInt(row.prev_epoch_id, 10) : null,
      prevRoot: row.prev_root,
      openedAt: row.opened_at.toISOString(),
      closedAt: row.closed_at?.toISOString() ?? null,
      entityCount: parseInt(row.entity_count, 10),
    };
  }

  /**
   * Load the stored proof entry for an entity at a specific epoch.
   * Returns null if the entity was not committed in that epoch.
   */
  async getEntityProofEntry(
    tenantId: string,
    domainId: string,
    entityId: string,
    epochId: number,
  ): Promise<EntityProofEntry | null> {
    const result = await this.pg.query<{
      id: string;
      epoch_id: string;
      tenant_id: string;
      domain_id: string;
      entity_id: string;
      entity_hash: string;
      smt_key: string;
      proof_path: MerklePathNode[];
      created_at: Date;
    }>(
      `SELECT * FROM daemon_entity_proof_log
       WHERE tenant_id = $1 AND domain_id = $2 AND entity_id = $3 AND epoch_id = $4`,
      [tenantId, domainId, entityId, epochId],
    );
    const row = result.rows[0];
    if (!row) return null;

    return {
      id: parseInt(row.id, 10),
      epochId: parseInt(row.epoch_id, 10),
      tenantId: row.tenant_id,
      domainId: row.domain_id,
      entityId: row.entity_id,
      entityHash: row.entity_hash,
      smtKey: row.smt_key,
      proofPath: row.proof_path,
      createdAt: row.created_at.toISOString(),
    };
  }

  /**
   * Get the most recent epoch in which an entity was committed.
   */
  async getLatestEntityEpoch(
    tenantId: string,
    domainId: string,
    entityId: string,
  ): Promise<number | null> {
    const result = await this.pg.query<{ epoch_id: string }>(
      `SELECT epoch_id FROM daemon_entity_proof_log
       WHERE tenant_id = $1 AND domain_id = $2 AND entity_id = $3
       ORDER BY epoch_id DESC LIMIT 1`,
      [tenantId, domainId, entityId],
    );
    const row = result.rows[0];
    return row ? parseInt(row.epoch_id, 10) : null;
  }

  /**
   * Verify the hash chain integrity from a given epoch back to the genesis.
   * Returns true if chain is intact, false if tampering is detected.
   *
   * Complexity: O(chain_length) — one DB query per epoch.
   */
  async verifyEpochChain(
    _tenantId: string,
    _domainId: string,
    fromEpochId: number,
  ): Promise<{ valid: boolean; brokenAt?: number }> {
    let currentId: number | null = fromEpochId;

    while (currentId !== null) {
      const epoch = await this.getEpoch(currentId);
      if (!epoch) return { valid: false, brokenAt: currentId };
      if (!epoch.closedAt || !epoch.epochRoot) {
        return { valid: false, brokenAt: currentId }; // unclosed epoch in chain
      }

      if (epoch.prevEpochId !== null) {
        const prevEpoch = await this.getEpoch(epoch.prevEpochId);
        if (!prevEpoch || prevEpoch.epochRoot !== epoch.prevRoot) {
          return { valid: false, brokenAt: currentId };
        }
      }

      currentId = epoch.prevEpochId;
    }

    return { valid: true };
  }

  // ─── Proof generation from stored data ───────────────────────────────────

  /**
   * Reconstruct an inclusion proof from stored proof log data.
   * Used for historical queries (epoch already closed).
   */
  async buildInclusionProof(
    tenantId: string,
    domainId: string,
    entityId: string,
    epochId: number,
  ): Promise<InclusionProof | null> {
    const epoch = await this.getEpoch(epochId);
    if (!epoch?.epochRoot) return null;

    const entry = await this.getEntityProofEntry(tenantId, domainId, entityId, epochId);
    if (!entry) return null;

    const proof: InclusionProof = {
      type: "inclusion",
      entityId,
      smtKey: entry.smtKey,
      leafHash: hashLeaf(entry.smtKey, entry.entityHash),
      path: entry.proofPath,
      epochRoot: epoch.epochRoot,
      epochId,
    };

    // Validate before returning
    if (!verifyInclusion(proof)) return null;
    return proof;
  }

  /**
   * Build a non-inclusion proof for an entity that was NOT committed in an epoch.
   * Requires reconstructing the SMT from stored proof log entries.
   *
   * Warning: O(n) reconstruction from stored entries — consider caching for
   * production use.
   */
  async buildNonInclusionProof(
    tenantId: string,
    domainId: string,
    entityId: string,
    epochId: number,
  ): Promise<NonInclusionProof | null> {
    const epoch = await this.getEpoch(epochId);
    if (!epoch?.epochRoot) return null;

    // Verify entity was NOT in this epoch
    const entry = await this.getEntityProofEntry(tenantId, domainId, entityId, epochId);
    if (entry) return null; // entity IS present — can't generate non-inclusion proof

    // Reconstruct SMT from all entries in this epoch
    const allEntries = await this.loadAllEpochEntries(epochId);
    const smt = new SparseMerkleTree();
    for (const e of allEntries) {
      smt.insert(e.smtKey, hashLeaf(e.smtKey, e.entityHash));
    }

    const smtKey = deriveSmtKey(entityId);
    const proof = smt.generateNonInclusionProof(entityId, smtKey, epoch.epochRoot, epochId);
    if (!proof) return null;

    // Validate
    if (!verifyNonInclusion(proof)) return null;
    return proof;
  }

  private async loadAllEpochEntries(epochId: number): Promise<EntityProofEntry[]> {
    const result = await this.pg.query<{
      id: string;
      epoch_id: string;
      tenant_id: string;
      domain_id: string;
      entity_id: string;
      entity_hash: string;
      smt_key: string;
      proof_path: MerklePathNode[];
      created_at: Date;
    }>(
      `SELECT * FROM daemon_entity_proof_log WHERE epoch_id = $1`,
      [epochId],
    );
    return result.rows.map((row) => ({
      id: parseInt(row.id, 10),
      epochId: parseInt(row.epoch_id, 10),
      tenantId: row.tenant_id,
      domainId: row.domain_id,
      entityId: row.entity_id,
      entityHash: row.entity_hash,
      smtKey: row.smt_key,
      proofPath: row.proof_path,
      createdAt: row.created_at.toISOString(),
    }));
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scopeKey(tenantId: string, domainId: string, epochId: number): string {
  return `${tenantId}:${domainId}:${epochId}`;
}
