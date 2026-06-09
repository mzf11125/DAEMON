/** Spec: engine/logic-engine/risk-scoring/composite-risk-engine.test.ts | BigPlan Phase 0.3 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CompositeRiskEngine,
  COMPOSITE_RISK_WEIGHTS,
} from "./composite-risk-engine.js";

describe("CompositeRiskEngine", () => {
  const engine = new CompositeRiskEngine();

  it("computes weighted composite score (happy path)", () => {
    const result = engine.score({
      entityId: "entity-1",
      dimensions: {
        transactionRisk: 80,
        walletTaintScore: 60,
        sanctionsHitScore: 40,
        adverseMediaScore: 20,
        darkwebExposureScore: 10,
        politicalExposureScore: 0,
      },
      evidence: [{ sourceId: "ydc-intelligence", recordId: "r1" }],
    });

    const expected =
      80 * COMPOSITE_RISK_WEIGHTS.transactionRisk +
      60 * COMPOSITE_RISK_WEIGHTS.walletTaintScore +
      40 * COMPOSITE_RISK_WEIGHTS.sanctionsHitScore +
      20 * COMPOSITE_RISK_WEIGHTS.adverseMediaScore +
      10 * COMPOSITE_RISK_WEIGHTS.darkwebExposureScore +
      0 * COMPOSITE_RISK_WEIGHTS.politicalExposureScore;

    assert.equal(result.compositeScore, Number(expected.toFixed(2)));
    assert.equal(result.riskLevel, "MEDIUM");
    assert.equal(result.evidence.length, 1);
    assert.ok(result.calculatedAt);
  });

  it("clamps invalid dimension values and defaults missing to zero (error case)", () => {
    const result = engine.score({
      entityId: "entity-2",
      dimensions: {
        transactionRisk: Number.NaN,
        sanctionsHitScore: 150,
      },
    });

    assert.equal(result.breakdown.transactionRisk, 0);
    assert.equal(result.breakdown.sanctionsHitScore, 100);
    assert.equal(result.breakdown.adverseMediaScore, 0);
    assert.equal(result.riskLevel, "LOW");
  });
});
