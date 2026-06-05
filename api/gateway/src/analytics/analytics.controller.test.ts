import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { globalRegistry } from "@daemon/ontology";
import { ontologyId, entityId } from "@daemon/platform-types";
import { AnalyticsController } from "./analytics.controller.js";
import { AnalyticsService } from "./analytics.service.js";
import { getDaemonRuntime } from "../platform/daemon-runtime.js";

describe("AnalyticsController", () => {
  it("search and dashboard endpoints return analytics payloads", async () => {
    const ont = ontologyId(`gw-analytics-${Date.now()}`);
    globalRegistry.register(ont, { status: "active", tag: "alpha" }, entityId("ga-1"));
    const ctx = { tenantId: "default", domainId: "foundation" };
    const controller = new AnalyticsController(
      new AnalyticsService(getDaemonRuntime()),
    );
    const report = await controller.searchReport(ctx, "alpha", ont, undefined, undefined, undefined, "GW");
    assert.equal(report.rowCount, 1);
    assert.equal(report.title, "GW");
    const dash = controller.dashboard(ctx, ont, "status");
    assert.equal(
      (dash.widgets.find((w) => w.id === "entity-count")?.data as { total: number }).total,
      1,
    );
    const entities = await controller.searchEntities(ctx, "alpha", ont);
    assert.equal(entities.length, 1);
  });
});
