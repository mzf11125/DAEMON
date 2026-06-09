/** Spec: collect-sensing/connectors/api-connectors/ydc-intelligence-connector.ts | BigPlan Phase 1.1 */
import { toRawRecords, type RawRecord, type SourceConnector } from "../connector.js";
import type { HttpFetch } from "./http-pull-connector.js";
import {
  YDCCreditMonitor,
  type YDCOperation,
  type YDCCreditSnapshot,
} from "./ydc-credit-monitor.js";

/** See https://documentation.you.com/api-reference */
export const YDC_API_BASE_DEFAULT = "https://api.ydc-index.io";

export interface YDCIntelligenceConfig {
  readonly sourceId: string;
  readonly apiKey: string;
  readonly mode: "search" | "contents" | "research";
  readonly query?: string;
  readonly urls?: readonly string[];
  readonly researchEffort?: "lite" | "standard" | "deep" | "exhaustive";
  readonly livecrawl?: "web" | "news" | "all";
  readonly country?: string;
  readonly language?: string;
  readonly safesearch?: "off" | "moderate" | "strict";
  readonly includeDomains?: readonly string[];
  readonly excludeDomains?: readonly string[];
  readonly creditsAlert?: number;
  readonly creditsHardLimit?: number;
  readonly initialCreditsUsd?: number;
  readonly baseUrl?: string;
}

export interface YDCCreditTracker {
  charge(operation: YDCOperation, count?: number): YDCCreditSnapshot;
  snapshot(): YDCCreditSnapshot;
}

export class InMemoryYDCCreditTracker implements YDCCreditTracker {
  private readonly monitor: YDCCreditMonitor;

  constructor(
    config: Pick<YDCIntelligenceConfig, "creditsAlert" | "creditsHardLimit" | "initialCreditsUsd">,
  ) {
    this.monitor = new YDCCreditMonitor({
      initialBalanceUsd: config.initialCreditsUsd ?? 100,
      alertThresholdUsd: config.creditsAlert ?? 10,
      hardLimitUsd: config.creditsHardLimit ?? 5,
    });
  }

  charge(operation: YDCOperation, count = 1): YDCCreditSnapshot {
    return this.monitor.charge(operation, count);
  }

  snapshot(): YDCCreditSnapshot {
    return this.monitor.snapshot();
  }
}

function resolveOperation(config: YDCIntelligenceConfig): YDCOperation {
  if (config.mode === "contents") return "contents";
  if (config.mode === "research") {
    switch (config.researchEffort) {
      case "lite":
        return "researchLite";
      case "standard":
        return "researchStandard";
      case "exhaustive":
        return "researchExhaustive";
      case "deep":
      default:
        return "researchDeep";
    }
  }
  return config.livecrawl ? "searchLivecrawl" : "search";
}

function buildSearchUrl(baseUrl: string, config: YDCIntelligenceConfig): string {
  const params = new URLSearchParams();
  if (config.query) params.set("query", config.query);
  if (config.country) params.set("country", config.country);
  if (config.language) params.set("language", config.language);
  if (config.safesearch) params.set("safesearch", config.safesearch);
  if (config.livecrawl) params.set("livecrawl", config.livecrawl);
  // TODO: confirm path/query params against https://documentation.you.com/api-reference
  return `${baseUrl.replace(/\/$/, "")}/search?${params.toString()}`;
}

function buildContentsUrl(baseUrl: string): string {
  // TODO: confirm contents endpoint against https://documentation.you.com/api-reference
  return `${baseUrl.replace(/\/$/, "")}/contents`;
}

function buildResearchUrl(baseUrl: string, config: YDCIntelligenceConfig): string {
  const params = new URLSearchParams();
  if (config.query) params.set("query", config.query);
  if (config.researchEffort) params.set("effort", config.researchEffort);
  // TODO: confirm research endpoint against https://documentation.you.com/api-reference
  return `${baseUrl.replace(/\/$/, "")}/research?${params.toString()}`;
}

