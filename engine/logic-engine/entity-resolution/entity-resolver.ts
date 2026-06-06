/** BigPlan Phase 4.1 | Entity Resolution Engine — deduplicate dan fuse entities dari berbagai sumber */

export interface EntityCandidate {
  entityId: string;
  ontologyType: string;
  packId: string;
  attributes: {
    name?: string;
    aliases?: string[];
    nationalId?: string;
    taxId?: string;
    passportNumber?: string;
    dateOfBirth?: string;
    addresses?: string[];
    phoneNumbers?: string[];
    emailAddresses?: string[];
    registrationNumber?: string;
  };
  confidence: number;
  sourceId: string;
}

export type ResolutionDecision =
  | { action: "MERGE"; targetEntityId: string; confidence: number; reasons: string[] }
  | { action: "NEW"; reasons: string[] }
  | { action: "REVIEW_REQUIRED"; candidates: EntityCandidate[]; reasons: string[] };

export interface EntityResolverConfig {
  exactMatchThreshold: number;
  fuzzyMatchThreshold: number;
  reviewThreshold: number;
  enableTransliteration: boolean;
}

export class EntityResolver {
  private readonly config: EntityResolverConfig;

  constructor(config: Partial<EntityResolverConfig> = {}) {
    this.config = {
      exactMatchThreshold: config.exactMatchThreshold ?? 1.0,
      fuzzyMatchThreshold: config.fuzzyMatchThreshold ?? 0.92,
      reviewThreshold: config.reviewThreshold ?? 0.8,
      enableTransliteration: config.enableTransliteration ?? true,
    };
  }

  async resolve(
    incoming: EntityCandidate,
    candidates: EntityCandidate[],
  ): Promise<ResolutionDecision> {
    const exactMatch = this.findExactIdMatch(incoming, candidates);
    if (exactMatch) {
      return {
        action: "MERGE",
        targetEntityId: exactMatch.entityId,
        confidence: 1.0,
        reasons: ["Exact identifier match (nationalId/taxId/registrationNumber)"],
      };
    }

    const fuzzyMatches = this.findFuzzyNameMatches(incoming, candidates);

    if (fuzzyMatches.length === 0) {
      return { action: "NEW", reasons: ["No matching candidates found"] };
    }

    const topMatch = fuzzyMatches[0]!;

    if (topMatch.score >= this.config.fuzzyMatchThreshold) {
      return {
        action: "MERGE",
        targetEntityId: topMatch.candidate.entityId,
        confidence: topMatch.score,
        reasons: topMatch.reasons,
      };
    }

    if (topMatch.score >= this.config.reviewThreshold) {
      return {
        action: "REVIEW_REQUIRED",
        candidates: fuzzyMatches.slice(0, 3).map((m) => m.candidate),
        reasons: [
          `Best match score ${topMatch.score.toFixed(3)} is below auto-merge threshold`,
          ...topMatch.reasons,
        ],
      };
    }

    return { action: "NEW", reasons: ["Similarity scores below review threshold"] };
  }

  private findExactIdMatch(
    incoming: EntityCandidate,
    candidates: EntityCandidate[],
  ): EntityCandidate | undefined {
    return candidates.find((c) => {
      if (incoming.attributes.nationalId && c.attributes.nationalId) {
        return incoming.attributes.nationalId === c.attributes.nationalId;
      }
      if (incoming.attributes.taxId && c.attributes.taxId) {
        return incoming.attributes.taxId === c.attributes.taxId;
      }
      if (incoming.attributes.passportNumber && c.attributes.passportNumber) {
        return incoming.attributes.passportNumber === c.attributes.passportNumber;
      }
      if (incoming.attributes.registrationNumber && c.attributes.registrationNumber) {
        return (
          incoming.attributes.registrationNumber === c.attributes.registrationNumber
        );
      }
      return false;
    });
  }

  private findFuzzyNameMatches(
    incoming: EntityCandidate,
    candidates: EntityCandidate[],
  ): { candidate: EntityCandidate; score: number; reasons: string[] }[] {
    const incomingName = this.normalizeName(incoming.attributes.name ?? "");
    if (!incomingName) return [];

    const results = candidates
      .map((candidate) => {
        const candidateName = this.normalizeName(candidate.attributes.name ?? "");
        const nameScore = this.jaroWinkler(incomingName, candidateName);
        const reasons: string[] = [`Name similarity: ${nameScore.toFixed(3)}`];

        const aliasScore = Math.max(
          0,
          ...(candidate.attributes.aliases ?? []).map((alias) =>
            this.jaroWinkler(incomingName, this.normalizeName(alias)),
          ),
        );
        if (aliasScore > nameScore) {
          reasons.push(`Alias match: ${aliasScore.toFixed(3)}`);
        }

        let dobBonus = 0;
        if (
          incoming.attributes.dateOfBirth &&
          candidate.attributes.dateOfBirth &&
          incoming.attributes.dateOfBirth === candidate.attributes.dateOfBirth
        ) {
          dobBonus = 0.05;
          reasons.push("Date of birth matches");
        }

        const finalScore = Math.min(1.0, Math.max(nameScore, aliasScore) + dobBonus);
        return { candidate, score: finalScore, reasons };
      })
      .filter((r) => r.score >= this.config.reviewThreshold)
      .sort((a, b) => b.score - a.score);

    return results;
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\b(bin|binti|alias|aka|a\/k\/a)\b/g, "")
      .trim();
  }

  private jaroWinkler(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    const s1Matches = new Array<boolean>(s1.length).fill(false);
    const s2Matches = new Array<boolean>(s2.length).fill(false);

    let matches = 0;
    let transpositions = 0;

    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, s2.length);
      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0.0;

    let k = 0;
    for (let i = 0; i < s1.length; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }

    const jaro =
      (matches / s1.length +
        matches / s2.length +
        (matches - transpositions / 2) / matches) /
      3;

    let prefix = 0;
    for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }

    return jaro + prefix * 0.1 * (1 - jaro);
  }
}
