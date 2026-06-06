/** BigPlan Phase 2.5 | Dark Web Surface Monitor tests */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { DarkwebSurfaceMonitor } from "./darkweb-surface-monitor.js";

const originalFetch = globalThis.fetch;

describe("DarkwebSurfaceMonitor", () => {
  beforeEach(() => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          hits: [
            {
              title: "Dark web marketplace mention",
              url: "https://example.com/article",
              description: "Entity linked to .onion darkweb marketplace",
              published_date: "2026-01-01",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("scans entity and returns surface signals (happy path)", async () => {
    const monitor = new DarkwebSurfaceMonitor({ ydcApiKey: "test-key" });
    const report = await monitor.scanEntity("Acme Corp");
    assert.equal(report.entityName, "Acme Corp");
    assert.ok(report.signals.length > 0);
    assert.ok(report.summary.includes("Found"));
  });

  it("throws when YDC_API_KEY is missing (error case)", () => {
    const prev = process.env.YDC_API_KEY;
    delete process.env.YDC_API_KEY;
    assert.throws(() => new DarkwebSurfaceMonitor(), /YDC_API_KEY/);
    if (prev) process.env.YDC_API_KEY = prev;
  });
});
