/** Spec: engine/logic-engine/risk-scoring/composite-risk-engine.ts | BigPlan Phase 0.3 */
import type { EntityId } from "@daemon/platform-types";

export type ISO8601Timestamp = string;
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ProvenanceRef {
  readonly sourceId: string;
  readonly recordId?: string;
  readonly signedAt?: ISO8601Timestamp;
}

export interface CompositeRiskScore {
  readonly entityId: EntityId;
  readonly compositeScore: number;
  readonly riskLevel: RiskLevel;
  readonly breakdown: {
    readonly transactionRisk: number;
    readonly walletTaintScore: number;
    readonly sanctionsHitScore: number;
    readonly adverseMediaScore: number;
    readonly darkwebExposureScore: number;
    readonly politicalExposureScore: number;
  };
  readonly evidence: readonly ProvenanceRef[];
  readonly calculatedAt: ISO8601Timestamp;
}

export interface RiskDimensionInput {
  readonly transactionRisk?: number;
  readonly walletTaintScore?: number;
  readonly sanctionsHitScore?: number;
  readonly adverseMediaScore?: number;
  readonly darkwebExposureScore?: number;
  readonly politicalExposureScore?: number;
}

export interface RiskScoringInput {
  readonly entityId: EntityId;
  readonly dimensions: RiskDimensionInput;
  readonly evidence?: readonly ProvenanceRef[];
}

/** Port for supplying dimension scores from upstream analyzers (OSINT, chain, sanctions). */
export interface RiskScoringPort {
  score(input: RiskScoringInput): CompositeRiskScore;
}

const WEIGHTS = {
  transactionRisk: 0.3,
  walletTaintScore: 0.25,
  sanctionsHitScore: 0.2,
  adverseMediaScore: 0.1,
  darkwebExposureScore: 0.1,
  politicalExposureScore: 0.05,
} as const;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function resolveLevel(score: number): RiskLevel {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

export class CompositeRiskEngine implements RiskScoringPort {
  score(input: RiskScoringInput): CompositeRiskScore {
    const d = input.dimensions;
    const breakdown = {
      transactionRisk: clampScore(d.transactionRisk ?? 0),
      walletTaintScore: clampScore(d.walletTaintScore ?? 0),
      sanctionsHitScore: clampScore(d.sanctionsHitScore ?? 0),
      adverseMediaScore: clampScore(d.adverseMediaScore ?? 0),
      darkwebExposureScore: clampScore(d.darkwebExposureScore ?? 0),
      politicalExposureScore: clampScore(d.politicalExposureScore ?? 0),
    };

    const compositeScore = Number(
      (
        breakdown.transactionRisk * WEIGHTS.transactionRisk +
        breakdown.walletTaintScore * WEIGHTS.walletTaintScore +
        breakdown.sanctionsHitScore * WEIGHTS.sanctionsHitScore +
        breakdown.adverseMediaScore * WEIGHTS.adverseMediaScore +
        breakdown.darkwebExposureScore * WEIGHTS.darkwebExposureScore +
        breakdown.politicalExposureScore * WEIGHTS.politicalExposureScore
      ).toFixed(2),
    );

    return {
      entityId: input.entityId,
      compositeScore,
      riskLevel: resolveLevel(compositeScore),
      breakdown,
      evidence: input.evidence ?? [],
      calculatedAt: new Date().toISOString(),
    };
  }
}

export { WEIGHTS as COMPOSITE_RISK_WEIGHTS };
