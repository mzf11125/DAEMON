import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../packages/ontology-engine/src/db/migrations'
);

export interface DbOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export async function tenantMigrate(opts: DbOptions): Promise<void> {
  console.log(`Connecting to ${opts.host}:${opts.port}/${opts.database}...`);

  const pool = new Pool({
    host: opts.host,
    port: opts.port,
    user: opts.user,
    password: opts.password,
    database: opts.database,
    max: 2,
  });

  try {
    const files = await readdir(MIGRATIONS_DIR);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    console.log(`Found ${sqlFiles.length} migration(s):`);

    for (const file of sqlFiles) {
      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');
      console.log(`  Applying ${file}...`);
      try {
        await pool.query(sql);
        console.log(`  ✓ ${file}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('already exists') || msg.includes('duplicate')) {
          console.log(`  ~ ${file} (already applied, skipping)`);
        } else {
          throw new Error(`Migration ${file} failed: ${msg}`);
        }
      }
    }

    console.log('Migrations complete.');
  } finally {
    await pool.end();
  }
}
