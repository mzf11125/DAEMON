/** BigPlan Phase 2.3 | Graph Analyst Subagent tests */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  graphAnalystSubagent,
  graphTraversalTool,
  graphPatternDetectionTool,
} from "./graph-analyst.js";

const originalFetch = globalThis.fetch;

describe("graphAnalystSubagent", () => {
  it("exports graph-analyst definition with tools (happy path)", () => {
    assert.equal(graphAnalystSubagent.name, "graph-analyst");
    assert.ok(graphAnalystSubagent.systemPrompt.includes("Neo4j"));
    assert.equal(graphAnalystSubagent.tools.length, 2);
  });
});

describe("graphTraversalTool", () => {
  let fetchCalls: { url: string; init?: RequestInit }[] = [];

  beforeEach(() => {
    fetchCalls = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      fetchCalls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          nodes: [
            { id: "entity-1", type: "Person", label: "Alice", riskScore: 42 },
            { id: "entity-2", type: "Account", label: "Acct", riskScore: 10 },
          ],
          edges: [{ source: "entity-1", target: "entity-2", type: "OWNS" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls graph traverse API and formats results (happy path)", async () => {
    const result = await graphTraversalTool.invoke({
      startEntityId: "entity-1",
      direction: "BOTH",
      maxDepth: 2,
    });
    assert.ok(String(result).includes("Found 2 nodes"));
    assert.ok(fetchCalls[0]?.url.includes("/api/v1/graph/traverse"));
  });

  it("returns error message when API fails (error case)", async () => {
    globalThis.fetch = (async () =>
      new Response("not found", { status: 404 })) as typeof fetch;
    const result = await graphTraversalTool.invoke({
      startEntityId: "missing",
      direction: "OUTBOUND",
      maxDepth: 1,
    });
    assert.ok(String(result).includes("Error: graph traversal failed"));
  });
});

describe("graphPatternDetectionTool", () => {
  beforeEach(() => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          detected: true,
          confidence: 0.85,
          pattern: "LAYERING",
          involvedEntities: ["a", "b"],
          description: "Rapid layering detected",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns JSON pattern detection result (happy path)", async () => {
    const result = await graphPatternDetectionTool.invoke({
      patternType: "LAYERING",
      seedEntityId: "entity-1",
      timeWindowDays: 30,
    });
    const parsed = JSON.parse(String(result)) as { detected: boolean };
    assert.equal(parsed.detected, true);
  });
});
