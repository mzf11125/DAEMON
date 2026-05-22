/**
 * Minimal LangChain-style agent loop (imperative, no LangGraph).
 * Production path uses MCP tools; eval harness calls tools directly.
 */
import { ChatOpenAI } from "@langchain/openai";

export type AgentStep = { tool?: string; result?: string };

export async function runAgentLoop(prompt: string, tools: Record<string, (input: string) => Promise<string>>) {
  const provider = process.env.LLM_PROVIDER ?? "openrouter";
  const model = new ChatOpenAI({
    modelName: process.env.LLM_MODEL ?? "openai/gpt-4o-mini",
    temperature: 0,
    configuration: {
      baseURL:
        provider === "ollama"
          ? (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1")
          : provider === "lmstudio"
            ? (process.env.LMSTUDIO_BASE_URL ?? "http://localhost:1234/v1")
            : (process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1"),
    },
    apiKey:
      process.env.OPENROUTER_API_KEY ??
      process.env.OPENAI_API_KEY ??
      process.env.OLLAMA_API_KEY ??
      "not-needed",
  });

  const toolList = Object.keys(tools).join(", ");
  const first = await model.invoke(
    `You are a read-only triage assistant. Available tools: ${toolList}. User: ${prompt}\nReply with JSON: {"tool":"<name>","input":"<objectType or query>"} or {"answer":"..."} if no tool needed.`,
  );
  const text = String(first.content);
  let step: AgentStep = { result: text };
  try {
    const parsed = JSON.parse(text) as { tool?: string; input?: string };
    if (parsed.tool && tools[parsed.tool]) {
      step.tool = parsed.tool;
      step.result = await tools[parsed.tool](parsed.input ?? "Signal");
    }
  } catch {
    // non-JSON model output — return raw
  }
  return step;
}
