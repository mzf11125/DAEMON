/** BigPlan Phase 4.4 | Typology Rule Engine — PPATK AML pattern detection */

export type TypologyId =
  | "STRUCTURING"
  | "SMURFING"
  | "LAYERING"
  | "INTEGRATION"
  | "TBML"
  | "CRYPTO_MIXING"
  | "SHELL_CHAIN"
  | "HAWALA"
  | "PROPERTY_PUMP"
  | "CASINO_WASH";

export interface TypologyRule {
  id: TypologyId;
  name: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  legalBasis: string;
  indicators: TypologyIndicator[];
  minIndicatorsRequired: number;
}

export interface TypologyIndicator {
  id: string;
  description: string;
  field: string;
  operator: "GT" | "LT" | "EQ" | "GTE" | "LTE" | "EXISTS" | "IN" | "CONTAINS";
  value: number | string | boolean | string[];
  weight: number;
}

export interface TypologyFact {
  transactionCount7Days?: number;
  transactionCount30Days?: number;
  maxSingleTransactionIDR?: number;
  totalVolumeIDR30Days?: number;
  uniqueCounterparties?: number;
  hasRoundNumbers?: boolean;
  velocitySpike?: boolean;
  usesMixer?: boolean;
  usesPrivacyCoin?: boolean;
  walletTaintScore?: number;
  shellCompanyChainLength?: number;
  circularTransfer?: boolean;
  rapidLayering?: boolean;
  isPEP?: boolean;
  sanctionsHit?: boolean;
  adverseMediaHit?: boolean;
  tradeOverInvoicing?: boolean;
  multipleShippingRoutes?: boolean;
}

export interface TypologyDetectionResult {
  detectedTypologies: {
    typologyId: TypologyId;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    confidence: number;
    matchedIndicators: string[];
    missingIndicators: string[];
    legalBasis: string;
    recommendedAction: string;
  }[];
  overallRiskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  facts: TypologyFact;
  evaluatedAt: string;
}

export const PPATK_TYPOLOGY_RULES: TypologyRule[] = [
  {
    id: "STRUCTURING",
    name: "Strukturisasi (Smurfing)",
    description:
      "Memecah transaksi besar menjadi banyak transaksi kecil di bawah threshold pelaporan",
    severity: "HIGH",
    legalBasis: "UU 8/2010 Pasal 3 ayat 1 huruf a; FATF Recommendation 10",
    minIndicatorsRequired: 2,
    indicators: [
      {
        id: "high_tx_count",
        description: "Lebih dari 5 transaksi dalam 7 hari",
        field: "transactionCount7Days",
        operator: "GT",
        value: 5,
        weight: 7,
      },
      {
        id: "round_numbers",
        description: "Transaksi round number (kelipatan 500rb/1jt)",
        field: "hasRoundNumbers",
        operator: "EQ",
        value: true,
        weight: 5,
      },
      {
        id: "below_500m",
        description: "Setiap transaksi < Rp 500.000.000",
        field: "maxSingleTransactionIDR",
        operator: "LT",
        value: 500_000_000,
        weight: 8,
      },
      {
        id: "velocity_spike",
        description: "Lonjakan volume tiba-tiba",
        field: "velocitySpike",
        operator: "EQ",
        value: true,
        weight: 6,
      },
    ],
  },
  {
    id: "LAYERING",
    name: "Layering (Pelapisan)",
    description: "Transfer berlapis dan cepat untuk menyamarkan asal usul dana",
    severity: "HIGH",
    legalBasis: "UU 8/2010 Pasal 3 ayat 1 huruf b; FATF Recommendation 16",
    minIndicatorsRequired: 2,
    indicators: [
      {
        id: "rapid_layering",
        description: "Transfer keluar dalam <24 jam setelah menerima dana",
        field: "rapidLayering",
        operator: "EQ",
        value: true,
        weight: 9,
      },
      {
        id: "many_counterparties",
        description: "Lebih dari 10 counterparty unik dalam 30 hari",
        field: "uniqueCounterparties",
        operator: "GT",
        value: 10,
        weight: 7,
      },
      {
        id: "circular",
        description: "Dana kembali ke pengirim asal (circular)",
        field: "circularTransfer",
        operator: "EQ",
        value: true,
        weight: 10,
      },
    ],
  },
  {
    id: "CRYPTO_MIXING",
    name: "Crypto Tumbling/Mixing",
    description: "Penggunaan mixer/tumbler untuk menyamarkan jejak kripto",
    severity: "CRITICAL",
    legalBasis: "UU 8/2010 Pasal 3; FATF VA Guidance 2021",
    minIndicatorsRequired: 1,
    indicators: [
      {
        id: "uses_mixer",
        description: "Transaksi ke/dari known mixer address",
        field: "usesMixer",
        operator: "EQ",
        value: true,
        weight: 10,
      },
      {
        id: "privacy_coin",
        description: "Menggunakan Monero/Zcash/Dash",
        field: "usesPrivacyCoin",
        operator: "EQ",
        value: true,
        weight: 8,
      },
      {
        id: "high_taint",
        description: "Wallet taint score > 70",
        field: "walletTaintScore",
        operator: "GT",
        value: 70,
        weight: 9,
      },
    ],
  },
  {
    id: "SHELL_CHAIN",
    name: "Shell Company Chain",
    description: "Rantai panjang perusahaan cangkang untuk menyembunyikan UBO",
    severity: "HIGH",
    legalBasis: "UU 8/2010 Pasal 3; Perpres 13/2018 tentang UBO",
    minIndicatorsRequired: 1,
    indicators: [
      {
        id: "long_chain",
        description: "Rantai kepemilikan lebih dari 3 tingkat",
        field: "shellCompanyChainLength",
        operator: "GT",
        value: 3,
        weight: 9,
      },
    ],
  },
];

