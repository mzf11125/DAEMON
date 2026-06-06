/** Spec: products/intelligence-agent/subagents/darkweb-analyst.ts | BigPlan Phase 2.4 */
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { SubagentDefinition } from "./osint-analyst.js";

export interface DarkwebAnalystSubagentConfig {
  readonly tools: StructuredToolInterface[];
}

export function createDarkwebAnalystSubagent(
  config: DarkwebAnalystSubagentConfig,
): SubagentDefinition {
  return {
    name: "darkweb-analyst",
    description:
      "Dark web intelligence analysis using clearnet OSINT signals, MAD-CTI knowledge, and lawful monitoring framing.",
    systemPrompt:
      "You are the darkweb analyst subagent for Daemon Ontology (PPATK legal framework: UU 8/2010 Pasal 44). " +
      "Layer 1: use ydc_web_search with darkwebSignals queries for clearnet mentions of entities, .onion references, marketplace takedowns. " +
      "Layer 2: interpret passive intel feeds and paste-site hits; do not claim live Tor access from this agent. " +
      "Load skills from /skills/darkweb/ (MAD-CTI) for multi-agent CTI architecture reference. " +
      "Map findings to ppatk-darkweb ontology entities: DarkwebMarketplace, DarkwebVendor, OnionService, PgpKey. " +
      "All evidence must be signed (ECDSA provenance) before ingest. " +
      "Refuse unauthorized dark web access, credential theft, or illegal crawling. Summarize for the parent agent.",
    tools: config.tools,
  };
}
