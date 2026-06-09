/**
 * Integration tests for DAEMON Provenance — EpochManager + ProvenanceVerifier.
 *
 * Requires a live PostgreSQL instance with migrations applied.
 * Tests are SKIPPED automatically when DAEMON_POSTGRES_URL is not set.
 *
 * Run with:
 *   DAEMON_POSTGRES_URL=postgresql://... \
 *   node --test --import tsx \
 *   data-platform/provenance/provenance.integration.test.ts
 *
 * Or via pnpm:
 *   DAEMON_POSTGRES_URL=... pnpm --filter @daemon/data-platform run test:integration
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { PostgresClient } from "../operational-store/postgres-client.js";
import { EpochManager } from "./epoch-manager.js";
import { ProvenanceVerifier } from "./provenance-verifier.js";
import { verifyInclusion, verifyNonInclusion } from "./smt.js";

// ─── Test DB helpers ──────────────────────────────────────────────────────────

/**
 * Returns the Postgres URL if available and reachable, otherwise null.
 * Integration tests are skipped when this returns null.
 */
async function resolveTestPgUrl(): Promise<string | null> {
  const url = process.env.DAEMON_POSTGRES_URL;
  if (!url) return null;
  const pg = new PostgresClient({ connectionString: url });
  try {
    const result = await pg.query<{ now: Date }>("SELECT NOW() as now");
    return result.rows.length > 0 ? url : null;
  } catch {
    return null;
  } finally {
    await pg.close();
  }
}

/**
 * Generate a unique scope for each test run to avoid interference between runs.
 */
