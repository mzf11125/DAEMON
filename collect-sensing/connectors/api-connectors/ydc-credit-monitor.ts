/** Spec: collect-sensing/connectors/api-connectors/ydc-credit-monitor.ts | BigPlan Phase 1.4 */
export const YDC_CREDIT_COSTS = {
  search: 0.001,
  searchLivecrawl: 0.005,
  contents: 0.004,
  researchLite: 0.05,
  researchStandard: 0.07,
  researchDeep: 0.09,
  researchExhaustive: 0.1,
} as const;

export type YDCOperation = keyof typeof YDC_CREDIT_COSTS;

export interface YDCCreditMonitorConfig {
  readonly initialBalanceUsd: number;
  readonly alertThresholdUsd: number;
  readonly hardLimitUsd: number;
}

export interface YDCCreditSnapshot {
  readonly balanceUsd: number;
  readonly spentUsd: number;
  readonly alertTriggered: boolean;
  readonly hardLimitReached: boolean;
}

export class YDCCreditMonitor {
  private balanceUsd: number;
  private spentUsd = 0;

  constructor(private readonly config: YDCCreditMonitorConfig) {
    if (config.initialBalanceUsd < 0) {
      throw new Error("YDCCreditMonitor initialBalanceUsd must be >= 0");
    }
    this.balanceUsd = config.initialBalanceUsd;
  }

  estimateCost(operation: YDCOperation, count = 1): number {
    if (count < 1) {
      throw new Error("YDCCreditMonitor count must be >= 1");
    }
    return YDC_CREDIT_COSTS[operation] * count;
  }

  charge(operation: YDCOperation, count = 1): YDCCreditSnapshot {
    const cost = this.estimateCost(operation, count);
    if (this.balanceUsd - cost < this.config.hardLimitUsd) {
      throw new Error(
        `YDC credit hard limit reached: balance ${this.balanceUsd.toFixed(4)} USD, cost ${cost.toFixed(4)} USD, hard limit ${this.config.hardLimitUsd} USD`,
      );
    }
    this.balanceUsd -= cost;
    this.spentUsd += cost;
    return this.snapshot();
  }

  snapshot(): YDCCreditSnapshot {
    const alertTriggered = this.balanceUsd < this.config.alertThresholdUsd;
    const hardLimitReached = this.balanceUsd <= this.config.hardLimitUsd;
    if (alertTriggered) {
      console.warn(
        `[ydc-credit-monitor] balance ${this.balanceUsd.toFixed(4)} USD below alert threshold ${this.config.alertThresholdUsd} USD`,
      );
    }
    return {
      balanceUsd: Number(this.balanceUsd.toFixed(6)),
      spentUsd: Number(this.spentUsd.toFixed(6)),
      alertTriggered,
      hardLimitReached,
    };
  }
}
