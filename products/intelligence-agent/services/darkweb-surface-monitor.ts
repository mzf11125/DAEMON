/** BigPlan Phase 2.5 | Dark Web Surface Monitor — clearnet signals untuk darkweb entities */
import { OSINT_QUERY_TEMPLATES } from "@daemon/collect-sensing/connectors/api-connectors/osint-query-templates.js";

export interface DarkwebSurfaceSignal {
  entityName: string;
  entityId?: string;
  signalType:
    | "MARKETPLACE_MENTION"
    | "ONION_URL_MENTION"
    | "TAKEDOWN_NEWS"
    | "DATA_LEAK"
    | "FORUM_MENTION";
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  ydcQuery: string;
}

export interface DarkwebSurfaceReport {
  entityName: string;
  scanTimestamp: string;
  signals: DarkwebSurfaceSignal[];
  summary: string;
  riskIndicatorCount: number;
}

export interface DarkwebSurfaceMonitorOptions {
  readonly ydcApiKey?: string;
  readonly httpFetch?: typeof fetch;
  readonly baseSearchUrl?: string;
}

export class DarkwebSurfaceMonitor {
  private readonly ydcApiKey: string;
  private readonly httpFetch: typeof fetch;
  private readonly baseSearchUrl: string;

  constructor(options: DarkwebSurfaceMonitorOptions = {}) {
    const key = options.ydcApiKey ?? process.env.YDC_API_KEY;
    if (!key) {
      throw new Error("YDC_API_KEY environment variable is required");
    }
    this.ydcApiKey = key;
    this.httpFetch = options.httpFetch ?? fetch;
    this.baseSearchUrl = options.baseSearchUrl ?? "https://api.you.com/v1/search";
  }

  /**
   * Scan surface web untuk sinyal darkweb yang berkaitan dengan entity tertentu.
   * Menggunakan Layer 1 dari layered dark web intelligence approach.
   */
  async scanEntity(
    entityName: string,
    _aliases: string[] = [],
  ): Promise<DarkwebSurfaceReport> {
    const signals: DarkwebSurfaceSignal[] = [];
    const scanTimestamp = new Date().toISOString();

    const darkwebQuery = OSINT_QUERY_TEMPLATES.darkwebSignals(entityName);
    const darkwebResults = await this.search(darkwebQuery);
    for (const result of darkwebResults) {
      signals.push({
        entityName,
        signalType: this.classifySignal(`${result.title} ${result.snippet}`),
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        publishedDate: result.published_date,
        confidence: this.assessConfidence(result.title, result.snippet, entityName),
        ydcQuery: darkwebQuery,
      });
    }

    const newsQuery = `"${entityName}" darkweb marketplace takedown seized`;
    const newsResults = await this.search(newsQuery, {
      topic: "news",
      freshness: "month",
    });
    for (const result of newsResults) {
      signals.push({
        entityName,
        signalType: "TAKEDOWN_NEWS",
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        publishedDate: result.published_date,
        confidence: "MEDIUM",
        ydcQuery: newsQuery,
      });
    }

    const leakQuery = OSINT_QUERY_TEMPLATES.dataLeakCheck(entityName);
    const leakResults = await this.search(leakQuery);
    for (const result of leakResults) {
      signals.push({
        entityName,
        signalType: "DATA_LEAK",
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        confidence: "HIGH",
        ydcQuery: leakQuery,
      });
    }

    const riskIndicatorCount = signals.filter((s) => s.confidence !== "LOW").length;

    return {
      entityName,
      scanTimestamp,
      signals,
      summary: `Found ${signals.length} surface signals (${riskIndicatorCount} high/medium confidence)`,
      riskIndicatorCount,
    };
  }

  private async search(
    query: string,
    options?: { topic?: string; freshness?: string },
  ): Promise<
    { title: string; url: string; snippet: string; published_date?: string }[]
  > {
    const params = new URLSearchParams({
      query,
      apikey: this.ydcApiKey,
      count: "5",
      country: "ID",
      ...(options?.topic ? { topic: options.topic } : {}),
      ...(options?.freshness ? { freshness: options.freshness } : {}),
    });

    const res = await this.httpFetch(`${this.baseSearchUrl}?${params.toString()}`);
    if (!res.ok) {
      console.warn(`YDC search failed for query "${query}": ${res.status}`);
      return [];
    }

    const data = (await res.json()) as {
      hits?: {
        title: string;
        url: string;
        description: string;
        published_date?: string;
      }[];
    };

    return (data.hits ?? []).map((h) => ({
      title: h.title,
      url: h.url,
      snippet: h.description,
      published_date: h.published_date,
    }));
  }

  private classifySignal(text: string): DarkwebSurfaceSignal["signalType"] {
    const lower = text.toLowerCase();
    if (lower.includes(".onion") || lower.includes("onion url")) {
      return "ONION_URL_MENTION";
    }
    if (lower.includes("marketplace") || lower.includes("market")) {
      return "MARKETPLACE_MENTION";
    }
    if (lower.includes("forum") || lower.includes("chan") || lower.includes("board")) {
      return "FORUM_MENTION";
    }
    if (lower.includes("leak") || lower.includes("breach") || lower.includes("dump")) {
      return "DATA_LEAK";
    }
    return "MARKETPLACE_MENTION";
  }

  private assessConfidence(
    title: string,
    snippet: string,
    entityName: string,
  ): "LOW" | "MEDIUM" | "HIGH" {
    const combined = `${title} ${snippet}`.toLowerCase();
    const nameInText = combined.includes(entityName.toLowerCase());
    const strongIndicators = [
      ".onion",
      "darkweb",
      "dark web",
      "tor network",
      "illegal marketplace",
      "data breach",
    ];
    const indicatorCount = strongIndicators.filter((i) => combined.includes(i)).length;

    if (nameInText && indicatorCount >= 2) return "HIGH";
    if (nameInText || indicatorCount >= 1) return "MEDIUM";
    return "LOW";
  }
}
