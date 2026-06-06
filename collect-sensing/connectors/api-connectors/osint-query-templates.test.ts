/** Spec: collect-sensing/connectors/api-connectors/osint-query-templates.test.ts | BigPlan Phase 1.2 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  OSINT_QUERY_TEMPLATES,
  buildOsintQuery,
} from "./osint-query-templates.js";

describe("OSINT_QUERY_TEMPLATES", () => {
  it("builds entity search with aliases (happy path)", () => {
    const q = OSINT_QUERY_TEMPLATES.entitySearch("John Doe", ["JD", "Jonny"]);
    assert.ok(q.includes('"John Doe"'));
    assert.ok(q.includes('OR "JD"'));
    assert.ok(q.includes("-site:facebook.com"));
  });

  it("buildOsintQuery routes corporate registry template (error case: empty name)", () => {
    const q = buildOsintQuery("corporateRegistry", "PT Daemon");
    assert.ok(q.includes("ahu.go.id"));
    const empty = buildOsintQuery("entitySearch", "", []);
    assert.ok(empty.includes('""'));
  });
});
