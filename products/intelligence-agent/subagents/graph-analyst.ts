/** BigPlan Phase 2.3 | Graph Analyst Subagent — Neo4j link analysis specialist */
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const GRAPH_ANALYST_SYSTEM_PROMPT = `
Kamu adalah graph intelligence analyst dalam platform Daemon Ontology.
Spesialisasimu adalah analisis jaringan (link analysis) menggunakan Neo4j graph
untuk menemukan hubungan tersembunyi antar entitas.

CAPABILITIES:
- Traversal graph: temukan entity yang terhubung via relationship chains
- Pattern detection: circular transactions, shell company chains, layering networks
- Shortest path analysis antar dua entitas
- Community detection: cluster entitas yang saling terhubung
- Temporal analysis: bagaimana koneksi berubah dari waktu ke waktu

WORKFLOW untuk setiap investigasi:
1. Identifikasi entitas utama (seed entities)
2. Traversal 1-hop: immediate connections
3. Traversal 2-hop: secondary connections
4. Identify suspicious patterns (circular, hub-and-spoke)
5. Cross-reference dengan risk scores dan sanctions
6. Report: entity network map + key findings + risk indicators

AML GRAPH PATTERNS yang harus dideteksi:
- STRUCTURING: banyak transaksi kecil → single beneficiary
- LAYERING: rantai transfer A→B→C→D dengan cepat
- SHELL CHAIN: corporate chain panjang (>3 hop) ke ultimate beneficial owner
- CIRCULAR: A→B→C→A (circular flow)
- HUB-AND-SPOKE: satu entity terhubung ke banyak (>10) entity lain

OUTPUT FORMAT:
{
  seedEntities: string[],
  networkSummary: {
    totalNodes: number,
    totalEdges: number,
    maxDepthReached: number
  },
  suspiciousPatterns: {
    patternType: string,
    severity: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL',
    involvedEntities: string[],
    description: string
  }[],
  keyFindings: string[],
  recommendedActions: string[]
}
`;

export const graphTraversalTool = tool(
  async ({ startEntityId, direction, relationshipTypes, maxDepth, minRiskScore }) => {
    const baseUrl = process.env.DAEMON_API_BASE_URL ?? "http://127.0.0.1:3000";
    const apiKey = process.env.DAEMON_API_KEY ?? "";

    const response = await fetch(`${baseUrl}/api/v1/graph/traverse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        startEntityId,
        direction,
        relationshipTypes,
        maxDepth,
        filters: minRiskScore ? { minRiskScore } : undefined,
      }),
    });

    if (!response.ok) {
      return `Error: graph traversal failed (${response.status}): ${await response.text()}`;
    }

    const data = (await response.json()) as {
      nodes: { id: string; type: string; label: string; riskScore?: number }[];
      edges: { source: string; target: string; type: string; weight?: number }[];
    };

    const nodesSummary = data.nodes
      .slice(0, 20)
      .map((n) => `${n.id} [${n.type}] risk=${n.riskScore ?? "N/A"}`)
      .join("\n");

    return [
      `Found ${data.nodes.length} nodes, ${data.edges.length} edges.`,
      `Top nodes:\n${nodesSummary}`,
      data.nodes.length > 20 ? `...and ${data.nodes.length - 20} more` : "",
    ]
      .filter(Boolean)
      .join("\n");
  },
  {
    name: "graph_traversal",
    description:
      "Traverse the Daemon Ontology intelligence graph (Neo4j) from a starting entity. " +
      "Use to discover connected entities: find who a person transacts with, " +
      "which companies share directors, which wallets cluster together. " +
      "Increase maxDepth for deeper analysis (but more expensive).",
    schema: z.object({
      startEntityId: z.string().describe("Entity ID to start traversal from"),
      direction: z.enum(["OUTBOUND", "INBOUND", "BOTH"]).default("BOTH"),
      relationshipTypes: z
        .array(z.string())
        .optional()
        .describe("Filter: ['TRANSACTS_WITH', 'CONTROLS', 'OWNS', 'MEMBER_OF']"),
      maxDepth: z
        .number()
        .int()
        .min(1)
        .max(4)
        .default(2)
        .describe("Max traversal depth. 2=immediate network, 3=extended, 4=full."),
      minRiskScore: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe("Only return nodes with riskScore >= this value"),
    }),
  },
);

export const graphPatternDetectionTool = tool(
  async ({ patternType, seedEntityId, timeWindowDays }) => {
    const baseUrl = process.env.DAEMON_API_BASE_URL ?? "http://127.0.0.1:3000";
    const apiKey = process.env.DAEMON_API_KEY ?? "";

    const response = await fetch(`${baseUrl}/api/v1/graph/patterns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ patternType, seedEntityId, timeWindowDays }),
    });

    if (!response.ok) {
      return `Error: pattern detection failed (${response.status})`;
    }

    const result = (await response.json()) as {
      detected: boolean;
      confidence: number;
      pattern: string;
      involvedEntities: string[];
      description: string;
    };

    return JSON.stringify(result, null, 2);
  },
  {
    name: "graph_pattern_detection",
    description:
      "Detect specific AML patterns in the graph: STRUCTURING, LAYERING, SHELL_CHAIN, CIRCULAR, HUB_AND_SPOKE. " +
      "Use when you suspect a specific money laundering typology.",
    schema: z.object({
      patternType: z.enum([
        "STRUCTURING",
        "LAYERING",
        "SHELL_CHAIN",
        "CIRCULAR",
        "HUB_AND_SPOKE",
      ]),
      seedEntityId: z.string().describe("Entity ID to check pattern around"),
      timeWindowDays: z
        .number()
        .int()
        .min(1)
        .max(365)
        .default(90)
        .describe("Time window for analysis in days"),
    }),
  },
);

export const graphAnalystSubagent = {
  name: "graph-analyst",
  description:
    "Neo4j graph traversal and AML pattern detection specialist. " +
    "Use for link analysis, network mapping, and detecting money laundering patterns " +
    "(structuring, layering, shell chains, circular flows).",
  systemPrompt: GRAPH_ANALYST_SYSTEM_PROMPT,
  tools: [graphTraversalTool, graphPatternDetectionTool],
};