function normalizeYdcBody(
  sourceId: string,
  body: unknown,
  config: YDCIntelligenceConfig,
): RawRecord[] {
  if (body === null || typeof body !== "object") {
    throw new Error("ydc-intelligence-connector expected JSON object response");
  }
  const obj = body as Record<string, unknown>;
  const rows: Record<string, unknown>[] = [];

  if (config.mode === "search" && obj.results && typeof obj.results === "object") {
    const results = obj.results as Record<string, unknown>;
    for (const section of ["web", "news"] as const) {
      const items = results[section];
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (typeof item !== "object" || item === null) continue;
        rows.push({
          ...(item as Record<string, unknown>),
          __ydc_section: section,
          __ydc_mode: config.mode,
          __ydc_query: config.query,
        });
      }
    }
  } else if (config.mode === "contents" && Array.isArray(obj.output)) {
    for (const item of obj.output) {
      if (typeof item !== "object" || item === null) continue;
      rows.push({
        ...(item as Record<string, unknown>),
        __ydc_mode: config.mode,
      });
    }
  } else if (Array.isArray(obj.results)) {
    for (const item of obj.results) {
      if (typeof item !== "object" || item === null) continue;
      rows.push({
        ...(item as Record<string, unknown>),
        __ydc_mode: config.mode,
        __ydc_query: config.query,
      });
    }
  } else {
    rows.push({
      ...obj,
      __ydc_mode: config.mode,
      __ydc_query: config.query,
    });
  }

  return toRawRecords(sourceId, rows, "url");
}

type HttpFetchInit = {
  headers?: Record<string, string>;
  method?: string;
  body?: string;
};

/**
 * YDC Intelligence connector — follows HttpPullConnector fetch pattern (HttpFetch DI,
 * auth headers, JSON normalization) with YDC-specific endpoints and credit tracking.
 */
export class YDCIntelligenceConnector implements SourceConnector {
  readonly kind = "api";
  readonly sourceId: string;
  private readonly creditTracker: YDCCreditTracker;

  constructor(
    private readonly httpFetch: HttpFetch,
    private readonly config: YDCIntelligenceConfig,
    creditTracker?: YDCCreditTracker,
  ) {
    if (!config.apiKey.trim()) {
      throw new Error("ydc-intelligence-connector requires apiKey (YDC_API_KEY)");
    }
    if (config.mode === "search" && !config.query?.trim()) {
      throw new Error("ydc-intelligence-connector search mode requires query");
    }
    if (config.mode === "contents" && (!config.urls || config.urls.length === 0)) {
      throw new Error("ydc-intelligence-connector contents mode requires urls");
    }
    if (config.mode === "research" && !config.query?.trim()) {
      throw new Error("ydc-intelligence-connector research mode requires query");
    }
    this.sourceId = config.sourceId;
    this.creditTracker =
      creditTracker ??
      new InMemoryYDCCreditTracker({
        creditsAlert: config.creditsAlert,
        creditsHardLimit: config.creditsHardLimit,
        initialCreditsUsd: config.initialCreditsUsd,
      });
  }

  creditSnapshot(): YDCCreditSnapshot {
    return this.creditTracker.snapshot();
  }

  async fetch(): Promise<RawRecord[]> {
    const operation = resolveOperation(this.config);
    this.creditTracker.charge(operation, 1);

    const baseUrl = this.config.baseUrl ?? YDC_API_BASE_DEFAULT;
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-API-Key": this.config.apiKey,
    };

    let url: string;
    let init: HttpFetchInit | undefined = { headers };

    switch (this.config.mode) {
      case "search":
        url = buildSearchUrl(baseUrl, this.config);
        break;
      case "contents":
        url = buildContentsUrl(baseUrl);
        init = {
          headers,
          method: "POST",
          body: JSON.stringify({ urls: this.config.urls, formats: ["markdown"] }),
        };
        break;
      case "research":
        url = buildResearchUrl(baseUrl, this.config);
        break;
      default:
        throw new Error(`unsupported YDC mode: ${String(this.config.mode)}`);
    }

    const fetchFn = this.httpFetch as (url: string, init?: HttpFetchInit) => ReturnType<HttpFetch>;
    const res = await fetchFn(url, init);
    if (!res.ok) {
      throw new Error(`ydc-intelligence-connector ${url} -> ${res.status}`);
    }
    return normalizeYdcBody(this.config.sourceId, await res.json(), this.config);
  }
}

export function resolveYdcApiKey(): string | undefined {
  const key = process.env.YDC_API_KEY?.trim();
  return key || undefined;
}
