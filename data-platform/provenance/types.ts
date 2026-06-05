/**
 * DAEMON Cross-Store Cryptographic Provenance Protocol
 * Shared type definitions for Phase 1 MVP (Sparse Merkle Tree-based provenance)
 *
 * Implements the protocol described in:
 * 03C_DAEMON_CROSS_STORE_CRYPTOGRAPHIC_PROVENANCE_PROTOCOL_DESIGN.md
 *
 * Cryptographic foundations:
 *   - Dahlberg, Pulls, Peeters (IACR ePrint 2016/683) — Efficient Sparse Merkle Trees
 *   - Haider (IACR ePrint 2018/955) — Compact Sparse Merkle Trees
 */

/** Hex-encoded 32-byte hash value (64 hex chars) */
export type HexHash = string;

/** A single node in a Merkle proof path */
export interface MerklePathNode {
  /** Sibling hash at this level */
  sibling: HexHash;
  /** 'left' = sibling is to the left of the proof path, 'right' = to the right */
  side: "left" | "right";
  /** Depth level (0 = leaf, increases towards root) */
  depth: number;
}

/**
 * Inclusion proof: proves that an entity EXISTS in the committed SMT root.
 * A verifier can recompute the root by walking path[255..0] using leafHash as
 * the starting node, then checking the final result equals epochRoot.
 */
export interface InclusionProof {
  type: "inclusion";
  /** Entity ID that is proven to exist */
  entityId: string;
  /** The SMT key (hex SHA-256 of entityId) used as leaf position */
  smtKey: HexHash;
  /**
   * The pre-computed SMT leaf node hash stored in the tree.
   * = _hashLeaf(smtKey, entityHash)
   * = SHA-256(0x00 || smtKey || entityHash)
   *
   * NOTE: This is NOT the raw entity content hash. It is the leaf node hash
   * as stored in the tree. verifyInclusion uses this directly without re-hashing.
   * To recover the entity content hash: store entityHash separately in proof log.
   */
  leafHash: HexHash;
  /** Merkle sibling path — path[0]=depth-0 sibling (near root), path[255]=depth-255 (near leaf) */
  path: MerklePathNode[];
  /** The committed epoch root this proof is against */
  epochRoot: HexHash;
  /** The epoch this proof belongs to */
  epochId: number;
}

/**
 * Non-inclusion proof: proves that an entity does NOT EXIST in the committed SMT root.
 * Uses the SMT's sparse representation: if the leaf at key K is the empty hash,
 * the entity was never committed in this epoch.
 *
 * This prevents Forensic Denial-of-Service: if an adversary deletes a Neo4j node,
 * the absence can be disproven by querying PostgreSQL for either:
 *  (a) An inclusion proof — the entity WAS committed (Neo4j deletion = tampering)
 *  (b) A non-inclusion proof — the entity genuinely never existed at that epoch
 *
 * Reference: Dahlberg et al. §4 "Non-membership proofs via empty-leaf paths"
 */
export interface NonInclusionProof {
  type: "non-inclusion";
  /** Entity ID proven to NOT exist */
  entityId: string;
  /** The SMT key that maps to an empty leaf */
  smtKey: HexHash;
  /** Path from the (empty) leaf to the root */
  path: MerklePathNode[];
  /** The committed epoch root this proof is against */
  epochRoot: HexHash;
  /** The epoch this proof belongs to */
  epochId: number;
}

export type ProvenanceProof = InclusionProof | NonInclusionProof;

/**
 * An epoch represents a discrete time window of entity mutations.
 * All entities committed within an epoch share the same Merkle root.
 * Epochs form a hash chain: epoch N stores the root of epoch N-1,
 * making the chain tamper-evident.
 *
 * Protocol step 1 & 4 from 03C design document.
 */
export interface EpochRecord {
  epochId: number;
  tenantId: string;
  domainId: string;
  /** Finalized Merkle root (null = epoch still open) */
  epochRoot: HexHash | null;
  /** Hash chain link: root of previous epoch */
  prevEpochId: number | null;
  prevRoot: HexHash | null;
  openedAt: string;
  closedAt: string | null;
  entityCount: number;
}

/**
 * A single entry in the per-entity proof log stored in PostgreSQL.
 * Used to reconstruct Merkle proofs for historical epochs.
 */
export interface EntityProofEntry {
  id: number;
  epochId: number;
  tenantId: string;
  domainId: string;
  entityId: string;
  /** SHA-256(entityId || JSON(properties) || version) */
  entityHash: HexHash;
  /** SHA-256(entityId) — the SMT key */
  smtKey: HexHash;
  /** Serialized Merkle path for this entry */
  proofPath: MerklePathNode[];
  createdAt: string;
}

/**
 * Provenance annotation attached to Neo4j nodes.
 * Stored as node properties __epoch_root, __proof, __epoch_id, __entity_hash.
 */
export interface Neo4jProvenanceAnnotation {
  __epoch_root: HexHash;
  __epoch_id: number;
  __entity_hash: HexHash;
  /** JSON-serialized MerklePathNode[] */
  __proof: string;
}

/** Provenance metadata enriched into NATS event envelopes */
export interface ProvenanceRef {
  epochId: number;
  epochRoot: HexHash;
  entityHash: HexHash;
}
