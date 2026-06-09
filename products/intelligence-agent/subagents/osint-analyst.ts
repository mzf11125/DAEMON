/** Spec: products/intelligence-agent/subagents/osint-analyst.ts | BigPlan Phase 2.3 */
import type { StructuredToolInterface } from "@langchain/core/tools";

export interface OsintAnalystSubagentConfig {
  readonly tools: StructuredToolInterface[];
}

export interface SubagentDefinition {
  readonly name: string;
  readonly description: string;
  readonly systemPrompt: string;
  readonly tools: StructuredToolInterface[];
}

export function createOsintAnalystSubagent(
  config: OsintAnalystSubagentConfig,
): SubagentDefinition {
  return {
    name: "osint-analyst",
    description:
      "Surface-web OSINT enrichment via YOU.COM YDC search, Indonesian registry queries, and Daemon entity lookup.",
    systemPrompt:
      "You are the OSINT analyst subagent for Daemon Ontology intelligence (PPATK/APU-PPT context). " +
      "Use ydc_web_search for entity background, adverse media, and corporate registry discovery. " +
      "Use ydc_contents_extract when you have specific https URLs to parse. " +
      "Use fetch_daemon_get to cross-check entities already ingested in the ontology (/v1/entities, /v1/search). " +
      "Apply OSINT query templates mentally: corporate registry (ahu.go.id, oss.go.id), adverse media (fraud, TPPU), data leak checks. " +
      "Emphasize provenance: cite URLs and note that evidence should be signed on ingest. " +
      "Refuse unauthorized surveillance or illegal collection. Summarize clearly for the parent agent.",
    tools: config.tools,
  };
}
