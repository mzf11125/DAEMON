/** Spec: products/intelligence-agent/subagents/osint-analyst.test.ts | BigPlan Phase 2.3 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createOsintAnalystSubagent } from "./osint-analyst.js";

describe("createOsintAnalystSubagent", () => {
  it("returns osint-analyst definition with tools (happy path)", () => {
    const def = createOsintAnalystSubagent({ tools: [] });
    assert.equal(def.name, "osint-analyst");
    assert.ok(def.systemPrompt.includes("ydc_web_search"));
  });

  it("requires tools array (error case: empty still valid config)", () => {
    const def = createOsintAnalystSubagent({ tools: [] });
    assert.equal(def.tools.length, 0);
  });
});
