import type { DataSourcePlugin } from "../registry/data-source-plugin.js";
import type {
  DataSourceQuery,
  QueryResult,
  AggregationResult,
  EntitySchema,
  DataSourceHealth,
  DataSourceMetrics,
  WriteCommand,
  WriteResult,
  Entity,
  Filter,
} from "../registry/types.js";

export interface PostgresBackendConfig {
  /** Database connection pool or query function. */
  pool: {
    query(
      sql: string,
      params?: unknown[],
    ): Promise<{ rows: Record<string, unknown>[] }>;
  };
  /** Table name prefix (default: "ontology_objects"). */
  tablePrefix?: string;
  /** Entity type to table mapping. If not set, uses tablePrefix + entityType lowercase. */
  tableMap?: Record<string, string>;
  /** Schema name (default: "public"). */
  schema?: string;
  /** Priority (default: 1 — preferred backend). */
  priority?: number;
}

/**
 * PostgreSQL data source backend.
 *
 * Wraps a pg-compatible connection pool and maps entity types
 * to tables. Supports full CRUD, filters, sorting, pagination.
 */
export class PostgresBackend implements DataSourcePlugin {
  readonly id = "pg-entities";
  readonly name = "PostgreSQL Entity Store";
  readonly backend = "postgres" as const;
  readonly priority: number;
  readonly entityTypes: string[];

  private pool: PostgresBackendConfig["pool"];
  private tablePrefix: string;
  private tableMap: Record<string, string>;
  private dbSchema: string;
  private queryCount = 0;
  private errorCount = 0;
  private lastQueryAt?: string;

  constructor(config: PostgresBackendConfig) {
    this.pool = config.pool;
    this.tablePrefix = config.tablePrefix ?? "ontology_objects";
    this.tableMap = config.tableMap ?? {};
    this.dbSchema = config.schema ?? "public";
    this.priority = config.priority ?? 1;
    this.entityTypes =
      Object.keys(this.tableMap).length > 0
        ? Object.keys(this.tableMap)
        : [
            "Organization",
            "Site",
            "Asset",
            "Party",
            "WorkOrder",
            "Observation",
            "Signal",
            "Case",
            "Decision",
          ];
  }

  private tableName(entityType: string): string {
    return this.tableMap[entityType] ?? `${this.tablePrefix}`;
  }

  private qualifiedTable(entityType: string): string {
    const table = this.tableName(entityType);
    return this.dbSchema === "public" ? table : `${this.dbSchema}.${table}`;
  }

