/** Postgres-backed audit log for integration and e2e paths. */
import { PostgresClient } from "@daemon/data-platform/operational-store";
import { withTenantSession } from "@daemon/data-platform/operational-store/tenant-session";
import type { AuditEntry } from "./audit-log.js";

export type PostgresAuditAppend = Omit<AuditEntry, "id" | "at">;

export class PostgresAuditLog {
  constructor(private readonly pg: PostgresClient) {}

  static fromEnv(env: NodeJS.ProcessEnv = process.env): PostgresAuditLog | null {
    const url = env.DAEMON_POSTGRES_URL;
    if (!url) return null;
    return new PostgresAuditLog(new PostgresClient({ connectionString: url }));
  }

  async ensureSchema(): Promise<void> {
    // Schema is owned by migrations (`data-platform/migrations/`); avoid ALTER here for RLS app roles.
    await this.pg.query(`
      CREATE TABLE IF NOT EXISTS daemon_audit (
        id SERIAL PRIMARY KEY,
        at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        action TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        resource TEXT NOT NULL,
        outcome TEXT NOT NULL CHECK (outcome IN ('allow', 'deny')),
        tenant_id TEXT,
        domain_id TEXT,
        metadata JSONB
      )
    `);
  }

  async append(entry: PostgresAuditAppend): Promise<AuditEntry> {
    await this.ensureSchema();
    const metadataJson =
      entry.metadata !== undefined ? JSON.stringify(entry.metadata) : null;
    const tenantId = entry.tenantId ?? "default";
    const row = await withTenantSession(this.pg, tenantId, async (client) => {
      const result = await client.query<{ id: number; at: Date }>(
        `INSERT INTO daemon_audit (action, subject_id, resource, outcome, tenant_id, domain_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         RETURNING id, at`,
        [
          entry.action,
          entry.subjectId,
          entry.resource,
          entry.outcome,
          entry.tenantId ?? null,
          entry.domainId ?? null,
          metadataJson,
        ],
      );
      return result.rows[0];
    });
    if (!row) throw new Error("audit insert returned no row");
    return {
      id: `audit-${row.id}`,
      at: row.at.toISOString(),
      action: entry.action,
      subjectId: entry.subjectId,
      resource: entry.resource,
      outcome: entry.outcome,
      tenantId: entry.tenantId,
      domainId: entry.domainId,
      metadata: entry.metadata,
    };
  }

  async list(limit = 100, tenantId = "default"): Promise<AuditEntry[]> {
    await this.ensureSchema();
    return withTenantSession(this.pg, tenantId, async (client) => {
      const result = await client.query<{
        id: number;
        at: Date;
        action: string;
        subject_id: string;
        resource: string;
        outcome: "allow" | "deny";
        tenant_id: string | null;
        domain_id: string | null;
        metadata: Record<string, unknown> | null;
      }>(
        `SELECT id, at, action, subject_id, resource, outcome, tenant_id, domain_id, metadata
         FROM daemon_audit ORDER BY id DESC LIMIT $1`,
        [limit],
      );
      return result.rows.map((row) => ({
        id: `audit-${row.id}`,
        at: row.at.toISOString(),
        action: row.action,
        subjectId: row.subject_id,
        resource: row.resource,
        outcome: row.outcome,
        tenantId: row.tenant_id ?? undefined,
        domainId: row.domain_id ?? undefined,
        metadata: row.metadata ?? undefined,
      }));
    });
  }

  async close(): Promise<void> {
    await this.pg.close();
  }
}
