import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { MCP_TOOL_SCHEMA_VERSION } from "./config.js";
import {
  checkRateLimit,
  ontologyFetch,
  platformFetch,
  caseFetch,
} from "./services.js";

function buildServer(getAuth?: () => string | undefined) {
  const server = new McpServer({
    name: "daemon-ontology",
    version: MCP_TOOL_SCHEMA_VERSION,
  });

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
        toolsSchemaVersion: MCP_TOOL_SCHEMA_VERSION,
        signals: items.map((s) => ({
          signalId: s.primaryKey,
          summary: s.properties?.summary,
          severity: s.properties?.severity,
        })),
        recommendation:
          "Human-in-the-loop: call OpenCase in the console with title and signalIds[] when escalation is warranted.",
      };
      if (caseId) {
        report.caseId = caseId;
        try {
          report.links = await ontologyFetch(`/v1/objects/Case/${encodeURIComponent(caseId)}/links`, auth);
        } catch (err) {
          report.linksError =
            err instanceof Error ? err.message : "failed to load case links (route may be unavailable)";
        }
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

  server.tool(
    "list_audit_events",
    "List audit log events for the tenant (read-only). Optional filter by case via resourceType=Case and resourceId.",
    {
      resourceType: z.string().optional(),
      resourceId: z.string().optional().describe("e.g. case id when resourceType is Case"),
      limit: z.number().int().min(1).max(100).optional(),
    },
    async ({ resourceType, resourceId, limit }) => {
      const auth = getAuth?.();
      checkRateLimit(auth ?? "anonymous");
      const params = new URLSearchParams();
      if (resourceType) params.set("resourceType", resourceType);
      if (resourceId) params.set("resourceId", resourceId);
      if (limit) params.set("limit", String(limit));
      const q = params.toString();
      const path = q ? `/v1/audit/events?${q}` : "/v1/audit/events";
      const data = await platformFetch(path, auth);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "summarize_case_context",
    "Read-only synthesis of case title and linked signals via ontology function.",
    {
      caseId: z.string().describe("Case id to summarize"),
    },
    async ({ caseId }) => {
      const auth = getAuth?.();
      checkRateLimit(auth ?? "anonymous");
      const data = await ontologyFetch("/v1/functions/summarizeCaseContext", auth, {
        method: "POST",
        body: JSON.stringify({ caseId }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "get_case",
    "Fetch case record from case-service (read-only).",
    {
      caseId: z.string().describe("Case id"),
    },
    async ({ caseId }) => {
      const auth = getAuth?.();
      checkRateLimit(auth ?? "anonymous");
      const data = await caseFetch(`/v1/cases/${encodeURIComponent(caseId)}`, auth);
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
    console.error(`mcp-ontology SSE listening on :${port} (schema ${MCP_TOOL_SCHEMA_VERSION})`);
  });
}

const mode = process.env.MCP_TRANSPORT ?? "stdio";
if (mode === "sse") {
  await mainSSE();
} else {
  await mainStdio();
}
