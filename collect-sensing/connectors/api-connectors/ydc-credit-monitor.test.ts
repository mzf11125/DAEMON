/** Spec: collect-sensing/connectors/api-connectors/ydc-credit-monitor.test.ts | BigPlan Phase 1.4 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { YDCCreditMonitor, YDC_CREDIT_COSTS } from "./ydc-credit-monitor.js";

describe("YDCCreditMonitor", () => {
  it("charges search operations and triggers alert (happy path)", () => {
    const monitor = new YDCCreditMonitor({
      initialBalanceUsd: 12,
      alertThresholdUsd: 10,
      hardLimitUsd: 5,
    });
    const snap = monitor.charge("search", 2500);
    assert.equal(snap.spentUsd, YDC_CREDIT_COSTS.search * 2500);
    assert.equal(snap.alertTriggered, true);
    assert.equal(snap.hardLimitReached, false);
  });

  it("throws when charge would breach hard limit (error case)", () => {
    const monitor = new YDCCreditMonitor({
      initialBalanceUsd: 6,
      alertThresholdUsd: 10,
      hardLimitUsd: 5,
    });
    assert.throws(() => monitor.charge("researchExhaustive", 20), /hard limit/);
  });
});
