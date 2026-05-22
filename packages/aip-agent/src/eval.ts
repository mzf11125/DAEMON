import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

type EvalCase = {
  id: string;
  prompt: string;
  expectedTool: string;
  expectedObjectType?: string;
};

async function runCase(c: EvalCase): Promise<boolean> {
  const mcpPath = resolve(process.cwd(), "../../aip/mcp-ontology/dist/index.js");
  const transport = new StdioClientTransport({
    command: "node",
    args: [mcpPath],
    env: {
      ...process.env,
      ONTOLOGY_SERVICE_URL: process.env.ONTOLOGY_SERVICE_URL ?? "http://localhost:8081",
      TENANT_ID: process.env.TENANT_ID ?? "tenant-demo",
    },
  });
  const client = new Client({ name: "daemon-aip-eval", version: "0.1.0" });
  await client.connect(transport);

  const result = await client.callTool({
    name: c.expectedTool,
    arguments: { objectType: c.expectedObjectType ?? "Signal" },
  });

  await client.close();
  const text = JSON.stringify(result);
  return text.includes("items") || text.includes("objectType");
}

async function main() {
  const casePath = resolve(process.cwd(), "../../aip/evals/cases/triage-list-signals.json");
  const c = JSON.parse(readFileSync(casePath, "utf8")) as EvalCase;
  const ok = await runCase(c);
  if (!ok) {
    console.error("eval failed:", c.id);
    process.exit(1);
  }
  console.log("eval passed:", c.id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
