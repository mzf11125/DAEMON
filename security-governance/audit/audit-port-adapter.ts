import type { AuditPort, AuditEvent } from "@daemon/context-ports";
import { AuditLog } from "./audit-log.js";
import type { PostgresAuditAppend } from "./postgres-audit-log.js";

type PostgresMirror = {
  append(entry: PostgresAuditAppend): Promise<unknown>;
};

/**
 * In-memory audit port with optional Postgres mirror for integration paths.
 */
export class AuditPortAdapter implements AuditPort {
  private readonly memory = new AuditLog();
  private readonly events: AuditEvent[] = [];
  private postgres: PostgresMirror | null | undefined;
  private postgresInit: Promise<PostgresMirror | null> | undefined;

  constructor(postgres?: PostgresMirror | null) {
    this.postgres = postgres;
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env): AuditPortAdapter {
    const adapter = new AuditPortAdapter();
    if (env.DAEMON_POSTGRES_URL) {
      adapter.postgresInit = import("./postgres-audit-log.js").then((mod) =>
        mod.PostgresAuditLog.fromEnv(env),
      );
    } else {
      adapter.postgres = null;
    }
    return adapter;
  }

  private mirrorPostgres(): void {
    if (this.postgres !== undefined || !this.postgresInit) return;
    void this.postgresInit
      .then((pg) => {
        this.postgres = pg;
      })
      .catch(() => {
        this.postgres = null;
      });
  }

  private toPostgresPayload(row: AuditEvent): PostgresAuditAppend {
    return {
      action: row.action,
      subjectId: row.subjectId,
      resource: row.resource,
      outcome: row.outcome,
      tenantId: row.tenantId,
      domainId: row.domainId,
      metadata: row.metadata,
    };
  }

  record(event: Omit<AuditEvent, "at"> & { at?: string }): void {
    const row: AuditEvent = {
      at: event.at ?? new Date().toISOString(),
      action: event.action,
      subjectId: event.subjectId,
      resource: event.resource,
      outcome: event.outcome,
      tenantId: event.tenantId,
      domainId: event.domainId,
      metadata: event.metadata,
    };
    this.events.push(row);
    this.memory.append({
      action: row.action,
      subjectId: row.subjectId,
      resource: row.resource,
      outcome: row.outcome,
    });
    this.mirrorPostgres();
    const pg = this.postgres;
    const payload = this.toPostgresPayload(row);
    if (pg) {
      void pg.append(payload).catch(() => undefined);
      return;
    }
    if (this.postgresInit) {
      void this.postgresInit
        .then((loaded) => {
          this.postgres = loaded;
          return loaded?.append(payload);
        })
        .catch(() => undefined);
    }
  }

  list(limit = 100): AuditEvent[] {
    return this.events.slice(-limit);
  }
}
