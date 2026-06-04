import type pg from "pg";
import type { PostgresClient } from "./postgres-client.js";

/**
 * Runs SQL in a transaction with `app.tenant_id` set for RLS-scoped tables.
 * Uses parameterized set_config (SET LOCAL does not accept bind parameters).
 */
export async function withTenantSession<T>(
  pg: PostgresClient,
  tenantId: string,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  return pg.withClient(async (client) => {
    await client.query("BEGIN");
    try {
      await client.query(`SELECT set_config($1, $2, true)`, [
        "app.tenant_id",
        tenantId,
      ]);
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}
