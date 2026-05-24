import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function repoRoot(): string {
  return resolve(__dirname, "../../..");
}

export function mcpServerPath(): string {
  return resolve(repoRoot(), "aip/mcp-ontology/dist/index.js");
}

export async function withMcpClient<T>(
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const transport = new StdioClientTransport({
    command: "node",
    args: [mcpServerPath()],
    env: {
      ...process.env,
      ONTOLOGY_SERVICE_URL: process.env.ONTOLOGY_SERVICE_URL ?? "http://localhost:8081",
      PLATFORM_API_URL: process.env.PLATFORM_API_URL ?? "http://localhost:8080",
      CASE_SERVICE_URL: process.env.CASE_SERVICE_URL ?? "http://localhost:8084",
      TENANT_ID: process.env.TENANT_ID ?? "tenant-demo",
      OIDC_REQUIRED: process.env.OIDC_REQUIRED ?? "false",
      MCP_TOOL_SCHEMA_VERSION: process.env.MCP_TOOL_SCHEMA_VERSION ?? "0.2.0",
    },
  });
  const client = new Client({ name: "daemon-aip-agent", version: "0.2.0" });
  await client.connect(transport);
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

export type EvalCaseFile = {
  caseId: string;
  version?: number;
  mode?: "tool" | "agent";
  agentId?: string;
  promptVersion?: string;
  input?: { userMessage?: string };
  expect?: {
    toolsCalled?: string[];
    forbiddenTools?: string[];
    minHighSeveritySignals?: number;
    mustIncludeManifest?: boolean;
  };
  /** Legacy single-tool eval */
  expectedTool?: string;
  expectedObjectType?: string;
  prompt?: string;
};

export function loadEvalCases(): EvalCaseFile[] {
  const dir = resolve(repoRoot(), "aip/evals/cases");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  return files.map((f) => {
    const raw = JSON.parse(readFileSync(resolve(dir, f), "utf8")) as EvalCaseFile;
    if (!raw.caseId) {
      raw.caseId = f.replace(/\.json$/, "");
    }
    return raw;
  });
}

export function toolResultText(result: unknown): string {
  return JSON.stringify(result);
}
