import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { diffPacks, buildProposedPackFromOverrides } from "./pack-diff.js";
import { loadFoundationPack } from "./load-pack.js";

describe("pack-diff", () => {
  it("treats required field removal as breaking", () => {
    const baseline = loadFoundationPack();
    const proposed = buildProposedPackFromOverrides(baseline, {
      entities: {
        Case: {
          fields: [{ name: "status", type: "string", required: false }],
        },
      },
    });
    const summary = diffPacks(baseline, proposed);
    assert.equal(summary.breaking, true);
    assert.equal(summary.semverBump, "major");
    assert.ok(
      summary.changes.some((c) => c.changeType === "field_remove" && c.field === "title"),
    );
  });

  it("allows optional field add as non-breaking", () => {
    const baseline = loadFoundationPack();
    const caseModel = baseline.models.get("Case")!;
    const fields = caseModel.fields();
    const proposed = buildProposedPackFromOverrides(baseline, {
      entities: {
        Case: {
          fields: [
            ...fields.map((f) => ({
              name: f.name,
              type: f.type,
              required: f.required,
            })),
            { name: "priority", type: "string", required: false },
          ],
        },
      },
    });
    const summary = diffPacks(baseline, proposed);
    assert.equal(summary.breaking, false);
    assert.equal(summary.semverBump, "minor");
  });
});
