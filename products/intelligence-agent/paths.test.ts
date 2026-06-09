/** Spec: products/intelligence-agent/paths.test.ts | BigPlan Phase 0.1 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { skillsPath, ydcIntelligenceConfigPath } from "./paths.js";

describe("intelligence-agent paths", () => {
  it("resolves skills and ydc config paths (happy path)", () => {
    assert.ok(skillsPath("darkweb", "mad-cti.md").includes("skills"));
    assert.ok(ydcIntelligenceConfigPath().endsWith("ydc-intelligence.yaml"));
  });
});
