/** Spec: products/intelligence-agent/agent/daemon-api-tools.ts | BigPlan Phase 2.5 */
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const BLOCKED_PATH_PREFIXES = [
  "/v1/agent/invoke",
  "/v1/agent/resume",
];

export type DaemonHttpFetch = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

function daemonOrigin(): string {
  const fromEnv = String(process.env.DAEMON_INTERNAL_API_ORIGIN ?? "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const port = Number(process.env.PORT) || 3000;
  return `http://127.0.0.1:${port}`;
}

function isPathAllowed(raw: string): boolean {
  const full = String(raw || "").trim();
  if (!full || full.length > 4096) return false;
  const pathOnly = full.split("#")[0]?.split("?")[0] ?? "";
  if (pathOnly.includes("..")) return false;
  if (!pathOnly.startsWith("/v1/") && pathOnly !== "/health") return false;
  for (const b of BLOCKED_PATH_PREFIXES) {
    if (pathOnly === b || pathOnly.startsWith(`${b}/`) || pathOnly.startsWith(`${b}?`)) {
      return false;
    }
  }
  return true;
}

function truncate(text: string, max = 140_000): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n...[truncated ${text.length - max} chars]`;
}

export function createDaemonApiTools(httpFetch: DaemonHttpFetch = globalThis.fetch.bind(globalThis)) {
  const listDaemonApiCatalogTool = tool(
    async () =>
      [
        "## Daemon Ontology Gateway GET APIs",
        "",
        "- `GET /health` — gateway health",
        "- `GET /v1/entities?ontologyId=&limit=` — list entities",
        "- `GET /v1/entities/:entityId` — fetch entity",
        "- `GET /v1/search?q=` — hybrid search",
        "- `POST /v1/ingest/sources/:sourceId/run` — run ingest connector (requires auth headers)",
        "",
        "Use `X-Daemon-Tenant`, `X-Daemon-Domain`, and `Authorization: Bearer <DAEMON_API_KEY>`.",
      ].join("\n"),
    {
      name: "list_daemon_api_catalog",
      description: "Returns read-only Daemon Ontology gateway API paths the intelligence agent may call.",
      schema: z.object({}),
    },
  );

  const fetchDaemonGetTool = tool(
    async ({ path: pathAndQuery, tenant, domain, apiKey }) => {
      const raw = String(pathAndQuery || "").trim();
      if (!raw.startsWith("/")) {
        return "Error: path must start with / (e.g. /v1/entities?limit=5)";
      }
      if (!isPathAllowed(raw)) {
        return `Error: path not allowed: ${raw}`;
      }
      const key =
        apiKey?.trim() ||
        process.env.DAEMON_API_KEY?.trim() ||
        process.env.DAEMON_TEST_DEFAULT_API_KEY?.trim();
      if (!key) {
        return "Error: DAEMON_API_KEY required for Daemon gateway calls.";
      }
      const origin = daemonOrigin();
      const url = `${origin}${raw}`;
      try {
        const r = await httpFetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${key}`,
            "X-Daemon-Tenant": tenant ?? "default",
            ...(domain ? { "X-Daemon-Domain": domain } : {}),
          },
        });
        const text = await r.text();
        return [`HTTP ${r.status}`, `URL: ${url}`, "", truncate(text)].join("\n");
      } catch (err) {
        return `Error fetching ${url}: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
    {
      name: "fetch_daemon_get",
      description:
        "HTTP GET a read-only Daemon Ontology gateway path. Requires tenant/domain headers and API key from environment.",
      schema: z.object({
        path: z.string().min(1),
        tenant: z.string().optional().default("default"),
        domain: z.string().optional(),
        apiKey: z.string().optional(),
      }),
    },
  );

  return [listDaemonApiCatalogTool, fetchDaemonGetTool];
}

export const daemonApiTools = createDaemonApiTools();