  async query(request: DataSourceQuery): Promise<QueryResult> {
    this.queryCount++;
    this.lastQueryAt = new Date().toISOString();

    const table = this.qualifiedTable(request.entityType);
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    // Entity type filter (when using shared table)
    if (this.tableName(request.entityType) === this.tablePrefix) {
      conditions.push(`entity_type = $${paramIdx++}`);
      params.push(request.entityType);
    }

    // Filters
    for (const filter of request.filters ?? []) {
      const clause = this.buildFilterClause(filter, paramIdx);
      conditions.push(clause.sql);
      params.push(...clause.params);
      paramIdx += clause.params.length;
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count query
    const countSql = `SELECT COUNT(*) as total FROM ${table} ${where}`;
    const countResult = await this.pool.query(countSql, params);
    const total = Number(countResult.rows[0]?.["total"] ?? 0);

    // Main query
    const fields = request.fields?.length
      ? request.fields.map((f: string) => `"${f}"`).join(", ")
      : "*";
    const sort = request.sort?.length
      ? `ORDER BY ${request.sort.map((s: { field: string; direction: string }) => `"${s.field}" ${s.direction}`).join(", ")}`
      : "ORDER BY created_at DESC NULLS LAST";
    const limit = request.limit ?? 100;
    const offset = request.offset ?? 0;

    const sql = `SELECT ${fields} FROM ${table} ${where} ${sort} LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const result = await this.pool.query(sql, params);
    const entities: Entity[] = result.rows.map((row) =>
      this.rowToEntity(row, request.entityType),
    );

    return {
      entities,
      total,
      executionTime: 0,
      backend: this.id,
      cached: false,
    };
  }

  async aggregate(request: DataSourceQuery): Promise<AggregationResult> {
    const table = this.qualifiedTable(request.entityType);
    const agg = request.aggregation;
    if (!agg) {
      return { groups: [], total: 0, executionTime: 0, backend: this.id };
    }

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    for (const filter of request.filters ?? []) {
      const clause = this.buildFilterClause(filter, paramIdx);
      conditions.push(clause.sql);
      params.push(...clause.params);
      paramIdx += clause.params.length;
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    let sql: string;
    if (agg.groupBy?.length) {
      const groupFields = agg.groupBy.map((g: string) => `"${g}"`).join(", ");
      const aggExpr = this.buildAggExpr(agg.type, agg.field);
      sql = `SELECT ${groupFields}, ${aggExpr} as agg_value FROM ${table} ${where} GROUP BY ${groupFields}`;
    } else {
      const aggExpr = this.buildAggExpr(agg.type, agg.field);
      sql = `SELECT ${aggExpr} as agg_value FROM ${table} ${where}`;
    }

    const result = await this.pool.query(sql, params);

    const groups = result.rows.map((row) => {
      const key: Record<string, unknown> = {};
      if (agg.groupBy?.length) {
        for (const g of agg.groupBy) {
          key[g] = row[g];
        }
      }
      return { key, value: Number(row["agg_value"] ?? 0) };
    });

    return {
      groups,
      total: groups.length,
      executionTime: 0,
      backend: this.id,
    };
  }

  async schema(entityType: string): Promise<EntitySchema> {
    // Return a basic schema — in production this would introspect the DB
    return {
      entityType,
      fields: [
        { name: "id", type: "string", required: true },
        { name: "properties", type: "object", required: true },
        { name: "created_at", type: "timestamp", required: false },
        { name: "updated_at", type: "timestamp", required: false },
      ],
      primaryKey: "id",
    };
  }

  async health(): Promise<DataSourceHealth> {
    const start = performance.now();
    try {
      await this.pool.query("SELECT 1");
      return { ok: true, latencyMs: performance.now() - start };
    } catch (err) {
      return {
        ok: false,
        latencyMs: performance.now() - start,
        message: String(err),
      };
    }
  }

  async metrics(): Promise<DataSourceMetrics> {
    return {
      queryCount: this.queryCount,
      avgLatencyMs: 0,
      errorRate: this.queryCount > 0 ? this.errorCount / this.queryCount : 0,
      cacheHitRate: 0,
      lastQueryAt: this.lastQueryAt,
    };
  }

  async write(command: WriteCommand): Promise<WriteResult> {
    const table = this.qualifiedTable(command.entityType);
    const entityId = command.entityId ?? crypto.randomUUID();

    switch (command.operation) {
      case "upsert": {
        const sql = `INSERT INTO ${table} (id, entity_type, properties, updated_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (id) DO UPDATE SET properties = $3, updated_at = NOW()`;
        await this.pool.query(sql, [
          entityId,
          command.entityType,
          JSON.stringify(command.properties),
        ]);
        return { entityId, operation: "upsert", success: true };
      }
      case "patch": {
        const sql = `UPDATE ${table} SET properties = properties || $3, updated_at = NOW()
          WHERE id = $1 AND entity_type = $2`;
        const result = await this.pool.query(sql, [
          entityId,
          command.entityType,
          JSON.stringify(command.properties),
        ]);
        if (result.rows.length === 0) {
          return {
            entityId,
            operation: "patch",
            success: false,
            error: "Entity not found",
          };
        }
        return { entityId, operation: "patch", success: true };
      }
      case "delete": {
        await this.pool.query(
          `DELETE FROM ${table} WHERE id = $1 AND entity_type = $2`,
          [entityId, command.entityType],
        );
        return { entityId, operation: "delete", success: true };
      }
    }
  }

  async writeBatch(commands: WriteCommand[]): Promise<WriteResult[]> {
    return Promise.all(commands.map((cmd) => this.write(cmd)));
  }

  async initialize(): Promise<void> {
    console.log(
      `[data-plane] PostgresBackend initialized (schema: ${this.schema}, prefix: ${this.tablePrefix})`,
    );
  }

  async destroy(): Promise<void> {
    // Pool lifecycle is managed externally
  }

  private buildFilterClause(
    filter: Filter,
    startIdx: number,
  ): { sql: string; params: unknown[] } {
    const field = `"${filter.field}"`;
    switch (filter.op) {
      case "eq":
        return { sql: `${field} = $${startIdx}`, params: [filter.value] };
      case "neq":
        return { sql: `${field} != $${startIdx}`, params: [filter.value] };
      case "gt":
        return { sql: `${field} > $${startIdx}`, params: [filter.value] };
      case "gte":
        return { sql: `${field} >= $${startIdx}`, params: [filter.value] };
      case "lt":
        return { sql: `${field} < $${startIdx}`, params: [filter.value] };
      case "lte":
        return { sql: `${field} <= $${startIdx}`, params: [filter.value] };
      case "in": {
        const arr = Array.isArray(filter.value) ? filter.value : [filter.value];
        const placeholders = arr.map((_, i) => `$${startIdx + i}`).join(", ");
        return { sql: `${field} IN (${placeholders})`, params: arr };
      }
      case "contains":
        return {
          sql: `${field}::text LIKE $${startIdx}`,
          params: [`%${filter.value}%`],
        };
      case "startsWith":
        return {
          sql: `${field}::text LIKE $${startIdx}`,
          params: [`${filter.value}%`],
        };
      case "endsWith":
        return {
          sql: `${field}::text LIKE $${startIdx}`,
          params: [`%${filter.value}`],
        };
      case "isNull":
        return { sql: `${field} IS NULL`, params: [] };
      case "isNotNull":
        return { sql: `${field} IS NOT NULL`, params: [] };
      default:
        return { sql: `${field} = $${startIdx}`, params: [filter.value] };
    }
  }

  private buildAggExpr(type: string, field?: string): string {
    switch (type) {
      case "count":
        return "COUNT(*)";
      case "sum":
        return `SUM("${field}")`;
      case "avg":
        return `AVG("${field}")`;
      case "min":
        return `MIN("${field}")`;
      case "max":
        return `MAX("${field}")`;
      default:
        return "COUNT(*)";
    }
  }

  private rowToEntity(
    row: Record<string, unknown>,
    entityType: string,
  ): Entity {
    const id = String(
      row["id"] ?? row["case_id"] ?? row["signal_id"] ?? crypto.randomUUID(),
    );
    const properties =
      typeof row["properties"] === "string"
        ? JSON.parse(row["properties"] as string)
        : ((row["properties"] as Record<string, unknown>) ?? {});

    // Flatten common columns into properties
    for (const [key, val] of Object.entries(row)) {
      if (key !== "id" && key !== "properties" && key !== "entity_type") {
        properties[key] = val;
      }
    }

    return {
      id,
      entityType,
      properties,
      version: row["version"] as number | undefined,
      updatedAt: row["updated_at"] as string | undefined,
    };
  }
}
