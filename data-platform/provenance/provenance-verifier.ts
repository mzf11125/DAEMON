/**
 * DAEMON Provenance Verifier
 *
 * High-level verification service for Cross-Store Cryptographic Provenance.
 * Provides both inclusion and non-inclusion proof verification as an
 * efficient internal utility (suitable for direct code invocation or
 * wrapping into an API endpoint in Phase 2).
 *
 * Design rationale:
 *   - Verifier is stateless: all inputs are self-contained proofs + epoch roots
 *   - No database access required for verification (only for proof retrieval)
 *   - Can be used by external auditors given only: the proof JSON + the epochRoot
 *
 * For forensic DoS prevention (Fase 8, 03C document):
 *   When an investigator queries Neo4j and finds a node is MISSING, they use
 *   ProvenanceVerifier to query PostgreSQL for either:
 *     (a) An inclusion proof → proves Neo4j was tampered with (node was deleted)
 *     (b) A non-inclusion proof → proves the entity genuinely never existed
 */

import {
  verifyInclusion,
  verifyNonInclusion,
} from "./smt.js";
import type { EpochManager } from "./epoch-manager.js";
import type { InclusionProof, NonInclusionProof, EpochRecord } from "./types.js";

export interface VerificationResult {
  valid: boolean;
  error?: string;
}

export interface EntityProvenanceStatus {
  entityId: string;
  tenantId: string;
  domainId: string;
  /** The most recent epoch in which this entity was committed */
  latestEpochId: number | null;
  /** Whether an inclusion proof could be built for the latest epoch */
  inclusionVerified: boolean;
  /** The inclusion proof (if verified) */
  inclusionProof?: InclusionProof;
  /** The entity content hash from the proof log */
  entityHash?: string;
  /** The epoch root the entity was committed under */
  epochRoot?: string;
}

export interface ForensicAbsenceCheck {
  entityId: string;
  tenantId: string;
  domainId: string;
  epochId: number;
  /** true = entity genuinely never existed in this epoch */
  genuinelyAbsent: boolean;
  /** true = entity was committed but may have been tampered with (e.g., deleted from Neo4j) */
  suspectedTampering: boolean;
  /** The non-inclusion proof (if genuinely absent) */
  nonInclusionProof?: NonInclusionProof;
  /** The inclusion proof (if found — proves entity was committed = tampering detected) */
  inclusionProof?: InclusionProof;
  reason: string;
}

/**
 * ProvenanceVerifier: high-level verification API over EpochManager.
 *
 * Instantiate once and reuse — it is stateless (delegates to EpochManager + SMT).
 */
export class ProvenanceVerifier {
  constructor(private readonly epochManager: EpochManager) {}

  // ─── Inclusion verification ─────────────────────────────────────────────

  /**
   * Verify that a proof is cryptographically valid against an epoch root.
   * Pure computation — no DB access.
   */
  verifyInclusionProof(proof: InclusionProof): VerificationResult {
    try {
      const valid = verifyInclusion(proof);
      return valid
        ? { valid: true }
        : { valid: false, error: "Merkle path recomputation does not match epoch root" };
    } catch (err) {
      return { valid: false, error: String(err) };
    }
  }

  /**
   * Verify that a non-inclusion proof is cryptographically valid.
   * Pure computation — no DB access.
   */
  verifyNonInclusionProof(proof: NonInclusionProof): VerificationResult {
    try {
      const valid = verifyNonInclusion(proof);
      return valid
        ? { valid: true }
        : { valid: false, error: "Non-inclusion path recomputation does not match epoch root" };
    } catch (err) {
      return { valid: false, error: String(err) };
    }
  }

  // ─── Entity status ───────────────────────────────────────────────────────

  /**
   * Check the provenance status of an entity:
   * - Find the latest epoch it was committed to
   * - Build and verify its inclusion proof
   *
   * This is the primary "is this entity legit?" check for auditors.
   */
  async checkEntityProvenance(
    tenantId: string,
    domainId: string,
    entityId: string,
  ): Promise<EntityProvenanceStatus> {
    const latestEpochId = await this.epochManager.getLatestEntityEpoch(
      tenantId,
      domainId,
      entityId,
    );

    if (latestEpochId === null) {
      return {
        entityId,
        tenantId,
        domainId,
        latestEpochId: null,
        inclusionVerified: false,
      };
    }

    const proof = await this.epochManager.buildInclusionProof(
      tenantId,
      domainId,
      entityId,
      latestEpochId,
    );

    if (!proof) {
      return {
        entityId,
        tenantId,
        domainId,
        latestEpochId,
        inclusionVerified: false,
      };
    }

    const verification = this.verifyInclusionProof(proof);

    return {
      entityId,
      tenantId,
      domainId,
      latestEpochId,
      inclusionVerified: verification.valid,
      inclusionProof: verification.valid ? proof : undefined,
      entityHash: proof.leafHash,
      epochRoot: proof.epochRoot,
    };
  }

