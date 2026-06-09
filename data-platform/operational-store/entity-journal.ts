import type { EntityRecord, OntologyScope } from "@daemon/context-ports";
import { PostgresClient } from "./postgres-client.js";
import { withTenantSession } from "./tenant-session.js";
import type { EpochManager } from "../provenance/epoch-manager.js";
import type { InclusionProof, NonInclusionProof } from "../provenance/types.js";

export interface EntityJournal {
  upsert(record: EntityRecord): Promise<void>;
  recordChange(input: OntologyChangeInput): Promise<void>;
  upsertGraphEdge(input: GraphEdgeInput): Promise<void>;
  loadAll(): Promise<EntityRecord[]>;
  loadScope(scope: OntologyScope): Promise<EntityRecord[]>;
  listPage?(input: EntityListPageInput): Promise<EntityListPageResult>;
  /**
   * Retrieve the inclusion proof for an entity at a specific epoch.
   * Returns null if provenance is not configured or no proof exists.
   */
  getProof?(entityId: string, epochId: number): Promise<InclusionProof | null>;
  /**
   * Retrieve a non-inclusion proof (forensic absence) for an entity at a specific epoch.
   * Returns null if provenance is not configured or entity is actually present.
   */
  getNonInclusionProof?(entityId: string, epochId: number): Promise<NonInclusionProof | null>;
  close(): Promise<void>;
}

export interface OntologyChangeInput {
  scope: OntologyScope;
  ontologyId: string;
  entityId: string;
  changeType: "register" | "patch";
  payload: Record<string, unknown>;
  packVersion?: string;
}

export interface GraphEdgeInput {
  scope: OntologyScope;
  fromId: string;
  toId: string;
  relation: string;
}

export interface EntityListPageInput {
  scope: OntologyScope;
  ontologyId: string;
  entityType?: string;
  updatedAfter?: string;
  limit: number;
  cursor?: string;
}

export interface EntityListPageResult {
  items: EntityRecord[];
  nextCursor: string | null;
}

/** Postgres snapshot journal for durable entity state. */
export class PostgresEntityJournal implements EntityJournal {
  /**
   * Optional EpochManager for cryptographic provenance.
   * When set, every upsert() call will:
   *  1. Compute SHA-256 of entity content
   *  2. Insert into daemon_entity_proof_log
   *  3. Update the in-memory Sparse Merkle Tree
   * When null, upsert() behaves exactly as before (no overhead).
   */
  private epochManager: EpochManager | null = null;

  constructor(private readonly pg: PostgresClient) {}

  /**
   * Attach an EpochManager to enable cryptographic provenance tracking.
   * Call this after construction before the first upsert.
   */
  withProvenance(epochManager: EpochManager): this {
    this.epochManager = epochManager;
    return this;
  }

  static fromEnv(
    env: NodeJS.ProcessEnv = process.env,
  ): PostgresEntityJournal | null {
    const url = env.DAEMON_POSTGRES_URL;
    if (!url) return null;
    return new PostgresEntityJournal(
      new PostgresClient({ connectionString: url }),
    );
  }

