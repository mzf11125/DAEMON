/** Spec: collect-sensing/connectors/api-connectors/ydc-intelligence-connector.test.ts | BigPlan Phase 1.1 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  YDCIntelligenceConnector,
  InMemoryYDCCreditTracker,
  type YDCIntelligenceConfig,
} from "./ydc-intelligence-connector.js";
import type { HttpFetch } from "./http-pull-connector.js";

function mockFetch(body: unknown, ok = true, status = 200): HttpFetch {
  return async () => ({ ok, status, json: async () => body });
}

function baseConfig(overrides: Partial<YDCIntelligenceConfig> = {}): YDCIntelligenceConfig {
  return {
    sourceId: "ydc-intelligence",
    apiKey: "test-key",
    mode: "search",
    query: "PT Example fraud",
    country: "ID",
    initialCreditsUsd: 100,
    ...overrides,
  };
}

describe("YDCIntelligenceConnector", () => {
  it("normalizes search web results and charges credits (happy path)", async () => {
    const tracker = new InMemoryYDCCreditTracker({ initialCreditsUsd: 100 });
    const connector = new YDCIntelligenceConnector(
      mockFetch({
        results: {
          web: [{ url: "https://example.test/a", title: "Hit A" }],
          news: [],
        },
      }),
      baseConfig(),
      tracker,
    );

    const records = await connector.fetch();
    assert.equal(records.length, 1);
    assert.equal(records[0]?.recordId, "https://example.test/a");
    assert.equal(records[0]?.payload.__ydc_section, "web");
    assert.ok(tracker.snapshot().spentUsd > 0);
  });

  it("throws when apiKey is missing (error case)", () => {
    assert.throws(
      () => new YDCIntelligenceConnector(mockFetch({}), baseConfig({ apiKey: "  " })),
      /apiKey/,
    );
  });

  it("throws on non-2xx upstream response (error case)", async () => {
    const connector = new YDCIntelligenceConnector(
      mockFetch({}, false, 401),
      baseConfig(),
    );
    await assert.rejects(() => connector.fetch(), /-> 401/);
  });
});
