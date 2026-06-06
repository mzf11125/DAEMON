/**
 * DAEMON Provenance — Public API Index
 * Re-exports all public surface area of the provenance module.
 */

export {
  SparseMerkleTree,
  deriveSmtKey,
  deriveEntityHash,
  verifyInclusion,
  verifyNonInclusion,
  EMPTY_LEAF_HASH,
} from "./smt.js";

export { EpochManager } from "./epoch-manager.js";
export type { EntityCommitInput, EpochCommitResult } from "./epoch-manager.js";

export { EpochScheduler } from "./epoch-scheduler.js";
export type { SchedulerOptions, SchedulerLogger, OpenEpochScope } from "./epoch-scheduler.js";

export { ProvenanceVerifier } from "./provenance-verifier.js";
export type {
  VerificationResult,
  EntityProvenanceStatus,
  ForensicAbsenceCheck,
} from "./provenance-verifier.js";

export type {
  HexHash,
  MerklePathNode,
  InclusionProof,
  NonInclusionProof,
  ProvenanceProof,
  EpochRecord,
  EntityProofEntry,
  Neo4jProvenanceAnnotation,
  ProvenanceRef,
} from "./types.js";
