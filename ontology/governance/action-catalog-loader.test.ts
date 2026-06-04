import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseActionCatalog,
  actionCatalogToPolicyRules,
  onCommittedStepsFor,
  toWorkflowSteps,
} from "./action-catalog-loader.js";

describe("action-catalog-loader", () => {
  it("parses actions into policy rules", () => {
    const manifest = parseActionCatalog({
      actions: [
        { id: "write", resource: "entity", effect: "allow" },
        { id: "ingest", resource: "ingest-job", effect: "allow" },
      ],
    });
    const rules = actionCatalogToPolicyRules(manifest);
    assert.equal(rules.length, 2);
    assert.deepEqual(rules[0], { action: "write", resource: "entity", effect: "allow" });
  });

  it("parses onCommitted workflow steps", () => {
    const manifest = parseActionCatalog({
      actions: [
        {
          id: "write",
          resource: "entity",
          effect: "allow",
          onCommitted: [{ workflow: "entity-write-audit", action: "workflow.execute" }],
        },
      ],
    });
    const steps = onCommittedStepsFor(manifest, "write", "entity");
    assert.equal(steps.length, 1);
    assert.deepEqual(toWorkflowSteps(steps), [
      { id: "entity-write-audit", action: "workflow.execute" },
    ]);
  });
});
