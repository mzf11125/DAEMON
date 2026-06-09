/** Spec: products/intelligence-agent/tools/compliance/str-report-generator.test.ts | BigPlan Phase 0.4 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { STRReportGenerator } from "./str-report-generator.js";

describe("STRReportGenerator", () => {
  const generator = new STRReportGenerator();

  it("generates STR markdown (happy path)", () => {
    const out = generator.generate({
      entityName: "PT Example Corp",
      entityId: "ent-001",
      suspiciousActivity: "Multiple near-threshold transfers detected within 24h.",
      transactionSummary: "12 inbound transfers totaling IDR 950M.",
      riskIndicators: ["structuring", "high_frequency"],
      evidenceRefs: ["ydc-intelligence:rec-42"],
      region: "ID",
    });

    assert.ok(out.markdown.includes("PT Example Corp"));
    assert.ok(out.markdown.includes("structuring"));
    assert.ok(out.reportId.startsWith("STR-"));
    assert.equal(out.region, "ID");
  });

  it("throws when required fields are missing (error case)", () => {
    assert.throws(
      () => generator.generate({ entityName: "  ", suspiciousActivity: "x" }),
      /entityName/,
    );
    assert.throws(
      () => generator.generate({ entityName: "Acme", suspiciousActivity: "" }),
      /suspiciousActivity/,
    );
  });
});
