import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ChatOpenAI } from "@langchain/openai";
import { withMcpClient, repoRoot, toolResultText } from "./mcp-client.js";
import { resolveAPIKey, resolveBaseURL, resolveProvider } from "./providers.js";
import { redactForLog } from "./redact.js";
import { maxOutputTokens, maxPromptChars } from "./limits.js";
import { traceAgentRun } from "./tracing.js";

export type AgentRunResult = {
  toolsCalled: string[];
  steps: Array<{ tool?: string; summary?: string }>;
  finalText: string;
};

export type AgentLoopOptions = {
  agentId: string;
  promptVersion: string;
  userMessage: string;
  maxSteps?: number;
};

function loadSystemPrompt(agentId: string, promptVersion: string): string {
  const path = resolve(
    repoRoot(),
    `aip/prompts/${agentId}/${promptVersion}/system.md`,
  );
  return readFileSync(path, "utf8");
}

function buildModel() {
  const provider = resolveProvider();
  return new ChatOpenAI({
    modelName: process.env.LLM_MODEL ?? "openai/gpt-4o-mini",
    temperature: 0,
    maxTokens: maxOutputTokens(),
    configuration: {
      baseURL: resolveBaseURL(provider),
    },
    apiKey: resolveAPIKey(),
  });
}

const READ_ONLY_TOOLS = [
  "ontology_manifest",
  "ontology_list_objects",
  "investigate_case",
  "list_audit_events",
  "summarize_case_context",
  "get_case",
];

export async function runAgentLoop(opts: AgentLoopOptions): Promise<AgentRunResult> {
  return traceAgentRun(opts.agentId, async () => {
    const maxSteps = opts.maxSteps ?? Number(process.env.AGENT_MAX_STEPS ?? 3);
    const system = loadSystemPrompt(opts.agentId, opts.promptVersion);
    const userMessage = opts.userMessage.slice(0, maxPromptChars());

    if (process.env.EVAL_DETERMINISTIC === "true" || !resolveAPIKey() || resolveAPIKey() === "not-needed") {
      return runDeterministicFallback(userMessage);
    }

    return withMcpClient(async (client) => {
      const list = await client.listTools();
      const toolNames = list.tools.map((t) => t.name).filter((n) => READ_ONLY_TOOLS.includes(n));
      const toolsCalled: string[] = [];
      const steps: AgentRunResult["steps"] = [];
      const model = buildModel();

      let context = `System:\n${system}\n\nUser:\n${userMessage}\n\nAvailable tools: ${toolNames.join(", ")}`;
      let finalText = "";

      for (let step = 0; step < maxSteps; step++) {
        const reply = await model.invoke(
          `${context}\n\nReply with JSON only: {"tool":"<name>","arguments":{...}} to call one read-only tool, or {"done":true,"answer":"..."} when finished. Never use OpenCase or ontology_execute_action.`,
        );
        const text = String(reply.content);
        finalText = text;
        let parsed: { tool?: string; arguments?: Record<string, unknown>; done?: boolean; answer?: string };
        try {
          parsed = JSON.parse(text) as typeof parsed;
        } catch {
          steps.push({ summary: redactForLog(text.slice(0, 500)) });
          break;
        }
        if (parsed.done) {
          finalText = parsed.answer ?? text;
          break;
        }
        if (!parsed.tool || !toolNames.includes(parsed.tool)) {
          steps.push({ summary: "no valid tool in model reply" });
          break;
        }
        const result = await client.callTool({
          name: parsed.tool,
          arguments: parsed.arguments ?? {},
        });
        toolsCalled.push(parsed.tool);
        const observation = toolResultText(result);
        steps.push({ tool: parsed.tool, summary: observation.slice(0, 800) });
        context += `\n\nTool ${parsed.tool} result:\n${observation}`;
        finalText = observation;
      }

      return { toolsCalled, steps, finalText };
    });
  });
}

async function runDeterministicFallback(userMessage: string): Promise<AgentRunResult> {
  const tool = userMessage.toLowerCase().includes("manifest")
    ? "ontology_manifest"
    : "ontology_list_objects";
  const args =
    tool === "ontology_list_objects" ? { objectType: "Signal", limit: 10 } : {};
  return withMcpClient(async (client) => {
    const result = await client.callTool({ name: tool, arguments: args });
    const text = toolResultText(result);
    return {
      toolsCalled: [tool],
      steps: [{ tool, summary: text.slice(0, 400) }],
      finalText: text,
    };
  });
}
