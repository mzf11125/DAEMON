import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GovernancePolicyLoader } from "./governance-policy-loader.js";

describe("GovernancePolicyLoader", () => {
  it("requires approvals for breaking diff", () => {
    const loader = new GovernancePolicyLoader({
      approvalGates: [{ resource: "schema-change", approvers: 2 }],
    });
    const gate = loader.assertSchemaChange({
      packId: "foundation",
      diff: {
        breaking: true,
        semverBump: "major",
        changes: [{ changeType: "field_remove", field: "title" }],
      },
      approvals: [],
    });
    assert.equal(gate.allowed, false);
    assert.ok(gate.obligations?.includes("collect-approvals"));
  });

  it("allows non-breaking diff without approvals", () => {
    const loader = new GovernancePolicyLoader({
      approvalGates: [{ resource: "schema-change", approvers: 2 }],
    });
    const gate = loader.assertSchemaChange({
      packId: "foundation",
      diff: {
        breaking: false,
        semverBump: "minor",
        changes: [{ changeType: "field_add", field: "priority" }],
      },
    });
    assert.equal(gate.allowed, true);
  });
});
