/** Spec: products/intelligence-agent/agent/ydc-tools.ts | BigPlan Phase 2.2 */
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  YDCIntelligenceConnector,
  resolveYdcApiKey,
} from "@daemon/collect-sensing/connectors/api-connectors/ydc-intelligence-connector.js";

export type YdcHttpFetch = (
  url: string,
  init?: { headers?: Record<string, string>; method?: string; body?: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

function truncate(text: string, max = 90_000): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n...[truncated ${text.length - max} chars]`;
}

export function isYdcEnabled(): boolean {
  const off = String(process.env.AGENT_YDC_ENABLED ?? "").trim().toLowerCase();
  if (off === "0" || off === "false" || off === "off") return false;
  return Boolean(resolveYdcApiKey());
}

async function runYdcConnector(
  httpFetch: YdcHttpFetch,
  config: ConstructorParameters<typeof YDCIntelligenceConnector>[1],
): Promise<string> {
  const connector = new YDCIntelligenceConnector(httpFetch, config);
  const records = await connector.fetch();
  const credit = connector.creditSnapshot();
  const lines = records.slice(0, 20).map((r) => {
    const title = String(r.payload.title ?? r.payload.url ?? r.recordId ?? "(result)");
    const url = String(r.payload.url ?? "");
    const snippet = truncate(
      String(
        r.payload.description ??
          (Array.isArray(r.payload.snippets) ? r.payload.snippets[0] : "") ??
          r.payload.markdown ??
          "",
      ),
      1200,
    );
    return `- ${title}\n  ${url}\n  ${snippet}`;
  });
  return truncate(
    [
      `YDC ${config.mode} results: ${records.length}`,
      `Credits — balance: ${credit.balanceUsd} USD, spent: ${credit.spentUsd} USD`,
      lines.length ? "Results:\n" + lines.join("\n\n") : "(no results)",
    ].join("\n\n"),
    100_000,
  );
}

export function createYdcTools(httpFetch: YdcHttpFetch = globalThis.fetch.bind(globalThis) as YdcHttpFetch) {
  const ydcWebSearchTool = tool(
    async ({ query, mode, researchEffort, livecrawl, country }) => {
      const apiKey = resolveYdcApiKey();
      if (!apiKey) {
        return "YDC is not configured (missing YDC_API_KEY).";
      }
      const q = String(query || "").trim();
      if (!q) return "Error: query must be non-empty.";

      try {
        return await runYdcConnector(httpFetch, {
          sourceId: "ydc-intelligence",
          apiKey,
          mode: mode === "research" ? "research" : "search",
          query: q,
          researchEffort: researchEffort ?? "standard",
          livecrawl: livecrawl ?? (mode === "news" ? "news" : undefined),
          country: country ?? "ID",
        });
      } catch (err) {
        return `YDC search error: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
    {
      name: "ydc_web_search",
      description:
        "Search the public web via YOU.COM AI-powered search. Supports news, livecrawl for full content, and research mode for deep synthesis. Use for OSINT surface web collection, entity background research, adverse media monitoring.",
      schema: z.object({
        query: z.string().min(1),
        mode: z.enum(["search", "news", "research"]).default("search"),
        researchEffort: z.enum(["lite", "standard", "deep", "exhaustive"]).optional(),
        livecrawl: z.enum(["web", "news", "all"]).optional(),
        country: z.string().optional().default("ID"),
        freshness: z.string().optional(),
      }),
    },
  );

  const ydcContentsExtractTool = tool(
    async ({ url, urls }) => {
      const apiKey = resolveYdcApiKey();
      if (!apiKey) {
        return "YDC is not configured (missing YDC_API_KEY).";
      }
      const list = urls?.length ? urls : url ? [url] : [];
      const valid = list.filter((u) => /^https:\/\//i.test(String(u).trim()));
      if (valid.length === 0) {
        return "Error: provide at least one https URL.";
      }

      try {
        return await runYdcConnector(httpFetch, {
          sourceId: "ydc-intelligence",
          apiKey,
          mode: "contents",
          urls: valid,
        });
      } catch (err) {
        return `YDC contents error: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
    {
      name: "ydc_contents_extract",
      description:
        "Extract readable markdown content from public https URLs via YOU.COM contents API. Use after search or when the user provides specific URLs.",
      schema: z.object({
        url: z.string().url().optional(),
        urls: z.array(z.string().url()).optional(),
      }),
    },
  );

  return [ydcWebSearchTool, ydcContentsExtractTool];
}

export const ydcTools = createYdcTools();
