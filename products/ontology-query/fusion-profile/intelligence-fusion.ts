/** BigPlan Phase 2.6 | Cross-domain fusion query profile untuk intelligence investigation */

export interface FusionQueryInput {
  entityId?: string;
  entityName?: string;
  includePackIds?: string[];
  riskThreshold?: number;
  maxDepth?: number;
  includeEvidence?: boolean;
}

export interface FusedIntelligenceResult {
  entityId: string;
  label: string;
  packSources: string[];
  amlProfile?: {
    riskLevel: string;
    sanctionsHit: boolean;
    pep: boolean;
  };
  cryptoProfile?: {
    walletCount: number;
    taintedWallets: number;
    totalVolumeUSD?: number;
  };
  darkwebProfile?: {
    marketplaceCount: number;
    listingCount: number;
    isActiveVendor: boolean;
  };
  osintProfile?: {
    adverseMediaCount: number;
    corporateRecords: number;
    dataLeaks: number;
  };
  netintelProfile?: {
    ipAddresses: string[];
    domains: string[];
    threatActorRef?: string;
  };
  labelsProfile?: {
    labels: string[];
    riskLabels: string[];
  };
  evidenceRefs?: string[];
}

/**
 * Intelligence Fusion Query Profile
 *
 * Mendefinisikan cara memfusikan data dari pack:
 * - ppatk-aml      : Financial entities (Account, Transaction, Legal Entity)
 * - ppatk-crypto   : Crypto entities (Wallet, Transaction, Exchange)
 * - ppatk-darkweb  : Dark web entities (Marketplace, Listing, Vendor)
 * - ppatk-osint    : OSINT entities (Persona, CorporateRecord, DataLeak)
 * - ppatk-netintel : Network intel (IPAddress, Domain, ThreatActor)
 * - ppatk-labels   : Risk labels dan annotations
 */
export const INTELLIGENCE_FUSION_PROFILE = {
  id: "intelligence-fusion-v1",
  name: "Full Intelligence Fusion",
  description: "Cross-domain entity fusion across all 6 PPATK ontology packs",
  packIds: [
    "ppatk-aml",
    "ppatk-crypto",
    "ppatk-darkweb",
    "ppatk-osint",
    "ppatk-netintel",
    "ppatk-labels",
  ],

  cypherTemplate: `
    MATCH (entity {id: $entityId})
    OPTIONAL MATCH (entity)-[:HAS_WALLET]->(wallet)
    OPTIONAL MATCH (entity)-[:ASSOCIATED_WITH]->(darkwebEntity)
    OPTIONAL MATCH (entity)-[:USES_IP]->(ip)
    OPTIONAL MATCH (entity)-[:HAS_DOMAIN]->(domain)
    OPTIONAL MATCH (entity)-[:TAGGED_AS]->(label)
    OPTIONAL MATCH (entity)-[:OSINT_PERSONA]->(persona)
    RETURN entity, wallet, darkwebEntity, ip, domain, label, persona
    LIMIT 100
  `,
} as const;
