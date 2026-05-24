import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  loadEvalCases,
  withMcpClient,
  toolResultText,
  type EvalCaseFile,
  repoRoot,
} from "./mcp-client.js";
import { runAgentLoop, type AgentRunResult } from "./agent.js";
import { redactForLog } from "./redact.js";
import { traceEvalRun } from "./tracing.js";
import {
  langsmithEvalEnabled,
  runLangSmithEval,
  preloadCases,
} from "./langsmith-eval.js";

type CaseResult = {
  caseId: string;
  ok: boolean;
  durationMs: number;
  toolsCalled: string[];
  error?: string;
};

type EvalRubric = {
  caseId: string;
  criteria?: Array<{ id: string; weight?: number; description?: string }>;
};

function loadRubric(caseId: string): EvalRubric | null {
  const path = resolve(repoRoot(), `aip/evals/rubrics/${caseId}.json`);
  if (!existsSync(path)) return null;
  const rubric = JSON.parse(readFileSync(path, "utf8")) as EvalRubric;
  if (rubric.caseId !== caseId) {
    throw new Error(`rubric caseId mismatch: ${rubric.caseId} vs ${caseId}`);
  }
  return rubric;
}

function parseToolContent(result: unknown): string {
  return toolResultText(result);
}

async function runToolCase(c: EvalCaseFile): Promise<CaseResult> {
  const start = Date.now();
  const toolsCalled: string[] = [];
  const toolName =
    c.expectedTool ?? c.expect?.toolsCalled?.[0] ?? "ontology_list_objects";
  const args: Record<string, unknown> = {};
  if (toolName === "ontology_list_objects") {
    args.objectType = c.expectedObjectType ?? "Signal";
  } else if (toolName === "investigate_case") {
    args.caseId = (c.input as { caseId?: string })?.caseId ?? "case-001";
    args.signalLimit = 5;
  } else if (toolName === "summarize_case_context") {
    args.caseId = (c.input as { caseId?: string })?.caseId ?? "case-001";
  } else if (toolName === "get_case") {
    args.caseId = (c.input as { caseId?: string })?.caseId ?? "case-001";
  } else if (toolName === "list_audit_events") {
    args.resourceType = "Case";
    args.resourceId = (c.input as { caseId?: string })?.caseId ?? "case-001";
    args.limit = 10;
  }

  try {
    await withMcpClient(async (client) => {
      const result = await client.callTool({ name: toolName, arguments: args });
      toolsCalled.push(toolName);
      const text = parseToolContent(result);
      assertCaseExpectations(c, text, toolsCalled);
    });
    return { caseId: c.caseId, ok: true, durationMs: Date.now() - start, toolsCalled };
  } catch (err) {
    return {
      caseId: c.caseId,
      ok: false,
      durationMs: Date.now() - start,
      toolsCalled,
      error: redactForLog(String(err)),
    };
  }
}

async function runAgentCase(c: EvalCaseFile): Promise<CaseResult> {
  const start = Date.now();
  const message =
    c.input?.userMessage ?? c.prompt ?? "List open signals for triage.";
  try {
    const result: AgentRunResult = await traceEvalRun(c.caseId, () =>
      runAgentLoop({
        agentId: c.agentId ?? "triage-analyst",
        promptVersion: c.promptVersion ?? "v1",
        userMessage: message,
        maxSteps: Number(process.env.AGENT_MAX_STEPS ?? 3),
      }),
    );
    assertCaseExpectations(c, result.finalText, result.toolsCalled);
    return {
      caseId: c.caseId,
      ok: true,
      durationMs: Date.now() - start,
      toolsCalled: result.toolsCalled,
    };
  } catch (err) {
    return {
      caseId: c.caseId,
      ok: false,
      durationMs: Date.now() - start,
      toolsCalled: [],
      error: redactForLog(String(err)),
    };
  }
}

