/**
 * DAEMON Sparse Merkle Tree (SMT) Engine
 *
 * Pure-TypeScript implementation of a Sparse Merkle Tree for cryptographic
 * provenance tracking across DAEMON's polyglot persistence layer.
 *
 * Cryptographic design follows:
 *   - Dahlberg, Pulls, Peeters (IACR ePrint 2016/683)
 *     "Efficient Sparse Merkle Trees: Caching Strategies and Secure
 *      (Non-)Membership Proofs"
 *   - Haider (IACR ePrint 2018/955)
 *     "Compact Sparse Merkle Trees"
 *
 * Hash function: SHA-256 via Node.js built-in `crypto` module (no external deps).
 *
 * Tree structure:
 *   - Key space: 256-bit (keys are SHA-256 hashes of entity IDs)
 *   - Physical tree: sparse — only populated leaves are stored in memory
 *   - Empty leaf:  SHA-256("DAEMON_SMT_EMPTY_LEAF_V1") — a fixed sentinel
 *   - Leaf hash:   SHA-256(0x00 || smtKey || leafValue)
 *   - Internal hash: SHA-256(0x01 || leftChild || rightChild)
 *
 * Merkle path convention (used in proof serialisation):
 *   path[0] = sibling at depth 0 (just below root, most significant bit level)
 *   path[255] = sibling at depth 255 (leaf level, least significant bit level)
 *
 *   verifyInclusion iterates path[0..255] from root toward leaf, rebuilding
 *   child hashes, then checks the final result equals epochRoot.
 *
 * Non-inclusion proof:
 *   The leaf slot for a missing entity contains EMPTY_LEAF_HASH.
 *   Verifier walks the path and recomputes the root, confirming it matches.
 */

import { createHash } from "node:crypto";
import type {
  HexHash,
  InclusionProof,
  MerklePathNode,
  NonInclusionProof,
} from "./types.js";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Tree depth = 256 bits (SHA-256 key space) */
const TREE_DEPTH = 256;

/** Domain separation: leaf nodes */
const LEAF_PREFIX = Buffer.from([0x00]);

/** Domain separation: internal nodes */
const INTERNAL_PREFIX = Buffer.from([0x01]);

/**
 * Canonical empty-leaf sentinel hash.
 * SHA-256("DAEMON_SMT_EMPTY_LEAF_V1") — domain-specific, prevents collisions.
 */
const EMPTY_LEAF_HASH: HexHash = createHash("sha256")
  .update("DAEMON_SMT_EMPTY_LEAF_V1")
  .digest("hex");

/**
 * Pre-computed empty subtree hashes for every level.
 *   EMPTY_HASHES[0]   = EMPTY_LEAF_HASH
 *   EMPTY_HASHES[h]   = hash_internal(EMPTY_HASHES[h-1], EMPTY_HASHES[h-1])
 *   EMPTY_HASHES[256] = root of a completely empty 256-depth tree
 */
const EMPTY_HASHES: HexHash[] = (() => {
  const h: HexHash[] = [EMPTY_LEAF_HASH];
  for (let i = 1; i <= TREE_DEPTH; i++) {
    const prev = h[i - 1]!;
    h.push(_hashInternal(prev, prev));
  }
  return h;
})();

// ─── Low-level hash helpers ───────────────────────────────────────────────────

function _sha256(data: Buffer): HexHash {
  return createHash("sha256").update(data).digest("hex");
}

/** Compute H_leaf = SHA-256(0x00 || smtKey || leafValue) */
function _hashLeaf(key: HexHash, value: HexHash): HexHash {
  return _sha256(
    Buffer.concat([LEAF_PREFIX, Buffer.from(key, "hex"), Buffer.from(value, "hex")]),
  );
}

/** Compute H_node = SHA-256(0x01 || left || right) */
function _hashInternal(left: HexHash, right: HexHash): HexHash {
  return _sha256(
    Buffer.concat([INTERNAL_PREFIX, Buffer.from(left, "hex"), Buffer.from(right, "hex")]),
  );
}