function uniqueScope() {
  const id = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { tenantId: id, domainId: "provenance-integration-test" };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("Provenance Integration Tests", () => {
  let pg: PostgresClient;
  let epochManager: EpochManager;
  let verifier: ProvenanceVerifier;
  let pgUrl: string | null = null;

  before(async () => {
    pgUrl = await resolveTestPgUrl();
    if (!pgUrl) return;
    pg = new PostgresClient({ connectionString: pgUrl });
    epochManager = new EpochManager(pg);
    verifier = new ProvenanceVerifier(epochManager);
  });

  after(async () => {
    if (pg) await pg.close();
  });

  function skipIfNoDb(t: { skip(msg: string): void }): boolean {
    if (!pgUrl) {
      t.skip("DAEMON_POSTGRES_URL not set — set env var to run integration tests");
      return true;
    }
    return false;
  }

  // ─── 2.6.1 Basic epoch lifecycle ──────────────────────────────────────────

  describe("2.6.1 Epoch lifecycle: open → commit → close", () => {
    it("opens a new epoch and commits entities, then closes with a root", async (t) => {
      if (skipIfNoDb(t)) return;
      const { tenantId, domainId } = uniqueScope();

      // Open epoch
      const epochId = await epochManager.openEpoch(tenantId, domainId);
      assert.ok(typeof epochId === "number" && epochId > 0, "epochId must be a positive number");

      // Commit 3 entities
      const entities = [
        { entityId: "entity-alpha", properties: { name: "Alpha", score: 10 }, version: 1 },
        { entityId: "entity-beta",  properties: { name: "Beta",  score: 20 }, version: 1 },
        { entityId: "entity-gamma", properties: { name: "Gamma", score: 30 }, version: 1 },
      ];

      const commits = [];
      for (const e of entities) {
        const result = await epochManager.recordEntityCommit(epochId, {
          tenantId, domainId, ...e,
        });
        assert.ok(result.smtKey, "smtKey must be present");
        assert.ok(result.entityHash, "entityHash must be present");
        commits.push(result);
      }

      // Close epoch
      const closed = await epochManager.closeEpoch(epochId);
      assert.ok(closed.epochRoot, "epoch must have a root after closing");
      assert.equal(closed.epochRoot.length, 64, "epochRoot must be 64-char hex");
      assert.equal(closed.entityCount, 3, "entityCount must match committed entities");

      // Verify epoch record persisted
      const epoch = await epochManager.getEpoch(epochId);
      assert.ok(epoch, "epoch must be retrievable");
      assert.equal(epoch.epochRoot, closed.epochRoot, "persisted root must match");
      assert.ok(epoch.closedAt, "epoch must be marked as closed");
    });

    it("getOrOpenEpoch returns same epoch for same scope", async (t) => {
      if (skipIfNoDb(t)) return;
      const { tenantId, domainId } = uniqueScope();

      const id1 = await epochManager.getOrOpenEpoch(tenantId, domainId);
      const id2 = await epochManager.getOrOpenEpoch(tenantId, domainId);
      assert.equal(id1, id2, "should return the same open epoch");
    });

    it("after closing, getOrOpenEpoch opens a new epoch", async (t) => {
      if (skipIfNoDb(t)) return;
      const { tenantId, domainId } = uniqueScope();

      const id1 = await epochManager.getOrOpenEpoch(tenantId, domainId);
      await epochManager.closeEpoch(id1);

      const id2 = await epochManager.getOrOpenEpoch(tenantId, domainId);
      assert.notEqual(id1, id2, "should open a new epoch after closing");
      assert.ok(id2 > id1, "new epochId must be greater");
    });
  });

  // ─── 2.6.2 Inclusion proof round-trip ─────────────────────────────────────

  describe("2.6.2 Inclusion proof round-trip", () => {
    it("buildInclusionProof → verifyInclusion succeeds for committed entity", async (t) => {
      if (skipIfNoDb(t)) return;
      const { tenantId, domainId } = uniqueScope();
      const epochId = await epochManager.openEpoch(tenantId, domainId);

      await epochManager.recordEntityCommit(epochId, {
        tenantId, domainId,
        entityId: "proven-entity",
        properties: { label: "Proven" },
        version: 1,
      });

      const closed = await epochManager.closeEpoch(epochId);

      const proof = await epochManager.buildInclusionProof(tenantId, domainId, "proven-entity", epochId);
      assert.ok(proof, "inclusion proof must be built");
      assert.equal(proof.epochRoot, closed.epochRoot, "proof must reference closed epoch root");
      assert.equal(proof.type, "inclusion");

      const valid = verifyInclusion(proof);
      assert.ok(valid, "inclusion proof must verify successfully");
    });

    it("tampered proof fails verification", async (t) => {
      if (skipIfNoDb(t)) return;
      const { tenantId, domainId } = uniqueScope();
      const epochId = await epochManager.openEpoch(tenantId, domainId);

      await epochManager.recordEntityCommit(epochId, {
        tenantId, domainId,
        entityId: "tamper-entity",
        properties: { secret: "classified" },
        version: 1,
      });
      await epochManager.closeEpoch(epochId);

      const proof = await epochManager.buildInclusionProof(tenantId, domainId, "tamper-entity", epochId);
      assert.ok(proof);

      // Tamper: flip first bit of leafHash
      const tampered = {
        ...proof,
        leafHash: proof.leafHash.replace(/^./, proof.leafHash[0] === "0" ? "1" : "0") as typeof proof.leafHash,
      };

      const valid = verifyInclusion(tampered);
      assert.equal(valid, false, "tampered proof must fail verification");
    });
  });

  // ─── 2.6.3 Non-inclusion proof round-trip ─────────────────────────────────

  describe("2.6.3 Non-inclusion proof round-trip", () => {
    it("buildNonInclusionProof → verifyNonInclusion succeeds for absent entity", async (t) => {
      if (skipIfNoDb(t)) return;
      const { tenantId, domainId } = uniqueScope();
      const epochId = await epochManager.openEpoch(tenantId, domainId);

      // Insert some other entities but NOT "ghost-entity"
      await epochManager.recordEntityCommit(epochId, {
        tenantId, domainId,
        entityId: "real-entity-1",
        properties: { x: 1 },
        version: 1,
      });
      await epochManager.closeEpoch(epochId);

      const proof = await epochManager.buildNonInclusionProof(tenantId, domainId, "ghost-entity", epochId);
      assert.ok(proof, "non-inclusion proof must be built for absent entity");
      assert.equal(proof.type, "non-inclusion");

      const valid = verifyNonInclusion(proof);
      assert.ok(valid, "non-inclusion proof must verify successfully");
    });

    it("returns null non-inclusion proof for entity that IS present", async (t) => {
      if (skipIfNoDb(t)) return;
      const { tenantId, domainId } = uniqueScope();
      const epochId = await epochManager.openEpoch(tenantId, domainId);

      await epochManager.recordEntityCommit(epochId, {
        tenantId, domainId,
        entityId: "present-entity",
        properties: { x: 1 },
        version: 1,
      });
      await epochManager.closeEpoch(epochId);

      // Should NOT be able to generate non-inclusion proof for an entity that exists
      const proof = await epochManager.buildNonInclusionProof(tenantId, domainId, "present-entity", epochId);
      assert.equal(proof, null, "must not return non-inclusion proof for present entity");
    });
  });

  // ─── 2.6.4 Forensic absence check ────────────────────────────────────────

  describe("2.6.4 Forensic absence check", () => {
    it("genuinelyAbsent when entity was never committed", async (t) => {
      if (skipIfNoDb(t)) return;
      const { tenantId, domainId } = uniqueScope();
      const epochId = await epochManager.openEpoch(tenantId, domainId);
      await epochManager.recordEntityCommit(epochId, {
        tenantId, domainId,
        entityId: "other-entity",
        properties: { y: 2 },
        version: 1,
      });
      await epochManager.closeEpoch(epochId);

      const result = await verifier.checkForensicAbsence(
        tenantId, domainId, "never-existed-entity", epochId,
      );

      assert.equal(result.genuinelyAbsent, true, "must report genuinely absent");
      assert.equal(result.suspectedTampering, false, "must not flag tampering");
      assert.ok(result.nonInclusionProof, "must return non-inclusion proof");
    });

    it("suspectedTampering when entity IS in provenance log but not in Neo4j simulation", async (t) => {
      if (skipIfNoDb(t)) return;
      const { tenantId, domainId } = uniqueScope();
      const epochId = await epochManager.openEpoch(tenantId, domainId);

      // Commit entity to provenance (simulating it was in PostgreSQL)
      await epochManager.recordEntityCommit(epochId, {
        tenantId, domainId,
        entityId: "deleted-by-rogue-dba",
        properties: { evidence: "critical" },
        version: 1,
      });
      await epochManager.closeEpoch(epochId);

      // Forensic check: entity is "absent from Neo4j" (we pass epochId to indicate which epoch to check)
      const result = await verifier.checkForensicAbsence(
        tenantId, domainId, "deleted-by-rogue-dba", epochId,
      );

      assert.equal(result.suspectedTampering, true, "must flag suspected tampering");
      assert.equal(result.genuinelyAbsent, false, "must not report as genuinely absent");
      assert.ok(result.inclusionProof, "must return inclusion proof proving entity existed");
      assert.ok(verifyInclusion(result.inclusionProof!), "inclusion proof must be valid");
    });
  });

  // ─── 2.6.5 Hash chain integrity ───────────────────────────────────────────

  describe("2.6.5 Epoch hash chain verification", () => {
    it("verifyEpochChain succeeds for 3 consecutive epochs", async (t) => {
      if (skipIfNoDb(t)) return;
      const { tenantId, domainId } = uniqueScope();

      // Epoch 1
      const e1 = await epochManager.openEpoch(tenantId, domainId);
      await epochManager.recordEntityCommit(e1, {
        tenantId, domainId, entityId: "entity-e1",
        properties: { epoch: 1 }, version: 1,
      });
      await epochManager.closeEpoch(e1);

      // Epoch 2
      const e2 = await epochManager.openEpoch(tenantId, domainId);
      await epochManager.recordEntityCommit(e2, {
        tenantId, domainId, entityId: "entity-e2",
        properties: { epoch: 2 }, version: 1,
      });
      await epochManager.closeEpoch(e2);

      // Epoch 3
      const e3 = await epochManager.openEpoch(tenantId, domainId);
      await epochManager.recordEntityCommit(e3, {
        tenantId, domainId, entityId: "entity-e3",
        properties: { epoch: 3 }, version: 1,
      });
      await epochManager.closeEpoch(e3);

      // Verify chain starting from epoch 1
      const chain = await epochManager.verifyEpochChain(tenantId, domainId, e1);
      assert.equal(chain.valid, true, "hash chain must be valid for 3 consecutive epochs");
      assert.equal(chain.brokenAt, undefined, "brokenAt must be undefined for valid chain");
    });
  });
});
