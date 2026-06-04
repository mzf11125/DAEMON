import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { entityId, ontologyId } from "@daemon/platform-types";
import { runMigrations } from "@daemon/data-platform/migrations";
import { PostgresEntityJournal } from "@daemon/data-platform/operational-store/entity-journal";
import { PostgresClient } from "@daemon/data-platform/operational-store";
import { withTenantSession } from "@daemon/data-platform/operational-store/tenant-session";
import { createOntologyStoreFromEnv } from "../../ontology/store/create-ontology-store.js";
import { skipUnlessPostgresAppReady } from "../helpers/postgres-integration.js";
import { POSTGRES_MIGRATE_URL } from "../helpers/postgres-urls.js";

describe("integration ontology RLS", () => {
  it("tenant session isolates entity snapshots", async (t) => {
    const url = await skipUnlessPostgresAppReady(t);
    if (!url) return;
    const env = { DAEMON_POSTGRES_URL: url };
    await runMigrations({ DAEMON_POSTGRES_URL: POSTGRES_MIGRATE_URL });

    const scopeA = { tenantId: "inst-alpha", domainId: "foundation" };
    const scopeB = { tenantId: "ent-beta", domainId: "foundation" };
    const ont = ontologyId("foundation");
    const id = entityId(`rls-${Date.now()}`);

    const store = await createOntologyStoreFromEnv(env);
    store.register({
      scope: scopeA,
      ontologyId: ont,
      entityId: id,
      entityType: "Case",
      properties: { title: "tenant-a", status: "open" },
    });
    if ("pendingWrites" in store && typeof store.pendingWrites === "function") {
      await (store as { pendingWrites: () => Promise<void> }).pendingWrites();
    }

    const pg = new PostgresClient({ connectionString: url });
    try {
      const visibleA = await withTenantSession(pg, "inst-alpha", async (client) => {
        const res = await client.query(
          `SELECT entity_id FROM daemon_entity_snapshots
           WHERE ontology_id = $1 AND entity_id = $2`,
          [String(ont), String(id)],
        );
        return res.rows.length;
      });
      assert.equal(visibleA, 1);

      const visibleB = await withTenantSession(pg, "ent-beta", async (client) => {
        const res = await client.query(
          `SELECT entity_id FROM daemon_entity_snapshots
           WHERE ontology_id = $1 AND entity_id = $2`,
          [String(ont), String(id)],
        );
        return res.rows.length;
      });
      assert.equal(visibleB, 0);
    } finally {
      await pg.close();
    }

    const journal = PostgresEntityJournal.fromEnv(env)!;
    await journal.close();
  });
});