// ─── Bit helpers ─────────────────────────────────────────────────────────────

/**
 * Convert a 64-char hex string into a 256-element bit array.
 * bits[0] = MSB of first byte  (depth-0 direction from root)
 * bits[255] = LSB of last byte (depth-255 leaf selector)
 */
function hexToBits(hex: HexHash): number[] {
  const bits: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    for (let b = 7; b >= 0; b--) {
      bits.push((byte >> b) & 1);
    }
  }
  return bits;
}

/** Get a single bit (0 or 1) at position `depth` from a hex key. */
function bitAt(key: HexHash, depth: number): 0 | 1 {
  const byteIndex = Math.floor(depth / 8);
  const bitIndex = 7 - (depth % 8);
  const byte = parseInt(key.slice(byteIndex * 2, byteIndex * 2 + 2), 16);
  return ((byte >> bitIndex) & 1) as 0 | 1;
}

// ─── Key derivation (public API) ──────────────────────────────────────────────

/**
 * Derive the SMT leaf position (key) for an entity.
 * smtKey = SHA-256(entityId) — uniform distribution across key space.
 */
export function deriveSmtKey(entityId: string): HexHash {
  return createHash("sha256").update(entityId, "utf8").digest("hex");
}

/**
 * Derive the entity content hash (leaf value).
 * entityHash = SHA-256(entityId | "|" | JSON(properties) | "|" | version)
 * The "|" domain separator prevents length-extension attacks.
 */
export function deriveEntityHash(
  entityId: string,
  properties: Record<string, unknown>,
  version: number,
): HexHash {
  const content = `${entityId}|${JSON.stringify(properties)}|${version}`;
  return createHash("sha256").update(content, "utf8").digest("hex");
}

// ─── Sparse Merkle Tree ───────────────────────────────────────────────────────

/**
 * In-memory Sparse Merkle Tree with 256-bit key space.
 *
 * Only populated leaf slots are stored (sparse representation).
 * Empty subtrees use pre-computed EMPTY_HASHES, so the virtual tree has
 * exactly 2^256 leaf slots without allocating any memory for empties.
 *
 * Complexity:
 *   insert:                  O(1) amortised
 *   getRoot:                 O(n × TREE_DEPTH) — n = number of leaves
 *   generateInclusionProof:  O(n × TREE_DEPTH)
 *   generateNonInclusionProof: O(n × TREE_DEPTH)
 *
 * For production with millions of entities, cache intermediate node hashes.
 */
export class SparseMerkleTree {
  /** smtKey (lowercase hex) → leafHash (lowercase hex) */
  private readonly leaves = new Map<HexHash, HexHash>();

  /**
   * Internal node hash cache.
   * Key format: `"${depth}:${binaryPrefix}"` — e.g. `"3:101"`.
   * Leaf level (depth=256) is NOT cached here; the `leaves` Map is the source.
   *
   * Invariant: cache is always consistent with the current `leaves` state.
   * Any `insert()` call invalidates all ancestor cache entries along the key path.
   */
  private readonly _nodeCache = new Map<string, HexHash>();

  /**
   * Insert or update a leaf.
   * Invalidates all cached ancestor nodes along the key's 256-bit path
   * so that subsequent `getRoot()` and proof generation recompute correctly.
   *
   * @param smtKey   - 256-bit hex key (from deriveSmtKey)
   * @param leafHash - pre-computed leaf hash (from hashLeaf())
   */
  insert(smtKey: HexHash, leafHash: HexHash): void {
    const key = smtKey.toLowerCase();
    this.leaves.set(key, leafHash.toLowerCase());
    // Invalidate all ancestor nodes (depth 0 to 255) along this key's path
    const bits = hexToBits(key);
    let prefix = "";
    for (let depth = 0; depth < TREE_DEPTH; depth++) {
      this._nodeCache.delete(`${depth}:${prefix}`);
      prefix += bits[depth]!.toString();
    }
    // Also invalidate the leaf-level parent cache entry (depth=TREE_DEPTH is
    // resolved from `leaves` directly, but clear any stale depth-255 entry)
    this._nodeCache.delete(`${TREE_DEPTH}:${prefix}`);
  }

