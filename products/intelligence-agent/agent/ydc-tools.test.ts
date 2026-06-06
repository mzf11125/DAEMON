/** Spec: products/intelligence-agent/agent/ydc-tools.test.ts | BigPlan Phase 2.2 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createYdcTools, isYdcEnabled } from "./ydc-tools.js";

describe("ydc-tools", () => {
  it("reports disabled when YDC_API_KEY unset (happy path)", () => {
    const prev = process.env.YDC_API_KEY;
    delete process.env.YDC_API_KEY;
    assert.equal(isYdcEnabled(), false);
    if (prev !== undefined) process.env.YDC_API_KEY = prev;
  });

  it("ydc_web_search returns configuration error without API key (error case)", async () => {
    const prev = process.env.YDC_API_KEY;
    delete process.env.YDC_API_KEY;
    const [searchTool] = createYdcTools();
    const out = await searchTool.invoke({ query: "test entity" });
    assert.match(String(out), /YDC_API_KEY/);
    if (prev !== undefined) process.env.YDC_API_KEY = prev;
  });
});
