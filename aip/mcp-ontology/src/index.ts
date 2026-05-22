import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const ontologyUrl = process.env.ONTOLOGY_SERVICE_URL ?? "http://localhost:8081";
const tenantId = process.env.TENANT_ID ?? "tenant-demo";
const rateLimitPerMin = Number(process.env.MCP_RATE_LIMIT_PER_MIN ?? 60);

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): void {
  const now = Date.now();
  const bucket = rateBuckets.get(key) ?? { count: 0, resetAt: now + 60_000 };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + 60_000;
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (bucket.count > rateLimitPerMin) {
    throw new Error(JSON.stringify({ code: "RATE_LIMITED", message: "too many requests", retryable: true }));
  }
}

async function ontologyFetch(path: string, authHeader?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tenant-Id": tenantId,
  };
  if (authHeader) {
    headers.Authorization = authHeader;
  }
  const res = await fetch(`${ontologyUrl}${path}`, { headers });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(JSON.stringify(body));
  }
  return body;
}

function buildServer(getAuth?: () => string | undefined) {
  const server = new McpServer({ name: "daemon-ontology", version: "0.1.0" });

  server.tool(
    "ontology_manifest",
    "Return ontology manifest metadata (read-only). Use when you need object types and versions.",
    {},
    async () => {
      const auth = getAuth?.();
      checkRateLimit(auth ?? "anonymous");
      const data = await ontologyFetch("/v1/ontology/v2/manifest", auth);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "investigate_case",
    "Read-only case investigation: list signals, optional case links, and recommended human OpenCase params. Does not auto-open cases.",
    {
      caseId: z.string().optional().describe("Existing case id to inspect links"),
      signalLimit: z.number().int().min(1).max(20).optional(),
    },
    async ({ caseId, signalLimit }) => {
      const auth = getAuth?.();
      checkRateLimit(auth ?? "anonymous");
      const signals = (await ontologyFetch("/v1/objects/Signal", auth)) as {
        items?: Array<{ primaryKey?: string; properties?: Record<string, unknown> }>;
      };
      const max = signalLimit ?? 10;
      const items = (signals.items ?? []).slice(0, max);
      const report: Record<string, unknown> = {
        signals: items.map((s) => ({
          signalId: s.primaryKey,
          summary: s.properties?.summary,
          severity: s.properties?.severity,
        })),
        recommendation:
          "Human-in-the-loop: call OpenCase with title and signalIds[] when escalation is warranted.",
      };
      if (caseId) {
        const links = await ontologyFetch(`/v1/objects/Case/${caseId}/links`, auth);
        report.caseId = caseId;
        report.links = links;
      }
      return { content: [{ type: "text", text: JSON.stringify(report, null, 2) }] };
    },
  );

  server.tool(
    "ontology_list_objects",
    "List ontology objects by type (read-only). Returns JSON items. Use when triaging signals or cases.",
    {
      objectType: z.enum(["Signal", "Case", "Asset"]).describe("Ontology object type"),
      limit: z.number().int().min(1).max(50).optional().describe("Max items (default 50)"),
    },
    async ({ objectType, limit }) => {
      const auth = getAuth?.();
      checkRateLimit(auth ?? "anonymous");
      const data = (await ontologyFetch(`/v1/objects/${objectType}`, auth)) as {
        items?: unknown[];
      };
      const max = limit ?? 50;
      if (Array.isArray(data.items) && data.items.length > max) {
        data.items = data.items.slice(0, max);
      }
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  return server;
}

async function mainStdio() {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function mainSSE() {
  const app = express();
  const port = Number(process.env.MCP_SSE_PORT ?? 8090);
  const transports = new Map<string, SSEServerTransport>();

  app.get("/sse", async (req, res) => {
    const auth = req.header("authorization");
    if (!auth && process.env.MCP_REQUIRE_AUTH === "true") {
      res.status(401).json({ code: "UNAUTHORIZED", message: "Bearer required" });
      return;
    }
    const transport = new SSEServerTransport("/message", res);
    const sessionId = transport.sessionId;
    transports.set(sessionId, transport);
    const server = buildServer(() => auth);
    await server.connect(transport);
    res.on("close", () => transports.delete(sessionId));
  });

  app.post("/message", express.json(), async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).end();
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  app.listen(port, () => {
    console.error(`mcp-ontology SSE listening on :${port}`);
  });
}

const mode = process.env.MCP_TRANSPORT ?? "stdio";
if (mode === "sse") {
  await mainSSE();
} else {
  await mainStdio();
}
