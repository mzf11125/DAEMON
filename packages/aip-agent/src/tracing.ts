import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { repoRoot } from "./mcp-client.js";
import { redactForLog } from "./redact.js";

export function tracingEnabled(): boolean {
  return process.env.LANGCHAIN_TRACING_V2 === "true";
}

export function tracingProject(): string | undefined {
  return process.env.LANGCHAIN_PROJECT;
}

function writeRunArtifact(name: string, payload: Record<string, unknown>): void {
  if (process.env.EVAL_WRITE_RUNS !== "true") return;
  const dir = resolve(repoRoot(), "aip/evals/runs");
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, `${name}-${Date.now()}.json`);
  writeFileSync(file, JSON.stringify(payload, null, 2));
}

export async function traceEvalRun<T>(caseId: string, fn: () => Promise<T>): Promise<T> {
  const project = process.env.LANGCHAIN_PROJECT ?? "daemon-aip-eval";
  if (tracingEnabled()) {
    process.env.LANGCHAIN_PROJECT = project;
  }
  const start = Date.now();
  try {
    const out = await fn();
    writeRunArtifact("eval", {
      caseId,
      project,
      durationMs: Date.now() - start,
      tracing: tracingEnabled(),
    });
    return out;
  } catch (err) {
    writeRunArtifact("eval-error", {
      caseId,
      error: redactForLog(String(err)),
      tracing: tracingEnabled(),
    });
    throw err;
  }
}

export async function traceAgentRun<T>(agentId: string, fn: () => Promise<T>): Promise<T> {
  const project = process.env.LANGCHAIN_PROJECT ?? "daemon-aip-agent";
  if (tracingEnabled()) {
    process.env.LANGCHAIN_PROJECT = project;
  }
  return fn();
}
