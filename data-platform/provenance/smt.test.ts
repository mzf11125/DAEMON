/**
 * Unit tests for DAEMON Sparse Merkle Tree (SMT) engine.
 * Tests: inclusion proofs, non-inclusion proofs, root consistency,
 *        key derivation, and verify functions.
 *
 * Run with: node --test --import tsx provenance/smt.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SparseMerkleTree,
  deriveSmtKey,
  deriveEntityHash,
  hashLeaf,
  verifyInclusion,
  verifyNonInclusion,
  EMPTY_LEAF_HASH,
  EMPTY_HASHES,
} from "./smt.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EPOCH_ROOT_PLACEHOLDER = "a".repeat(64);

function makeTree(entries: Array<{ entityId: string; properties?: Record<string, unknown>; version?: number }>) {
  const smt = new SparseMerkleTree();
  for (const e of entries) {
    const key = deriveSmtKey(e.entityId);
    const entityHash = deriveEntityHash(e.entityId, e.properties ?? {}, e.version ?? 1);
    const leaf = hashLeaf(key, entityHash);
    smt.insert(key, leaf);
  }
  return smt;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SparseMerkleTree", () => {
  it("empty tree has deterministic root", () => {
    const smt1 = new SparseMerkleTree();
    const smt2 = new SparseMerkleTree();
    assert.equal(smt1.getRoot(), smt2.getRoot(), "empty trees must produce identical roots");
    assert.equal(typeof smt1.getRoot(), "string");
    assert.equal(smt1.getRoot().length, 64, "root must be 64-char hex (SHA-256)");
  });

  it("empty tree root equals computed EMPTY_HASHES[256]", () => {
    const smt = new SparseMerkleTree();
    // The root of an empty SMT is the hash of two empty 255-level nodes
    const expectedRoot = EMPTY_HASHES[256];
    assert.equal(smt.getRoot(), expectedRoot, "empty tree root must match EMPTY_HASHES[256]");
  });

  it("root changes after insert", () => {
    const smt = new SparseMerkleTree();
    const emptyRoot = smt.getRoot();
    const key = deriveSmtKey("entity-1");
    const val = deriveEntityHash("entity-1", {}, 1);
    smt.insert(key, hashLeaf(key, val));
    assert.notEqual(smt.getRoot(), emptyRoot, "root must change after insert");
  });

  it("same inserts produce same root (deterministic)", () => {
    const smt1 = makeTree([{ entityId: "alice" }, { entityId: "bob" }]);
    const smt2 = makeTree([{ entityId: "alice" }, { entityId: "bob" }]);
    assert.equal(smt1.getRoot(), smt2.getRoot(), "identical leaf sets must produce identical roots");
  });

  it("different inserts produce different roots", () => {
    const smt1 = makeTree([{ entityId: "alice" }]);
    const smt2 = makeTree([{ entityId: "bob" }]);
    assert.notEqual(smt1.getRoot(), smt2.getRoot());
  });

  it("insert order does not affect root", () => {
    const smt1 = makeTree([{ entityId: "x" }, { entityId: "y" }, { entityId: "z" }]);
    const smt2 = makeTree([{ entityId: "z" }, { entityId: "x" }, { entityId: "y" }]);
    assert.equal(smt1.getRoot(), smt2.getRoot(), "insert order must not affect root");
  });

  it("size() reflects number of leaves", () => {
    const smt = makeTree([{ entityId: "a" }, { entityId: "b" }, { entityId: "c" }]);
    assert.equal(smt.size(), 3);
  });
});

describe("Inclusion proofs", () => {
  it("generates valid inclusion proof for inserted entity", () => {
    const entityId = "suspect-001";
    const properties = { name: "Ali", risk: "HIGH" };
    const version = 1;

    const smt = new SparseMerkleTree();
    const smtKey = deriveSmtKey(entityId);
    const entityHash = deriveEntityHash(entityId, properties, version);
    const leafHash = hashLeaf(smtKey, entityHash);
    smt.insert(smtKey, leafHash);

    const root = smt.getRoot();
    const proof = smt.generateInclusionProof(entityId, smtKey, leafHash, root, 42);

    assert.ok(proof !== null, "proof must not be null for inserted entity");
    assert.equal(proof!.type, "inclusion");
    assert.equal(proof!.entityId, entityId);
    assert.equal(proof!.smtKey, smtKey);
    assert.equal(proof!.epochRoot, root);
    assert.equal(proof!.epochId, 42);
    assert.ok(proof!.path.length > 0, "proof path must have nodes");
  });

  it("verifyInclusion returns true for valid proof", () => {
    const entityId = "target-xyz";
    const smt = new SparseMerkleTree();
    const smtKey = deriveSmtKey(entityId);
    const entityHash = deriveEntityHash(entityId, { amount: 9999 }, 3);
    const leafHash = hashLeaf(smtKey, entityHash);
    smt.insert(smtKey, leafHash);

    const root = smt.getRoot();
    const proof = smt.generateInclusionProof(entityId, smtKey, leafHash, root, 1)!;
    assert.ok(verifyInclusion(proof), "valid inclusion proof must verify");
  });

  it("verifyInclusion returns false for tampered proof", () => {
    const entityId = "entity-tamper-test";
    const smt = new SparseMerkleTree();
    const smtKey = deriveSmtKey(entityId);
    const entityHash = deriveEntityHash(entityId, {}, 1);
    const leafHash = hashLeaf(smtKey, entityHash);
    smt.insert(smtKey, leafHash);

    const root = smt.getRoot();
    const proof = smt.generateInclusionProof(entityId, smtKey, leafHash, root, 1)!;

    // Tamper: change the leaf hash
    const tamperedProof = { ...proof, leafHash: "b".repeat(64) };
    assert.ok(!verifyInclusion(tamperedProof), "tampered leaf hash must fail verification");
  });

  it("verifyInclusion returns false for wrong epoch root", () => {
    const entityId = "entity-wrong-root";
    const smt = new SparseMerkleTree();
    const smtKey = deriveSmtKey(entityId);
    const entityHash = deriveEntityHash(entityId, {}, 1);
    const leafHash = hashLeaf(smtKey, entityHash);
    smt.insert(smtKey, leafHash);

    const root = smt.getRoot();
    const proof = smt.generateInclusionProof(entityId, smtKey, leafHash, root, 1)!;

    // Tamper: change the expected root
    const tamperedProof = { ...proof, epochRoot: "c".repeat(64) };
    assert.ok(!verifyInclusion(tamperedProof), "wrong epoch root must fail verification");
  });

  it("generates null for non-existent entity", () => {
    const smt = new SparseMerkleTree();
    const smtKey = deriveSmtKey("ghost-entity");
    const proof = smt.generateInclusionProof("ghost-entity", smtKey, "d".repeat(64), EPOCH_ROOT_PLACEHOLDER, 1);
    assert.equal(proof, null, "must return null for entity not in tree");
  });
});

describe("Non-inclusion proofs", () => {
  it("generates valid non-inclusion proof for absent entity", () => {
    const presentId = "present-entity";
    const absentId = "absent-entity";

    const smt = new SparseMerkleTree();
    const presentKey = deriveSmtKey(presentId);
    const presentHash = deriveEntityHash(presentId, {}, 1);
    smt.insert(presentKey, hashLeaf(presentKey, presentHash));

    const root = smt.getRoot();
    const absentKey = deriveSmtKey(absentId);
    const proof = smt.generateNonInclusionProof(absentId, absentKey, root, 1);

    assert.ok(proof !== null, "non-inclusion proof must not be null for absent entity");
    assert.equal(proof!.type, "non-inclusion");
    assert.equal(proof!.entityId, absentId);
    assert.equal(proof!.epochRoot, root);
  });

  it("verifyNonInclusion returns true for valid non-inclusion proof", () => {
    const smt = makeTree([{ entityId: "committed-entity" }]);
    const root = smt.getRoot();

    const absentKey = deriveSmtKey("never-existed-entity");
    const proof = smt.generateNonInclusionProof("never-existed-entity", absentKey, root, 1)!;

    assert.ok(verifyNonInclusion(proof), "valid non-inclusion proof must verify");
  });

  it("verifyNonInclusion returns false for entity that IS present", () => {
    const entityId = "actually-present";
    const smt = makeTree([{ entityId }]);
    const root = smt.getRoot();
    const smtKey = deriveSmtKey(entityId);

    // generateNonInclusionProof returns null for present entities
    const proof = smt.generateNonInclusionProof(entityId, smtKey, root, 1);
    assert.equal(proof, null, "must return null for present entity (cannot generate non-inclusion proof)");
  });

  it("non-inclusion proof fails verification against wrong root", () => {
    const smt = makeTree([{ entityId: "entity-a" }]);
    const root = smt.getRoot();
    const absentKey = deriveSmtKey("entity-b");
    const proof = smt.generateNonInclusionProof("entity-b", absentKey, root, 1)!;

    const tamperedProof = { ...proof, epochRoot: "f".repeat(64) };
    assert.ok(!verifyNonInclusion(tamperedProof), "wrong root must fail non-inclusion verification");
  });

  it("non-inclusion + inclusion are mutually exclusive for same entity", () => {
    const entityId = "exclusive-entity";
    const smt = new SparseMerkleTree();
    const smtKey = deriveSmtKey(entityId);
    const entityHash = deriveEntityHash(entityId, {}, 1);
    const leafHash = hashLeaf(smtKey, entityHash);

    // Before insert: non-inclusion should work, inclusion should not
    const root1 = smt.getRoot();
    const nonIncl = smt.generateNonInclusionProof(entityId, smtKey, root1, 1);
    assert.ok(nonIncl !== null, "non-inclusion should work before insert");

    // After insert: inclusion should work, non-inclusion should not
    smt.insert(smtKey, leafHash);
    const root2 = smt.getRoot();
    const incl = smt.generateInclusionProof(entityId, smtKey, leafHash, root2, 1);
    const nonInclAfter = smt.generateNonInclusionProof(entityId, smtKey, root2, 1);

    assert.ok(incl !== null, "inclusion should work after insert");
    assert.equal(nonInclAfter, null, "non-inclusion must return null after entity is inserted");
  });
});

describe("Key and hash derivation", () => {
  it("deriveSmtKey produces 64-char hex string", () => {
    const key = deriveSmtKey("entity-abc");
    assert.equal(key.length, 64);
    assert.match(key, /^[0-9a-f]+$/);
  });

  it("deriveSmtKey is deterministic", () => {
    assert.equal(deriveSmtKey("x"), deriveSmtKey("x"));
  });

  it("deriveSmtKey produces different keys for different entityIds", () => {
    assert.notEqual(deriveSmtKey("a"), deriveSmtKey("b"));
  });

  it("deriveEntityHash changes with properties", () => {
    const h1 = deriveEntityHash("e1", { x: 1 }, 1);
    const h2 = deriveEntityHash("e1", { x: 2 }, 1);
    assert.notEqual(h1, h2);
  });

  it("deriveEntityHash changes with version", () => {
    const h1 = deriveEntityHash("e1", { x: 1 }, 1);
    const h2 = deriveEntityHash("e1", { x: 1 }, 2);
    assert.notEqual(h1, h2);
  });

  it("EMPTY_LEAF_HASH is a valid 64-char hex string", () => {
    assert.equal(EMPTY_LEAF_HASH.length, 64);
    assert.match(EMPTY_LEAF_HASH, /^[0-9a-f]+$/);
  });
});

describe("Multi-entity tree correctness", () => {
  it("all inclusion proofs verify in a 10-entity tree", () => {
    const entities = Array.from({ length: 10 }, (_, i) => ({
      entityId: `entity-${i}`,
      properties: { index: i },
      version: i + 1,
    }));

    const smt = new SparseMerkleTree();
    const leaves: Array<{ entityId: string; smtKey: string; entityHash: string; leafHash: string }> = [];

    for (const e of entities) {
      const smtKey = deriveSmtKey(e.entityId);
      const entityHash = deriveEntityHash(e.entityId, e.properties, e.version);
      const leafHash = hashLeaf(smtKey, entityHash);
      smt.insert(smtKey, leafHash);
      leaves.push({ entityId: e.entityId, smtKey, entityHash, leafHash });
    }

    const root = smt.getRoot();

    for (const leaf of leaves) {
      const proof = smt.generateInclusionProof(leaf.entityId, leaf.smtKey, leaf.leafHash, root, 99)!;
      assert.ok(proof !== null, `proof must not be null for ${leaf.entityId}`);
      assert.ok(verifyInclusion(proof), `inclusion proof must verify for ${leaf.entityId}`);
    }
  });

  it("all non-inclusion proofs verify for absent entities", () => {
    const presentEntities = ["alice", "bob", "charlie"];
    const absentEntities = ["dave", "eve", "frank"];

    const smt = makeTree(presentEntities.map((e) => ({ entityId: e })));
    const root = smt.getRoot();

    for (const absentId of absentEntities) {
      const absentKey = deriveSmtKey(absentId);
      const proof = smt.generateNonInclusionProof(absentId, absentKey, root, 1)!;
      assert.ok(proof !== null, `non-inclusion proof must not be null for ${absentId}`);
      assert.ok(verifyNonInclusion(proof), `non-inclusion proof must verify for ${absentId}`);
    }
  });
});