  /** Total number of inserted leaves. */
  size(): number {
    return this.leaves.size;
  }

  /**
   * Compute the Merkle root of the current tree.
   * Walks the virtual tree top-down (depth 0 → 256), merging subtrees.
   */
  getRoot(): HexHash {
    return this._subtreeHash(0, "");
  }

  /**
   * Generate a Merkle inclusion proof for a leaf that IS in the tree.
   * Returns null if smtKey is not present.
   *
   * Proof path: path[i].sibling = sibling at depth i (root-side first).
   * Verifier: iterate path[0..255], rebuilding from leaf to root.
   */
  generateInclusionProof(
    entityId: string,
    smtKey: HexHash,
    leafHash: HexHash,
    epochRoot: HexHash,
    epochId: number,
  ): InclusionProof | null {
    if (!this.leaves.has(smtKey.toLowerCase())) return null;
    const path = this._buildPath(smtKey);
    return { type: "inclusion", entityId, smtKey, leafHash, path, epochRoot, epochId };
  }

  /**
   * Generate a non-inclusion proof for a key that is NOT in the tree.
   * Returns null if smtKey IS present (cannot prove absence for a present key).
   *
   * Verifier starts from EMPTY_LEAF_HASH and walks path[255..0],
   * recomputing each internal node up to the root.
   */
  generateNonInclusionProof(
    entityId: string,
    smtKey: HexHash,
    epochRoot: HexHash,
    epochId: number,
  ): NonInclusionProof | null {
    if (this.leaves.has(smtKey.toLowerCase())) return null;
    const path = this._buildPath(smtKey);
    return { type: "non-inclusion", entityId, smtKey, path, epochRoot, epochId };
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  /**
   * Compute the hash of the subtree at (depth, keyPrefix).
   * Results are memoised in `_nodeCache`; stale entries are removed by `insert()`.
   *
   * @param depth     - current depth (0 = just below root, 256 = leaf level)
   * @param keyPrefix - binary string of bits chosen so far (length = depth)
   */
  private _subtreeHash(depth: number, keyPrefix: string): HexHash {
    if (depth === TREE_DEPTH) {
      // Leaf level — decode prefix back to hex key (not cached via _nodeCache)
      const hexKey = this._bitsToHex(keyPrefix);
      return this.leaves.get(hexKey) ?? EMPTY_LEAF_HASH;
    }

    // Cache lookup
    const cacheKey = `${depth}:${keyPrefix}`;
    const cached = this._nodeCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const leftPrefix = keyPrefix + "0";
    const rightPrefix = keyPrefix + "1";
    const emptyChildHash = EMPTY_HASHES[TREE_DEPTH - depth - 1]!;

    const leftHash = this._hasAnyLeafWithPrefix(leftPrefix)
      ? this._subtreeHash(depth + 1, leftPrefix)
      : emptyChildHash;

    const rightHash = this._hasAnyLeafWithPrefix(rightPrefix)
      ? this._subtreeHash(depth + 1, rightPrefix)
      : emptyChildHash;

    const result = _hashInternal(leftHash, rightHash);
    this._nodeCache.set(cacheKey, result);
    return result;
  }

  /**
   * Build the sibling path for a given smtKey.
   *
   * Traverses from depth 0 (root) to depth 255 (leaf), at each level
   * computing the sibling subtree hash and recording which side the sibling
   * is on relative to the proof path.
   *
   * path[0].depth = 0   (sibling closest to root)
   * path[255].depth = 255 (sibling closest to leaf)
   *
   * Convention for `side`:
   *   "left"  = sibling is the LEFT child  → current node is the RIGHT child
   *             → internal hash = H(sibling, current)
   *   "right" = sibling is the RIGHT child → current node is the LEFT child
   *             → internal hash = H(current, sibling)
   */
  private _buildPath(smtKey: HexHash): MerklePathNode[] {
    const bits = hexToBits(smtKey);
    const path: MerklePathNode[] = [];
    let currentPrefix = "";

    for (let depth = 0; depth < TREE_DEPTH; depth++) {
      const bit = bits[depth]!; // 0 = go left, 1 = go right

      // Sibling is on the OPPOSITE branch
      const siblingPrefix = currentPrefix + (bit === 0 ? "1" : "0");
      const emptyChildHash = EMPTY_HASHES[TREE_DEPTH - depth - 1]!;

      const siblingHash = this._hasAnyLeafWithPrefix(siblingPrefix)
        ? this._subtreeHash(depth + 1, siblingPrefix)
        : emptyChildHash;

      path.push({
        sibling: siblingHash,
        // If we went left (bit=0), sibling is on the RIGHT → side="right"
        // If we went right (bit=1), sibling is on the LEFT  → side="left"
        side: bit === 0 ? "right" : "left",
        depth,
      });

      currentPrefix += bit.toString();
    }

    return path;
  }

  /** Check whether any stored leaf has a key that starts with `prefixBits`. */
  private _hasAnyLeafWithPrefix(prefixBits: string): boolean {
    for (const key of this.leaves.keys()) {
      if (hexToBits(key).slice(0, prefixBits.length).join("") === prefixBits) {
        return true;
      }
    }
    return false;
  }

  /**
   * Decode a 256-bit binary prefix string back to a 64-char hex key.
   * Only valid when prefixBits.length === TREE_DEPTH (at leaf level).
   */
  private _bitsToHex(prefixBits: string): HexHash {
    if (prefixBits.length !== TREE_DEPTH) return "";
    let hex = "";
    for (let i = 0; i < TREE_DEPTH; i += 8) {
      hex += parseInt(prefixBits.slice(i, i + 8), 2).toString(16).padStart(2, "0");
    }
    return hex;
  }
}

// ─── Proof verification (stateless) ──────────────────────────────────────────

/**
 * Verify an inclusion proof.
 *
 * proof.leafHash = the actual leaf hash stored in the SMT
 *                = _hashLeaf(smtKey, entityHash)
 *
 * We start from proof.leafHash (already a leaf node hash) and walk the
 * path from depth 255 → depth 0, reconstructing internal nodes up to root.
 *
 * path[0]   = depth-0 sibling (closest to root)
 * path[255] = depth-255 sibling (closest to leaf)
 * → iterate in REVERSE to go leaf→root.
 */
export function verifyInclusion(proof: InclusionProof): boolean {
  try {
    // proof.leafHash is already the computed leaf node hash (H_leaf)
    // Do NOT call _hashLeaf() again — that would double-hash.
    let current = proof.leafHash;

    // Walk from leaf level (depth 255) up to root (depth 0)
    for (let i = proof.path.length - 1; i >= 0; i--) {
      const node = proof.path[i]!;
      if (node.side === "left") {
        // Sibling is left child, current is right child
        current = _hashInternal(node.sibling, current);
      } else {
        // Sibling is right child, current is left child
        current = _hashInternal(current, node.sibling);
      }
    }

    return current === proof.epochRoot;
  } catch {
    return false;
  }
}

/**
 * Verify a non-inclusion proof.
 *
 * Starting from EMPTY_LEAF_HASH (the entity's slot is empty),
 * walk the path in reverse (255→0). The result must equal epochRoot.
 */
export function verifyNonInclusion(proof: NonInclusionProof): boolean {
  try {
    let current = EMPTY_LEAF_HASH;

    for (let i = proof.path.length - 1; i >= 0; i--) {
      const node = proof.path[i]!;
      if (node.side === "left") {
        current = _hashInternal(node.sibling, current);
      } else {
        current = _hashInternal(current, node.sibling);
      }
    }

    return current === proof.epochRoot;
  } catch {
    return false;
  }
}

// ─── Public re-exports for tests ─────────────────────────────────────────────

export {
  EMPTY_LEAF_HASH,
  EMPTY_HASHES,
  _hashLeaf as hashLeaf,
  _hashInternal as hashInternal,
  bitAt,
};
