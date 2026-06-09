/** BigPlan Phase 2.4 | STR Narrator Subagent tests */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { strNarratorSubagent, generateSTRNarrativeTool } from "./str-narrator.js";

const originalFetch = globalThis.fetch;

describe("strNarratorSubagent", () => {
  it("exports str-narrator definition (happy path)", () => {
    assert.equal(strNarratorSubagent.name, "str-narrator");
    assert.ok(strNarratorSubagent.systemPrompt.includes("PPATK"));
    assert.equal(strNarratorSubagent.tools.length, 1);
  });
});

describe("generateSTRNarrativeTool", () => {
  beforeEach(() => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const path = String(url);
      if (path.includes("/risk-scores/")) {
        return new Response(
          JSON.stringify({
            entityId: "ent-001",
            compositeScore: 72,
            riskLevel: "HIGH",
            breakdown: {
              transactionRisk: 80,
              walletTaintScore: 0,
              sanctionsHitScore: 50,
              adverseMediaScore: 60,
              darkwebExposureScore: 20,
              politicalExposureScore: 0,
            },
            evidence: [{ sourceId: "osint-1" }],
            calculatedAt: new Date().toISOString(),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ id: "ent-001", name: "Budi Santoso" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("generates STR draft narrative with risk data (happy path)", async () => {
    const result = await generateSTRNarrativeTool.invoke({
      entityId: "ent-001",
      transactionIds: ["tx-1", "tx-2"],
      typologyType: "STRUCTURING",
      analystId: "analyst-42",
    });
    const text = String(result);
    assert.ok(text.includes("LAPORAN TRANSAKSI KEUANGAN MENCURIGAKAN"));
    assert.ok(text.includes("STRUCTURING"));
    assert.ok(text.includes("72/100"));
    assert.ok(text.includes("analyst-42"));
  });

  it("returns error when entity fetch fails (error case)", async () => {
    globalThis.fetch = (async () =>
      new Response("not found", { status: 404 })) as typeof fetch;
    const result = await generateSTRNarrativeTool.invoke({
      entityId: "missing",
      transactionIds: ["tx-1"],
      typologyType: "OTHER",
      analystId: "analyst-1",
    });
    assert.ok(String(result).includes("Error: cannot fetch entity"));
  });
});
