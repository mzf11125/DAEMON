import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PostgresClient } from "../operational-store/postgres-client.js";

const migrationsDir = dirname(fileURLToPath(import.meta.url));

function listMigrationFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter((name) => /^\d+_.+\.sql$/i.test(name))
    .sort();
}

export async function runMigrations(
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const url = env.DAEMON_POSTGRES_URL;
  if (!url) {
    throw new Error("DAEMON_POSTGRES_URL is required to run migrations");
  }
  const pg = new PostgresClient({ connectionString: url });
  try {
    for (const file of listMigrationFiles()) {
      const sql = readFileSync(join(migrationsDir, file), "utf8");
      await pg.query(sql);
    }
  } finally {
    await pg.close();
  }
}

async function main(): Promise<void> {
  await runMigrations();
  console.log("migrations applied");
}

const invoked = process.argv[1]?.includes("run-migrations");
if (invoked) {
  main().catch((err: NodeJS.ErrnoException) => {
    if (err.code === "ECONNREFUSED") {
      console.error(
        "Cannot connect to Postgres. Start the stack with `pnpm run dev:up` or fix DAEMON_POSTGRES_URL.",
      );
    } else {
      console.error(err);
    }
    process.exit(1);
  });
}
