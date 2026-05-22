#!/usr/bin/env node
import { runAgentLoop } from "./agent.js";
import { redactForLog } from "./redact.js";

async function main() {
  const args = process.argv.slice(2);
  let caseId = "triage-list-signals";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--case" && args[i + 1]) {
      caseId = args[++i];
    }
  }

  const message =
    process.env.ORCHESTRATOR_MESSAGE ??
    "List high-severity open signals and summarize triage options (read-only).";

  const result = await runAgentLoop({
    agentId: "triage-analyst",
    promptVersion: process.env.PROMPT_VERSION ?? "v1",
    userMessage: message,
    maxSteps: Number(process.env.AGENT_MAX_STEPS ?? 3),
  });

  console.log(
    JSON.stringify(
      {
        caseId,
        toolsCalled: result.toolsCalled,
        steps: result.steps.length,
        preview: redactForLog(result.finalText.slice(0, 1200)),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(redactForLog(String(err)));
  process.exit(1);
});