export class TypologyRuleEngine {
  constructor(private readonly rules: TypologyRule[] = PPATK_TYPOLOGY_RULES) {}

  evaluate(facts: TypologyFact): TypologyDetectionResult {
    const detected: TypologyDetectionResult["detectedTypologies"] = [];

    for (const rule of this.rules) {
      const matchedIndicators: string[] = [];
      const missingIndicators: string[] = [];
      let totalWeight = 0;
      let matchedWeight = 0;

      for (const indicator of rule.indicators) {
        totalWeight += indicator.weight;
        const factValue = facts[indicator.field as keyof TypologyFact];

        const matches = this.evaluateIndicator(factValue, indicator);
        if (matches) {
          matchedIndicators.push(indicator.id);
          matchedWeight += indicator.weight;
        } else {
          missingIndicators.push(indicator.id);
        }
      }

      if (matchedIndicators.length >= rule.minIndicatorsRequired) {
        const confidence = totalWeight > 0 ? matchedWeight / totalWeight : 0;
        detected.push({
          typologyId: rule.id,
          severity: rule.severity,
          confidence,
          matchedIndicators,
          missingIndicators,
          legalBasis: rule.legalBasis,
          recommendedAction: this.getRecommendedAction(rule.id),
        });
      }
    }

    detected.sort((a, b) => {
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const diff = severityOrder[b.severity] - severityOrder[a.severity];
      return diff !== 0 ? diff : b.confidence - a.confidence;
    });

    const overallRiskLevel = detected.length === 0 ? "LOW" : detected[0]!.severity;

    return {
      detectedTypologies: detected,
      overallRiskLevel,
      facts,
      evaluatedAt: new Date().toISOString(),
    };
  }

  private evaluateIndicator(value: unknown, indicator: TypologyIndicator): boolean {
    if (value === undefined || value === null) return false;

    switch (indicator.operator) {
      case "EQ":
        return value === indicator.value;
      case "GT":
        return (
          typeof value === "number" &&
          typeof indicator.value === "number" &&
          value > indicator.value
        );
      case "GTE":
        return (
          typeof value === "number" &&
          typeof indicator.value === "number" &&
          value >= indicator.value
        );
      case "LT":
        return (
          typeof value === "number" &&
          typeof indicator.value === "number" &&
          value < indicator.value
        );
      case "LTE":
        return (
          typeof value === "number" &&
          typeof indicator.value === "number" &&
          value <= indicator.value
        );
      case "EXISTS":
        return value !== undefined && value !== null;
      case "IN":
        return (
          Array.isArray(indicator.value) && indicator.value.includes(value as string)
        );
      case "CONTAINS":
        return (
          typeof value === "string" &&
          typeof indicator.value === "string" &&
          value.includes(indicator.value)
        );
      default:
        return false;
    }
  }

  private getRecommendedAction(id: TypologyId): string {
    const actions: Record<TypologyId, string> = {
      STRUCTURING: "File STR segera. Lakukan Enhanced Due Diligence (EDD).",
      SMURFING: "File STR. Identifikasi semua individu yang terlibat.",
      LAYERING: "File STR. Lakukan pelacakan aliran dana (follow the money).",
      INTEGRATION: "Audit transaksi bisnis. Verifikasi legitimasi sumber dana.",
      TBML: "Koordinasi dengan Bea Cukai. Verifikasi dokumen perdagangan.",
      CRYPTO_MIXING: "File STR SEGERA. Freeze aset jika ada kewenangan.",
      SHELL_CHAIN: "Identifikasi UBO. Perketat KYC. Pertimbangkan pemutusan hubungan.",
      HAWALA: "Laporkan ke PPATK. Identifikasi jaringan informal.",
      PROPERTY_PUMP: "Verifikasi valuasi properti. Koordinasi dengan BPN.",
      CASINO_WASH: "Verifikasi transaksi kasino. Audit sumber dana.",
    };
    return (
      actions[id] ??
      "Lakukan investigasi lebih lanjut dan konsultasikan dengan supervisor."
    );
  }
}
