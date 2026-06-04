import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ReadRouter } from "./read-router.js";
import { globalRegistry } from "@daemon/ontology";
import { EntityReadModelProjection } from "@daemon/ontology/projections/read-models/entity-read-model.js";
import { globalReadParityMetrics } from "./read-parity-metrics.js";
import { DaemonError, ErrorCodes, ontologyId } from "@daemon/platform-types";

describe("ReadRouter", () => {
  it("returns registered entity", () => {
    const ont = ontologyId("Test");
    const e = globalRegistry.register(ont, { x: 1 });
    const router = new ReadRouter();
    const got = router.route({ ontologyId: ont, entityId: e.entityId });
    assert.equal(got.properties.x, 1);
  });

  it("throws DaemonError NOT_FOUND for missing entity", () => {
    const router = new ReadRouter();
    assert.throws(
      () => router.route({ ontologyId: ontologyId("default"), entityId: "my-entity" }),
      (err: unknown) =>
        err instanceof DaemonError &&
        err.code === ErrorCodes.NOT_FOUND &&
        err.status === 404,
    );
  });

  it("prefers projection when useProjection is enabled", () => {
    const ont = ontologyId("ProjOnt");
    const projection = new EntityReadModelProjection();
    const registry = globalRegistry;
    const record = registry.register(ont, {
      name: "from-store",
      entityType: "Party",
    });
    projection.apply({
      kind: "registered",
      record: {
        ...record,
        properties: { name: "from-projection", entityType: "Party" },
      },
    });
    const router = new ReadRouter(registry, {
      useProjection: true,
      projection,
    });
    const got = router.route({ ontologyId: ont, entityId: record.entityId });
    assert.equal(got.properties.name, "from-projection");
  });

  describe("parity check", () => {
    beforeEach(() => {
      globalReadParityMetrics.reset();
    });

    it("records match when registry and projection align", () => {
      const ont = ontologyId("ParityMatch");
      const projection = new EntityReadModelProjection();
      const registry = globalRegistry;
      const record = registry.register(ont, {
        name: "aligned",
        entityType: "Party",
      });
      projection.apply({ kind: "registered", record });
      const router = new ReadRouter(registry, {
        useProjection: true,
        parityCheck: true,
        projection,
        parityMetrics: globalReadParityMetrics,
      });
      router.route({ ontologyId: ont, entityId: record.entityId });
      const snap = globalReadParityMetrics.snapshot();
      assert.equal(snap.checks, 1);
      assert.equal(snap.matches, 1);
    });

    it("records mismatch when projection is stale", () => {
      const ont = ontologyId("ParityStale");
      const projection = new EntityReadModelProjection();
      const registry = globalRegistry;
      const record = registry.register(ont, {
        name: "registry",
        entityType: "Party",
      });
      projection.apply({
        kind: "registered",
        record: {
          ...record,
          properties: { name: "stale-projection", entityType: "Party" },
        },
      });
      const reports: { reason: string }[] = [];
      const router = new ReadRouter(registry, {
        useProjection: true,
        parityCheck: true,
        projection,
        parityMetrics: globalReadParityMetrics,
        onParityReport: (r) => reports.push({ reason: r.reason }),
      });
      router.route({ ontologyId: ont, entityId: record.entityId });
      assert.equal(reports[0]?.reason, "properties_mismatch");
      const snap = globalReadParityMetrics.snapshot();
      assert.equal(snap.checks, 1);
      assert.equal(snap.matches, 0);
      assert.equal(snap.mismatches.get("properties_mismatch"), 1);
    });
  });
});
