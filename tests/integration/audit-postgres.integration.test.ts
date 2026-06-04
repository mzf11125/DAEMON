import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PostgresAuditLog } from "../../security-governance/audit/postgres-audit-log.js";
import { skipUnlessPostgresReady } from "../helpers/postgres-integration.js";
import { POSTGRES_MIGRATE_URL } from "../helpers/postgres-urls.js";
import { runMigrations } from "@daemon/data-platform/migrations";

describe("integration postgres audit", () => {
  it("append and list audit rows", async (t) => {
    const url = await skipUnlessPostgresReady(t);
    if (!url) return;
    await runMigrations({ DAEMON_POSTGRES_URL: POSTGRES_MIGRATE_URL });
    const log = PostgresAuditLog.fromEnv({ DAEMON_POSTGRES_URL: url });
    assert.ok(log);
    try {
      const entry = await log!.append({
        action: "test",
        subjectId: "integration",
        resource: "audit:integration",
        outcome: "allow",
        tenantId: "inst-alpha",
        domainId: "foundation",
        metadata: { trace: ["step-a"], caseId: "c-1" },
      });
      assert.match(entry.id, /^audit-/);
      const rows = await log!.list(20, "inst-alpha");
      const hit = rows.find((r) => r.resource === "audit:integration");
      assert.ok(hit);
      assert.equal(hit?.tenantId, "inst-alpha");
      assert.equal(hit?.domainId, "foundation");
      assert.deepEqual(hit?.metadata, { trace: ["step-a"], caseId: "c-1" });
    } finally {
      await log!.close();
    }
  });
});
