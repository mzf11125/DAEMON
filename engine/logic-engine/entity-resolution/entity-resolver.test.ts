/** BigPlan Phase 4.1 | Entity Resolution Engine tests */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EntityResolver, type EntityCandidate } from "./entity-resolver.js";

function candidate(
  entityId: string,
  attrs: EntityCandidate["attributes"],
): EntityCandidate {
  return {
    entityId,
    ontologyType: "Person",
    packId: "ppatk-aml",
    attributes: attrs,
    confidence: 1,
    sourceId: "test",
  };
}

describe("EntityResolver", () => {
  const resolver = new EntityResolver();

  it("merges on exact NIK match (happy path)", async () => {
    const incoming = candidate("new-1", {
      name: "Budi Santoso",
      nationalId: "3201010101010001",
    });
    const existing = candidate("existing-1", {
      name: "Budi S.",
      nationalId: "3201010101010001",
    });
    const decision = await resolver.resolve(incoming, [existing]);
    assert.equal(decision.action, "MERGE");
    if (decision.action === "MERGE") {
      assert.equal(decision.targetEntityId, "existing-1");
      assert.equal(decision.confidence, 1.0);
    }
  });

  it("merges on exact NPWP match", async () => {
    const incoming = candidate("new-2", { taxId: "01.234.567.8-901.000" });
    const existing = candidate("existing-2", { taxId: "01.234.567.8-901.000" });
    const decision = await resolver.resolve(incoming, [existing]);
    assert.equal(decision.action, "MERGE");
  });

  it("merges on typo name with high similarity", async () => {
    const incoming = candidate("new-3", { name: "Budi Santoso" });
    const existing = candidate("existing-3", { name: "Budi Santaso" });
    const decision = await resolver.resolve(incoming, [existing]);
    assert.equal(decision.action, "MERGE");
    if (decision.action === "MERGE") {
      assert.ok(decision.confidence >= 0.92);
    }
  });

  it("merges when name and date of birth match", async () => {
    const incoming = candidate("new-4", {
      name: "Siti Aminah",
      dateOfBirth: "1990-05-15",
    });
    const existing = candidate("existing-4", {
      name: "Siti Aminah",
      dateOfBirth: "1990-05-15",
    });
    const decision = await resolver.resolve(incoming, [existing]);
    assert.equal(decision.action, "MERGE");
  });

  it("returns NEW for very different names", async () => {
    const incoming = candidate("new-5", { name: "Budi Santoso" });
    const existing = candidate("existing-5", { name: "Maria Garcia" });
    const decision = await resolver.resolve(incoming, [existing]);
    assert.equal(decision.action, "NEW");
  });

  it("returns REVIEW_REQUIRED for ambiguous similar candidates", async () => {
    const incoming = candidate("new-6", { name: "Budi Santoso Wirawan" });
    const c1 = candidate("cand-1", { name: "Budi Wirawan" });
    const c2 = candidate("cand-2", { name: "Budi S Wirawan" });
    const decision = await resolver.resolve(incoming, [c1, c2]);
    assert.equal(decision.action, "REVIEW_REQUIRED");
    if (decision.action === "REVIEW_REQUIRED") {
      assert.equal(decision.candidates.length, 2);
    }
  });

  it("normalizes bin connector names to merge", async () => {
    const incoming = candidate("new-7", { name: "Ahmad bin Yusuf" });
    const existing = candidate("existing-7", { name: "Ahmad Yusuf" });
    const decision = await resolver.resolve(incoming, [existing]);
    assert.equal(decision.action, "MERGE");
  });
});
