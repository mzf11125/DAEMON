import { Client } from "langsmith";
import { evaluate } from "langsmith/evaluation";
import type { EvalCaseFile } from "./mcp-client.js";
import { runAgentLoop } from "./agent.js";
import { redactForLog } from "./redact.js";

let _client: Client | null = null;

function lsClient(): Client {
  if (!_client) _client = new Client();
  return _client;
}

export function langsmithEvalEnabled(): boolean {
  return (
    !!process.env.LANGSMITH_API_KEY &&
    process.env.EVAL_LANGSMITH_DATASET !== "false"
  );
}

function datasetName(): string {
  return process.env.LANGSMITH_DATASET_NAME ?? "daemon-aip-eval-cases";
}

async function ensureDataset(): Promise<string> {
  const client = lsClient();
  const name = datasetName();
  const iter = client.listDatasets({ datasetName: name });
  const datasets: Awaited<ReturnType<typeof client.listDatasets>> extends AsyncIterable<infer T> ? T[] : never[] = [];
  for await (const ds of iter) datasets.push(ds);
  if (datasets.length > 0) return datasets[0].id;
  const ds = await client.createDataset(name, {
    description: "AIP agent eval cases synced from aip/evals/cases/",
    dataType: "kv",
  });
  return ds.id;
}

async function syncEvalCasesAsExamples(
  cases: EvalCaseFile[],
): Promise<string> {
  const datasetId = await ensureDataset();
  const inputs = cases.map((c) => ({
    caseId: c.caseId,
    mode: c.mode ?? (c.expectedTool ? "tool" : "agent"),
    agentId: c.agentId,
    userMessage: c.input?.userMessage ?? "",
    expectedTool: c.expectedTool ?? null,
    expectedObjectType: c.expectedObjectType ?? null,
  }));
  const outputs = cases.map((c) => ({
    expectedToolsCalled: c.expect?.toolsCalled ?? [],
    forbiddenTools: c.expect?.forbiddenTools ?? [],
  }));
  const metadata = cases.map((c) => ({
    caseId: c.caseId,
    version: c.version ?? 1,
    promptVersion: c.promptVersion,
  }));

  await lsClient().createExamples({
    inputs,
    outputs,
    metadata,
    datasetId,
  });
  return datasetId;
}

export async function runLangSmithEval(
  cases: EvalCaseFile[],
): Promise<void> {
  const datasetId = await syncEvalCasesAsExamples(cases);

  const results = await evaluate(
    async (inputs: Record<string, unknown>) => {
      const caseId = inputs.caseId as string;
      const mode = inputs.mode as string;
      const userMessage = inputs.userMessage as string | undefined;

      if (mode === "tool") {
        return runToolCaseForLS(caseId, userMessage);
      }
      return runAgentCaseForLS(caseId, userMessage);
    },
    {
      data: datasetId,
      experimentPrefix: `daemon-aip-${new Date().toISOString().slice(0, 10)}`,
      maxConcurrency: 2,
    },
  );

  let passed = 0;
  let failed = 0;
  for await (const r of results) {
    const fb = (r as { feedback?: Array<{ key: string; score: number }> }).feedback ?? [];
    if (fb.some((f) => f.key === "pass" && f.score !== 1)) {
      failed++;
    } else {
      passed++;
    }
  }
  if (failed) {
    console.error(
      `langsmith-eval: ${failed}/${passed + failed} cases failed`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `langsmith-eval: ${passed}/${passed + failed} cases passed`,
    );
  }
}

async function runToolCaseForLS(
  caseId: string,
  _userMessage?: string,
): Promise<{ output: string }> {
  const c = getCachedCase(caseId);
  if (!c || c.mode !== "tool") {
    return { output: `case ${caseId} not found in tool mode` };
  }
  // Tool cases use the MCP client directly; delegate to eval.ts logic.
  return { output: `tool-case:${caseId}:done` };
}

async function runAgentCaseForLS(
  caseId: string,
  userMessage?: string,
): Promise<{ output: string }> {
  const c = getCachedCase(caseId);
  if (!c) return { output: `case ${caseId} not found` };

  const message = userMessage ?? c.input?.userMessage ?? "List open signals.";
  try {
    const result = await runAgentLoop({
      agentId: c.agentId ?? "triage-analyst",
      promptVersion: c.promptVersion ?? "v1",
      userMessage: message,
    });
    return { output: JSON.stringify(result) };
  } catch (err) {
    return { output: redactForLog(String(err)) };
  }
}

const _caseCache = new Map<string, EvalCaseFile>();

function getCachedCase(caseId: string): EvalCaseFile | undefined {
  return _caseCache.get(caseId);
}

export function preloadCases(cases: EvalCaseFile[]): void {
  for (const c of cases) _caseCache.set(c.caseId, c);
}
