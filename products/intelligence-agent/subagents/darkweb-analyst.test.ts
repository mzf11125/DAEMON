/** Spec: products/intelligence-agent/subagents/darkweb-analyst.test.ts | BigPlan Phase 2.4 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDarkwebAnalystSubagent } from "./darkweb-analyst.js";

describe("createDarkwebAnalystSubagent", () => {
  it("returns darkweb-analyst with PPATK legal framing (happy path)", () => {
    const def = createDarkwebAnalystSubagent({ tools: [] });
    assert.equal(def.name, "darkweb-analyst");
    assert.ok(def.systemPrompt.includes("Pasal 44"));
  });

  it("refuses illegal use in system prompt (error case guidance)", () => {
    const def = createDarkwebAnalystSubagent({ tools: [] });
    assert.ok(def.systemPrompt.includes("Refuse unauthorized"));
  });
});
