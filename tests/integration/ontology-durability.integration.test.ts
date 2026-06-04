import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { entityId, ontologyId } from "@daemon/platform-types";
import { runMigrations } from "@daemon/data-platform/migrations";
import { PostgresEntityJournal } from "@daemon/data-platform/operational-store/entity-journal";
import { PostgresClient } from "@daemon/data-platform/operational-store";
import { OntologyRegistry } from "../../ontology/registry/ontology-registry.js";
import { createOntologyStoreFromEnv } from "../../ontology/store/create-ontology-store.js";
import { replayInto } from "../../ontology/store/replay-into.js";
import { skipUnlessPostgresReady } from "../helpers/postgres-integration.js";
import { POSTGRES_MIGRATE_URL } from "../helpers/postgres-urls.js";

describe("integration ontology durability", () => {
  it("survives replay into empty registry after journal write", async (t) => {
    const url = await skipUnlessPostgresReady(t);
    if (!url) return;
    const env = { DAEMON_POSTGRES_URL: url };
    await runMigrations({ DAEMON_POSTGRES_URL: POSTGRES_MIGRATE_URL });

    const scopeA = { tenantId: "inst-alpha", domainId: "foundation" };
    const scopeB = { tenantId: "ent-beta", domainId: "foundation" };
    const ont = ontologyId("foundation");
    const id = entityId(`dur-${Date.now()}`);

    const store = await createOntologyStoreFromEnv(env);
    store.register({
      scope: scopeA,
      ontologyId: ont,
      entityId: id,
      entityType: "Case",
      properties: { title: "persisted", status: "open" },
    });
    if ("pendingWrites" in store && typeof store.pendingWrites === "function") {
      await (store as { pendingWrites: () => Promise<void> }).pendingWrites();
    }

    const journal = PostgresEntityJournal.fromEnv(env)!;

    const fresh = new OntologyRegistry();
    const count = await replayInto(fresh, journal);
    assert.ok(count >= 1);

    const got = fresh.get(scopeA, ont, id);
    assert.ok(got);
    assert.equal(got?.properties.title, "persisted");

    assert.equal(fresh.get(scopeB, ont, id), undefined);

    await journal.close();
  });

  it("migration creates durability tables", async (t) => {
    const url = await skipUnlessPostgresReady(t);
    if (!url) return;
    await runMigrations({ DAEMON_POSTGRES_URL: POSTGRES_MIGRATE_URL });
    const pg = new PostgresClient({ connectionString: url });
    try {
      const tables = await pg.query<{ tablename: string }>(
        `SELECT tablename FROM pg_tables
         WHERE schemaname = 'public'
           AND tablename IN (
             'daemon_audit',
             'daemon_entity_snapshots',
             'daemon_graph_edges',
             'daemon_ontology_changes'
           )
         ORDER BY tablename`,
      );
      const names = tables.rows.map((r) => r.tablename);
      assert.deepEqual(names, [
        "daemon_audit",
        "daemon_entity_snapshots",
        "daemon_graph_edges",
        "daemon_ontology_changes",
      ]);
    } finally {
      await pg.close();
    }
  });
});
