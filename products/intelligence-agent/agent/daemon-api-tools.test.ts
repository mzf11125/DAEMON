/** Spec: products/intelligence-agent/agent/daemon-api-tools.test.ts | BigPlan Phase 2.5 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDaemonApiTools } from "./daemon-api-tools.js";

describe("daemon-api-tools", () => {
  it("fetch_daemon_get rejects blocked paths (error case)", async () => {
    const [, fetchTool] = createDaemonApiTools();
    const out = await fetchTool.invoke({ path: "/v1/agent/invoke" });
    assert.match(String(out), /not allowed/);
  });

  it("fetch_daemon_get requires API key (error case)", async () => {
    const prev = process.env.DAEMON_API_KEY;
    delete process.env.DAEMON_API_KEY;
    delete process.env.DAEMON_TEST_DEFAULT_API_KEY;
    const [, fetchTool] = createDaemonApiTools(async () => new Response("{}"));
    const out = await fetchTool.invoke({ path: "/health" });
    assert.match(String(out), /DAEMON_API_KEY/);
    if (prev !== undefined) process.env.DAEMON_API_KEY = prev;
  });
});
