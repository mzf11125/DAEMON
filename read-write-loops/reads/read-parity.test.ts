import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compareReadParity, stablePropertiesJson } from "./read-parity.js";
import type { EntityRecord } from "@daemon/context-ports";
import { entityId, ontologyId } from "@daemon/platform-types";

const key = {
  tenantId: "inst-alpha",
  domainId: "foundation",
  ontologyId: "foundation",
  entityId: "ent-1",
};

function record(overrides: Partial<EntityRecord> = {}): EntityRecord {
  return {
    tenantId: key.tenantId,
    domainId: key.domainId,
    ontologyId: ontologyId(key.ontologyId),
    entityId: entityId(key.entityId),
    entityType: "Party",
    properties: { displayName: "Acme", entityType: "Party" },
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("compareReadParity", () => {
  it("reports match when registry and projection align", () => {
    const r = record();
    const report = compareReadParity(r, { ...r }, key);
    assert.equal(report.status, "match");
    assert.equal(report.reason, "match");
  });

  it("reports projection_missing when only registry exists", () => {
    const report = compareReadParity(record(), undefined, key);
    assert.equal(report.reason, "projection_missing");
  });

  it("reports version_mismatch", () => {
    const reg = record();
    const proj = record({ version: 2 });
    const report = compareReadParity(reg, proj, key);
    assert.equal(report.reason, "version_mismatch");
  });

  it("reports properties_mismatch", () => {
    const reg = record();
    const proj = record({
      properties: { displayName: "Other", entityType: "Party" },
    });
    const report = compareReadParity(reg, proj, key);
    assert.equal(report.reason, "properties_mismatch");
  });
});

describe("stablePropertiesJson", () => {
  it("orders keys deterministically", () => {
    const a = stablePropertiesJson({ z: 1, a: 2 });
    const b = stablePropertiesJson({ a: 2, z: 1 });
    assert.equal(a, b);
  });
});
