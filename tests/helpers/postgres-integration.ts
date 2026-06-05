import type { TestContext } from "node:test";
import { PostgresClient } from "@daemon/data-platform/operational-store";
import { POSTGRES_APP_URL } from "./postgres-urls.js";

/** True when the URL uses the RLS-enforced application role (not compose superuser). */
function isRlsAppUrl(url: string): boolean {
  return /daemon_app/i.test(url);
}

/** Ping Postgres; returns the URL when accepting connections, otherwise undefined. */
export async function resolvePostgresUrlForTests(
  url: string | undefined,
): Promise<string | undefined> {
  if (!url) return undefined;
  const pg = new PostgresClient({ connectionString: url });
  try {
    const ping = await pg.ping();
    return ping.ok ? url : undefined;
  } catch {
    return undefined;
  } finally {
    await pg.close();
  }
}

/**
 * Skip the current test when Postgres is not configured or not accepting connections.
 * Returns the connection URL when ready.
 */
export async function skipUnlessPostgresReady(
  t: Pick<TestContext, "skip">,
): Promise<string | undefined> {
  const url = process.env.DAEMON_POSTGRES_URL;
  if (!url) {
    t.skip("DAEMON_POSTGRES_URL not set — start compose.dev.yaml");
    return undefined;
  }
  const ready = await resolvePostgresUrlForTests(url);
  if (!ready) {
    t.skip(
      "Postgres not reachable — run `pnpm run dev:up` or unset DAEMON_POSTGRES_URL",
    );
    return undefined;
  }
  return ready;
}

/**
 * Skip when Postgres is unavailable or the RLS application role cannot connect.
 * Prefer `daemon_app` over the compose superuser (`daemon`), which bypasses RLS.
 */
export async function skipUnlessPostgresAppReady(
  t: Pick<TestContext, "skip">,
): Promise<string | undefined> {
  const envUrl = process.env.DAEMON_POSTGRES_URL;
  const appUrl =
    envUrl && isRlsAppUrl(envUrl) ? envUrl : POSTGRES_APP_URL;

  const ready = await resolvePostgresUrlForTests(appUrl);
  if (!ready) {
    if (!envUrl) {
      t.skip("Postgres not reachable — start compose.dev.yaml");
      return undefined;
    }
    t.skip(
      "RLS app role not reachable — run `pnpm run dev:up`, `pnpm run db:migrate`, and use daemon_app for DAEMON_POSTGRES_URL",
    );
    return undefined;
  }
  return ready;
}
