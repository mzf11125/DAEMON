/** Spec: products/intelligence-agent/agent/daemon-intelligence-agent.test.ts | BigPlan Phase 2.1 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getDaemonIntelligenceAgentCapabilities } from "./daemon-intelligence-agent.js";

describe("daemon-intelligence-agent", () => {
  it("exports capabilities metadata (happy path)", () => {
    const caps = getDaemonIntelligenceAgentCapabilities();
    assert.deepEqual(caps.subagents, [
      "osint-analyst",
      "darkweb-analyst",
      "graph-analyst",
      "str-narrator",
    ]);
    assert.ok(caps.packageRoot.includes("intelligence-agent"));
  });

  it("reports ydc disabled without API key (error case)", () => {
    const prev = process.env.YDC_API_KEY;
    delete process.env.YDC_API_KEY;
    const caps = getDaemonIntelligenceAgentCapabilities();
    assert.equal(caps.ydcEnabled, false);
    if (prev !== undefined) process.env.YDC_API_KEY = prev;
  });
});