  // ─── Forensic absence check ──────────────────────────────────────────────

  /**
   * Forensic Denial-of-Service check:
   * Determines whether an entity's absence from Neo4j is genuine or suspicious.
   *
   * Use this when an investigator queries Neo4j and finds an entity is missing.
   * This queries PostgreSQL to determine:
   *   - If entity WAS committed: return inclusion proof → Neo4j was tampered with
   *   - If entity was NOT committed: return non-inclusion proof → genuinely absent
   *
   * This is the key anti-tampering mechanism described in Phase 8 (03C document):
   * "If Neo4j says Node X does not exist, the client can request a Non-Inclusion Proof
   * from Postgres to validate that Node X genuinely never existed."
   */
  async checkForensicAbsence(
    tenantId: string,
    domainId: string,
    entityId: string,
    epochId: number,
  ): Promise<ForensicAbsenceCheck> {
    // First: check if entity WAS committed in this epoch (would indicate Neo4j tampering)
    const inclusionProof = await this.epochManager.buildInclusionProof(
      tenantId,
      domainId,
      entityId,
      epochId,
    );

    if (inclusionProof) {
      const verification = this.verifyInclusionProof(inclusionProof);
      if (verification.valid) {
        return {
          entityId,
          tenantId,
          domainId,
          epochId,
          genuinelyAbsent: false,
          suspectedTampering: true,
          inclusionProof,
          reason:
            "ALERT: Entity has a valid inclusion proof in PostgreSQL but is absent from Neo4j. " +
            "This indicates possible tampering with the Neo4j projection.",
        };
      }
    }

    // Second: generate non-inclusion proof (entity genuinely never existed)
    const nonInclusionProof = await this.epochManager.buildNonInclusionProof(
      tenantId,
      domainId,
      entityId,
      epochId,
    );

    if (nonInclusionProof) {
      const verification = this.verifyNonInclusionProof(nonInclusionProof);
      if (verification.valid) {
        return {
          entityId,
          tenantId,
          domainId,
          epochId,
          genuinelyAbsent: true,
          suspectedTampering: false,
          nonInclusionProof,
          reason:
            "Entity is confirmed absent from epoch. " +
            "Non-inclusion proof validated against committed Merkle root.",
        };
      }
    }

    // Could not verify either way (epoch not closed, or proof data unavailable)
    return {
      entityId,
      tenantId,
      domainId,
      epochId,
      genuinelyAbsent: false,
      suspectedTampering: false,
      reason:
        "Unable to determine entity status: epoch may not be closed, " +
        "or proof data is unavailable for this entity/epoch combination.",
    };
  }

  // ─── Epoch chain verification ────────────────────────────────────────────

  /**
   * Verify the hash chain from the latest epoch back to genesis.
   * Returns whether the entire chain is intact.
   *
   * A broken chain at epoch N means someone modified the epoch registry
   * (e.g., a rogue DBA altered historical root values).
   */
  async verifyEpochChain(
    tenantId: string,
    domainId: string,
    fromEpochId: number,
  ): Promise<{ valid: boolean; brokenAt?: number; message: string }> {
    const result = await this.epochManager.verifyEpochChain(tenantId, domainId, fromEpochId);
    if (result.valid) {
      return {
        valid: true,
        message: `Epoch hash chain from epoch ${fromEpochId} back to genesis is intact.`,
      };
    }
    return {
      valid: false,
      brokenAt: result.brokenAt,
      message:
        `ALERT: Epoch hash chain broken at epoch ${result.brokenAt}. ` +
        "This may indicate tampering with the epoch registry.",
    };
  }

  // ─── Epoch info ─────────────────────────────────────────────────────────

  /**
   * Get the finalized epoch record (for audit reporting).
   */
  async getEpoch(epochId: number): Promise<EpochRecord | null> {
    return this.epochManager.getEpoch(epochId);
  }
}
