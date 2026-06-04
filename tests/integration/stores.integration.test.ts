import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PostgresClient } from "@daemon/data-platform/operational-store";
import { runMigrations } from "@daemon/data-platform/migrations";
import { RedisCacheClient } from "@daemon/data-platform/cache";
import { skipUnlessPostgresReady } from "../helpers/postgres-integration.js";
import { POSTGRES_MIGRATE_URL } from "../helpers/postgres-urls.js";

describe("integration stores", () => {
  it("postgres round-trip", async (t) => {
    const url = await skipUnlessPostgresReady(t);
    if (!url) return;
    const env = { DAEMON_POSTGRES_URL: url };
    await runMigrations({ DAEMON_POSTGRES_URL: POSTGRES_MIGRATE_URL });
    const pg = new PostgresClient({ connectionString: url });
    try {
      const ping = await pg.ping();
      assert.equal(ping.ok, true);
      const tables = await pg.query<{ tablename: string }>(
        `SELECT tablename FROM pg_tables
         WHERE schemaname = 'public' AND tablename = 'daemon_entity_snapshots'`,
      );
      assert.equal(tables.rows.length, 1);
    } finally {
      await pg.close();
    }
  });

  it("redis round-trip", async (t) => {
    const url = process.env.DAEMON_REDIS_URL;
    if (!url) {
      t.skip("DAEMON_REDIS_URL not set — start compose.dev.yaml");
      return;
    }
    const redis = new RedisCacheClient({ url });
    try {
      assert.equal(await redis.ping(), "PONG");
    } finally {
      await redis.close();
    }
  });
});
