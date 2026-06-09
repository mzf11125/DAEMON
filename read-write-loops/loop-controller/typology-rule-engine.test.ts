/** BigPlan Phase 4.4 | Typology Rule Engine tests */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TypologyRuleEngine } from "./typology-rule-engine.js";

describe("TypologyRuleEngine", () => {
  const engine = new TypologyRuleEngine();

  it("detects STRUCTURING when enough indicators match (happy path)", () => {
    const result = engine.evaluate({
      transactionCount7Days: 8,
      hasRoundNumbers: true,
      maxSingleTransactionIDR: 100_000_000,
      velocitySpike: false,
    });
    const structuring = result.detectedTypologies.find(
      (t) => t.typologyId === "STRUCTURING",
    );
    assert.ok(structuring);
    assert.equal(structuring?.severity, "HIGH");
    assert.ok(structuring!.matchedIndicators.length >= 2);
  });

  it("detects CRYPTO_MIXING on single mixer indicator", () => {
    const result = engine.evaluate({ usesMixer: true });
    const mixing = result.detectedTypologies.find(
      (t) => t.typologyId === "CRYPTO_MIXING",
    );
    assert.ok(mixing);
    assert.equal(result.overallRiskLevel, "CRITICAL");
  });

  it("returns LOW overall risk when no typologies match", () => {
    const result = engine.evaluate({});
    assert.equal(result.detectedTypologies.length, 0);
    assert.equal(result.overallRiskLevel, "LOW");
  });
});
