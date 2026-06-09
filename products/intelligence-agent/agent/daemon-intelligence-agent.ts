/** Spec: products/intelligence-agent/agent/daemon-intelligence-agent.ts | BigPlan Phase 2.1 */
import { MemorySaver, InMemoryStore } from "@langchain/langgraph";
import {
  CompositeBackend,
  createDeepAgent,
  FilesystemBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { skillsPath, memoryPath, intelligenceAgentRoot } from "../paths.js";
import { createYdcTools, isYdcEnabled } from "./ydc-tools.js";
import { createDaemonApiTools } from "./daemon-api-tools.js";
import { createOsintAnalystSubagent } from "../subagents/osint-analyst.js";
import { createDarkwebAnalystSubagent } from "../subagents/darkweb-analyst.js";
import { graphAnalystSubagent } from "../subagents/graph-analyst.js";
import { strNarratorSubagent } from "../subagents/str-narrator.js";

export interface DaemonIntelligenceAgentOptions {
  readonly model: BaseChatModel;
  readonly httpFetch?: typeof fetch;
}

let agentPromise: Promise<unknown> | undefined;

function createAgentBackend() {
  const defaultBackend = new StateBackend();
  const memoriesBackend = new StoreBackend({
    namespace: ["daemon-intelligence-agent", "memories"],
  });
  const skillsBackend = new FilesystemBackend({
    rootDir: skillsPath(),
    virtualMode: true,
  });
  return new CompositeBackend(defaultBackend, {
    "/memories/": memoriesBackend,
    "/skills/": skillsBackend,
  });
}

const PPATK_SYSTEM_PROMPT =
  "You are the Daemon Ontology Intelligence Agent for PPATK/APU-PPT compliance investigations. " +
  "Coordinate OSINT (surface web via YOU.COM YDC), dark web clearnet signals, risk scoring, and STR narrative support. " +
  "Delegate to osint-analyst for entity enrichment and adverse media; delegate to darkweb-analyst for dark web signal analysis; " +
  "delegate to graph-analyst for Neo4j link analysis; delegate to str-narrator for STR/LTMS draft narratives. " +
  "Durable notes live in /memories/AGENTS.md; temporal investigation logs in /memories/TEMPORAL.md. " +
  "All OSINT evidence must be provenance-signed before ontology ingest. Refuse illegal or unauthorized intelligence gathering.";

/**
 * Creates the Daemon Ontology Intelligence deep agent (LangGraph + deepagents).
 * Adopts createDeepAgent pattern from DaemonV2.1 deep-agent.js.
 */
export async function createDaemonIntelligenceAgent(
  options: DaemonIntelligenceAgentOptions,
): Promise<unknown> {
  const httpFetch = options.httpFetch ?? fetch;
  const ydcTools = createYdcTools(httpFetch as Parameters<typeof createYdcTools>[0]);
  const daemonApiTools = createDaemonApiTools(httpFetch);
  const osintTools = [...ydcTools, ...daemonApiTools];

  const ydcBlock = isYdcEnabled()
    ? "YDC web search is enabled — delegate OSINT tasks to osint-analyst. "
    : "YDC_API_KEY is not set — OSINT web search tools are unavailable. ";

  return createDeepAgent({
    name: "daemon-intelligence-agent",
    model: options.model,
    systemPrompt: PPATK_SYSTEM_PROMPT + ydcBlock,
    backend: createAgentBackend(),
    store: new InMemoryStore(),
    memory: [memoryPath("AGENTS.md"), memoryPath("TEMPORAL.md")],
    skills: ["/skills/"],
    subagents: [
      createOsintAnalystSubagent({ tools: osintTools }),
      createDarkwebAnalystSubagent({ tools: [...ydcTools, ...daemonApiTools] }),
      graphAnalystSubagent,
      strNarratorSubagent,
    ] as never,
    checkpointer: new MemorySaver(),
  });
}

export async function getDaemonIntelligenceAgent(
  options: DaemonIntelligenceAgentOptions,
): Promise<unknown> {
  if (!agentPromise) {
    agentPromise = createDaemonIntelligenceAgent(options);
  }
  return agentPromise;
}

export function getDaemonIntelligenceAgentCapabilities() {
  return {
    packageRoot: intelligenceAgentRoot(),
    ydcEnabled: isYdcEnabled(),
    subagents: ["osint-analyst", "darkweb-analyst", "graph-analyst", "str-narrator"],
    memoryPath: "/memories/AGENTS.md",
    skillsPath: "/skills/",
  };
}