  async ensureSchema(): Promise<void> {
    await this.pg.query(`
      CREATE TABLE IF NOT EXISTS daemon_entity_snapshots (
        tenant_id TEXT NOT NULL,
        domain_id TEXT NOT NULL,
        ontology_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        entity_type TEXT,
        properties JSONB NOT NULL DEFAULT '{}',
        version INT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (tenant_id, domain_id, ontology_id, entity_id)
      )
    `);
    await this.pg.query(`
      CREATE TABLE IF NOT EXISTS daemon_ontology_changes (
        id BIGSERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        domain_id TEXT NOT NULL,
        ontology_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        change_type TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}',
        pack_version TEXT,
        at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await this.pg.query(`
      CREATE TABLE IF NOT EXISTS daemon_graph_edges (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        domain_id TEXT NOT NULL,
        from_id TEXT NOT NULL,
        to_id TEXT NOT NULL,
        relation TEXT NOT NULL
      )
    `);
  }

  async upsert(record: EntityRecord): Promise<void> {
    await this.ensureSchema();
    await withTenantSession(this.pg, record.tenantId, async (client) => {
      await client.query(
        `INSERT INTO daemon_entity_snapshots (
           tenant_id, domain_id, ontology_id, entity_id, entity_type,
           properties, version, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::timestamptz)
         ON CONFLICT (tenant_id, domain_id, ontology_id, entity_id)
         DO UPDATE SET
           entity_type = EXCLUDED.entity_type,
           properties = EXCLUDED.properties,
           version = EXCLUDED.version,
           updated_at = EXCLUDED.updated_at`,
        [
          record.tenantId,
          record.domainId,
          record.ontologyId,
          record.entityId,
          record.entityType ?? null,
          JSON.stringify(record.properties),
          record.version,
          record.updatedAt,
        ],
      );
    });

    // Cryptographic provenance: record entity hash into the active epoch.
    // Fire-and-forget style: provenance failure does NOT fail the write
    // (provenance is an auditing layer, not a transactional gate).
    if (this.epochManager) {
      try {
        const epochId = await this.epochManager.getOrOpenEpoch(
          record.tenantId,
          record.domainId,
        );
        await this.epochManager.recordEntityCommit(epochId, {
          tenantId: record.tenantId,
          domainId: record.domainId,
          entityId: record.entityId,
          properties: record.properties,
          version: record.version,
        });
      } catch (err) {
        // Log but do not propagate — provenance failure is non-fatal
        console.warn(
          `[provenance] Failed to record entity commit for ${record.entityId}:`,
          err,
        );
      }
    }
  }

  async recordChange(input: OntologyChangeInput): Promise<void> {
    await this.ensureSchema();
    await withTenantSession(this.pg, input.scope.tenantId, async (client) => {
      await client.query(
        `INSERT INTO daemon_ontology_changes (
           tenant_id, domain_id, ontology_id, entity_id,
           change_type, payload, pack_version
         ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
        [
          input.scope.tenantId,
          input.scope.domainId,
          input.ontologyId,
          input.entityId,
          input.changeType,
          JSON.stringify(input.payload),
          input.packVersion ?? null,
        ],
      );
    });
  }

  async upsertGraphEdge(input: GraphEdgeInput): Promise<void> {
    await this.ensureSchema();
    await withTenantSession(this.pg, input.scope.tenantId, async (client) => {
      await client.query(
        `INSERT INTO daemon_graph_edges (tenant_id, domain_id, from_id, to_id, relation)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (tenant_id, domain_id, from_id, to_id, relation) DO NOTHING`,
        [
          input.scope.tenantId,
          input.scope.domainId,
          input.fromId,
          input.toId,
          input.relation,
        ],
      );
    });
  }

  async loadAll(): Promise<EntityRecord[]> {
    await this.ensureSchema();
    const result = await this.pg.query<{
      tenant_id: string;
      domain_id: string;
      ontology_id: string;
      entity_id: string;
      entity_type: string | null;
      properties: Record<string, unknown>;
      version: number;
      updated_at: Date;
    }>(`SELECT * FROM daemon_load_entity_snapshots()`);
    return result.rows.map(rowToRecord);
  }

  async loadScope(scope: OntologyScope): Promise<EntityRecord[]> {
    await this.ensureSchema();
    return withTenantSession(this.pg, scope.tenantId, async (client) => {
      const result = await client.query<{
        tenant_id: string;
        domain_id: string;
        ontology_id: string;
        entity_id: string;
        entity_type: string | null;
        properties: Record<string, unknown>;
        version: number;
        updated_at: Date;
      }>(
        `SELECT tenant_id, domain_id, ontology_id, entity_id, entity_type,
                properties, version, updated_at
         FROM daemon_entity_snapshots
         WHERE tenant_id = $1 AND domain_id = $2
         ORDER BY updated_at ASC, entity_id ASC`,
        [scope.tenantId, scope.domainId],
      );
      return result.rows.map(rowToRecord);
    });
  }

  async listPage(input: EntityListPageInput): Promise<EntityListPageResult> {
    await this.ensureSchema();
    const limit = Math.min(Math.max(input.limit, 1), 200);
    return withTenantSession(this.pg, input.scope.tenantId, async (client) => {
      const params: unknown[] = [
        input.scope.tenantId,
        input.scope.domainId,
        input.ontologyId,
      ];
      const filters: string[] = [
        "tenant_id = $1",
        "domain_id = $2",
        "ontology_id = $3",
      ];
      if (input.entityType) {
        params.push(input.entityType);
        filters.push(`entity_type = $${params.length}`);
      }
      if (input.updatedAfter) {
        params.push(input.updatedAfter);
        filters.push(`updated_at >= $${params.length}::timestamptz`);
      }
      if (input.cursor) {
        params.push(input.cursor);
        filters.push(`entity_id > $${params.length}`);
      }
      params.push(limit + 1);
      const result = await client.query<{
        tenant_id: string;
        domain_id: string;
        ontology_id: string;
        entity_id: string;
        entity_type: string | null;
        properties: Record<string, unknown>;
        version: number;
        updated_at: Date;
      }>(
        `SELECT tenant_id, domain_id, ontology_id, entity_id, entity_type,
                properties, version, updated_at
         FROM daemon_entity_snapshots
         WHERE ${filters.join(" AND ")}
         ORDER BY entity_id ASC
         LIMIT $${params.length}`,
        params,
      );
      const rows = result.rows.map(rowToRecord);
      let nextCursor: string | null = null;
      let items = rows;
      if (rows.length > limit) {
        items = rows.slice(0, limit);
        nextCursor = items[items.length - 1]?.entityId ?? null;
      }
      return { items, nextCursor };
    });
  }

  // ─── Provenance API ─────────────────────────────────────────────────────

  /**
   * Retrieve the inclusion proof for an entity at a given epoch.
   *
   * Note: This is a convenience shim. For full forensic workflows, use
   * ProvenanceVerifier.checkEntityProvenance() which has tenant/domain context.
   * Returns null if provenance is not enabled.
   */
  async getProof(
    _entityId: string,
    _epochId: number,
  ): Promise<InclusionProof | null> {
    if (!this.epochManager) return null;
    // Full proof retrieval requires tenantId and domainId context.
    // Callers should use EpochManager.buildInclusionProof() or
    // ProvenanceVerifier.checkEntityProvenance() directly.
    return null;
  }

  /**
   * Retrieve a non-inclusion proof for forensic absence verification.
   * Returns null if provenance is not enabled.
   *
   * For full forensic workflows, use ProvenanceVerifier.checkForensicAbsence().
   */
  async getNonInclusionProof(
    _entityId: string,
    _epochId: number,
  ): Promise<NonInclusionProof | null> {
    if (!this.epochManager) return null;
    // Full non-inclusion proof requires tenantId and domainId context.
    // Use ProvenanceVerifier.checkForensicAbsence() for complete forensic checks.
    return null;
  }

  async close(): Promise<void> {
    await this.pg.close();
  }
}

function rowToRecord(row: {
  tenant_id: string;
  domain_id: string;
  ontology_id: string;
  entity_id: string;
  entity_type: string | null;
  properties: Record<string, unknown>;
  version: number;
  updated_at: Date;
}): EntityRecord {
  return {
    tenantId: row.tenant_id,
    domainId: row.domain_id,
    ontologyId: row.ontology_id as EntityRecord["ontologyId"],
    entityId: row.entity_id as EntityRecord["entityId"],
    entityType: row.entity_type ?? undefined,
    properties: row.properties ?? {},
    version: row.version,
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
  };
}