function assertCaseExpectations(
  c: EvalCaseFile,
  text: string,
  toolsCalled: string[],
): void {
  const forbidden = c.expect?.forbiddenTools ?? [];
  for (const f of forbidden) {
    if (toolsCalled.includes(f)) {
      throw new Error(`forbidden tool called: ${f}`);
    }
  }
  const expectedTools = c.expect?.toolsCalled;
  if (expectedTools?.length) {
    for (const t of expectedTools) {
      if (!toolsCalled.includes(t)) {
        throw new Error(`expected tool not called: ${t} (got ${toolsCalled.join(",")})`);
      }
    }
  }
  if (c.expect?.mustIncludeManifest && !text.includes("objectTypes") && !text.includes("version")) {
    throw new Error("expected manifest content in response");
  }
  const tool = c.expectedTool ?? c.expect?.toolsCalled?.[0];
  if (tool === "ontology_list_objects" && !text.includes("items")) {
    throw new Error("expected items in ontology_list_objects output");
  }
  if (tool === "investigate_case" && !text.includes("signals")) {
    throw new Error("expected signals in investigate_case output");
  }
  if (
    toolsCalled.includes("ontology_list_objects") &&
    !text.includes("items") &&
    !c.expectedTool
  ) {
    throw new Error("expected items in ontology_list_objects output");
  }
}

async function healthCheck(): Promise<void> {
  const base = process.env.ONTOLOGY_SERVICE_URL ?? "http://localhost:8081";
  const res = await fetch(`${base}/health`);
  if (!res.ok) {
    throw new Error(`ontology health failed: ${res.status}`);
  }
}

function compareBaseline(results: CaseResult[]): void {
  if (process.env.EVAL_SKIP_BASELINE === "true") return;
  const baselinePath = resolve(repoRoot(), "aip/evals/baseline.json");
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as {
    goldenPassRate?: number | null;
    cases?: Record<string, { status?: string }>;
  };
  const pass = results.filter((r) => r.ok).length;
  const rate = results.length ? pass / results.length : 0;
  if (baseline.goldenPassRate != null && rate < baseline.goldenPassRate) {
    console.warn(
      `warn: pass rate ${rate.toFixed(2)} below baseline ${baseline.goldenPassRate}`,
    );
  }
}

function maybeUpdateBaseline(results: CaseResult[]): void {
  if (process.env.EVAL_RECORD_BASELINE !== "true") return;
  const allOk = results.every((r) => r.ok);
  if (!allOk) return;
  const baselinePath = resolve(repoRoot(), "aip/evals/baseline.json");
  const pass = results.length;
  const rate = 1;
  const cases: Record<string, unknown> = {};
  for (const r of results) {
    cases[r.caseId] = {
      status: "pass",
      durationMs: r.durationMs,
      model: process.env.LLM_MODEL ?? null,
    };
  }
  writeFileSync(
    baselinePath,
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        goldenPassRate: rate,
        cases,
        flakeWaivers7d: 0,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("baseline recorded:", baselinePath);
}

async function main() {
  await healthCheck();
  const cases = loadEvalCases();
  if (!cases.length) {
    throw new Error("no eval cases found");
  }

  if (langsmithEvalEnabled()) {
    preloadCases(cases);
    console.log(`langsmith-eval: running ${cases.length} cases via LangSmith datasets`);
    await runLangSmithEval(cases);
    return;
  }

  const results: CaseResult[] = [];
  for (const c of cases) {
    const mode = c.mode ?? (c.expectedTool ? "tool" : "agent");
    const rubric = loadRubric(c.caseId);
    const rubricNote = rubric ? ` rubric=${rubric.criteria?.length ?? 0}c` : "";
    console.log(`eval case=${c.caseId} mode=${mode}${rubricNote}`);
    const result =
      mode === "agent" ? await runAgentCase(c) : await runToolCase(c);
    results.push(result);
    if (!result.ok) {
      console.error("FAIL", result.caseId, result.error);
    } else {
      console.log("PASS", result.caseId, result.durationMs, "ms", result.toolsCalled);
    }
  }

  compareBaseline(results);
  maybeUpdateBaseline(results);

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    process.exit(1);
  }
  console.log(`eval passed: ${results.length}/${results.length} cases`);
}

main().catch((err) => {
  console.error(redactForLog(String(err)));
  process.exit(1);
});
