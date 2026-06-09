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

/**
 * In-memory data source for testing, prototyping, and as a fast cache layer.
 *
 * Stores entities in a Map. Supports all query operations including
 * filters, sorting, field projection, and aggregations.
 */
export class MemoryBackend implements DataSourcePlugin {
  readonly id: string;
  readonly name = "In-Memory Store";
  readonly backend = "memory" as const;
  readonly priority: number;

  private store = new Map<string, Map<string, Entity>>();
  private queryCount = 0;
  private errorCount = 0;
  private lastQueryAt?: string;

  private _entityTypes: string[];

  constructor(
    entityTypes: string[] = [],
    private options: { priority?: number; id?: string } = {},
  ) {
    this.id = options.id ?? "memory";
    this.priority = options.priority ?? 100;
    this._entityTypes = entityTypes;
  }

  get entityTypes(): string[] {
    return this._entityTypes;
  }

  /**
   * Seed the store with initial data (for testing).
   */
  seed(entityType: string, entities: Entity[]): void {
    if (!this.store.has(entityType)) {
      this.store.set(entityType, new Map());
    }
    const bucket = this.store.get(entityType)!;
    for (const entity of entities) {
      bucket.set(entity.id, { ...entity });
    }
    if (!this._entityTypes.includes(entityType)) {
      this._entityTypes.push(entityType);
    }
  }

  async query(request: DataSourceQuery): Promise<QueryResult> {
    this.queryCount++;
    this.lastQueryAt = new Date().toISOString();

    const bucket = this.store.get(request.entityType);
    let entities = bucket ? Array.from(bucket.values()) : [];

    // Apply filters
    if (request.filters?.length) {
      entities = entities.filter((e) =>
        this.matchesFilters(e, request.filters!),
      );
    }

    // Apply time range filter
    if (request.timeRange) {
      entities = entities.filter((e) => {
        const updatedAt = e.updatedAt ?? (e.properties["createdAt"] as string);
        if (!updatedAt) return false;
        return (
          updatedAt >= request.timeRange!.from &&
          updatedAt <= request.timeRange!.to
        );
      });
    }

    const total = entities.length;

    // Sort
    if (request.sort?.length) {
      for (const sort of [...request.sort].reverse()) {
        entities.sort((a, b) => {
          const av = a.properties[sort.field];
          const bv = b.properties[sort.field];
          const cmp = String(av ?? "").localeCompare(String(bv ?? ""));
          return sort.direction === "desc" ? -cmp : cmp;
        });
      }
    }

    // Pagination
    const offset = request.offset ?? 0;
    const limit = request.limit ?? 100;
    entities = entities.slice(offset, offset + limit);

    // Field projection
    if (request.fields?.length) {
      entities = entities.map((e) => ({
        ...e,
        properties: Object.fromEntries(
          request
            .fields!.map(
              (f: string) => [f, e.properties[f]] as [string, unknown],
            )
            .filter((entry) => entry[1] !== undefined),
        ),
      }));
    }

    return {
      entities,
      total,
      executionTime: 0,
      backend: this.id,
      cached: false,
    };
  }

  async aggregate(request: DataSourceQuery): Promise<AggregationResult> {
    const bucket = this.store.get(request.entityType);
    let entities = bucket ? Array.from(bucket.values()) : [];

    if (request.filters?.length) {
      entities = entities.filter((e) =>
        this.matchesFilters(e, request.filters!),
      );
    }

    const agg = request.aggregation;
    if (!agg) {
      return { groups: [], total: 0, executionTime: 0, backend: this.id };
    }

    // Group by
    const groups = new Map<
      string,
      { key: Record<string, unknown>; values: number[] }
    >();
    for (const entity of entities) {
      const keyObj: Record<string, unknown> = {};
      if (agg.groupBy?.length) {
        for (const g of agg.groupBy) {
          keyObj[g] = entity.properties[g];
        }
      }
      const keyStr = JSON.stringify(keyObj);
      if (!groups.has(keyStr)) {
        groups.set(keyStr, { key: keyObj, values: [] });
      }
      const val = Number(entity.properties[agg.field ?? ""] ?? 0);
      if (!isNaN(val)) {
        groups.get(keyStr)!.values.push(val);
      }
    }

    const result: Array<{ key: Record<string, unknown>; value: number }> = [];
    for (const [, group] of groups) {
      let value = 0;
      switch (agg.type) {
        case "count":
          value = group.values.length;
          break;
        case "sum":
          value = group.values.reduce((a, b) => a + b, 0);
          break;
        case "avg":
          value =
            group.values.length > 0
              ? group.values.reduce((a, b) => a + b, 0) / group.values.length
              : 0;
          break;
        case "min":
          value = group.values.length > 0 ? Math.min(...group.values) : 0;
          break;
        case "max":
          value = group.values.length > 0 ? Math.max(...group.values) : 0;
          break;
      }
      result.push({ key: group.key, value });
    }

    return {
      groups: result,
      total: entities.length,
      executionTime: 0,
      backend: this.id,
    };
  }

  async schema(entityType: string): Promise<EntitySchema> {
    const bucket = this.store.get(entityType);
    const sample = bucket
      ? (bucket.values().next().value as Entity | undefined)
      : undefined;
    const fields = sample
      ? Object.entries(sample.properties).map(([name, val]) => ({
          name,
          type: this.inferType(val) as EntitySchema["fields"][0]["type"],
          required: false,
        }))
      : [];

    return {
      entityType,
      fields,
      primaryKey: "id",
    };
  }

  async health(): Promise<DataSourceHealth> {
    return { ok: true, latencyMs: 0 };
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
    const entityId = command.entityId ?? crypto.randomUUID();
    if (!this.store.has(command.entityType)) {
      this.store.set(command.entityType, new Map());
    }
    const bucket = this.store.get(command.entityType)!;

    switch (command.operation) {
      case "upsert": {
        const existing = bucket.get(entityId);
        const entity: Entity = {
          id: entityId,
          entityType: command.entityType,
          properties: { ...existing?.properties, ...command.properties },
          version: (existing?.version ?? 0) + 1,
          updatedAt: new Date().toISOString(),
        };
        bucket.set(entityId, entity);
        return {
          entityId,
          operation: "upsert",
          success: true,
          version: entity.version,
        };
      }
      case "patch": {
        const existing = bucket.get(entityId);
        if (!existing) {
          return {
            entityId,
            operation: "patch",
            success: false,
            error: "Entity not found",
          };
        }
        existing.properties = { ...existing.properties, ...command.properties };
        existing.version = (existing.version ?? 0) + 1;
        existing.updatedAt = new Date().toISOString();
        return {
          entityId,
          operation: "patch",
          success: true,
          version: existing.version,
        };
      }
      case "delete": {
        const deleted = bucket.delete(entityId);
        return { entityId, operation: "delete", success: deleted };
      }
    }
  }

  async writeBatch(commands: WriteCommand[]): Promise<WriteResult[]> {
    return Promise.all(commands.map((cmd) => this.write(cmd)));
  }

  async initialize(): Promise<void> {}
  async destroy(): Promise<void> {
    this.store.clear();
  }

  /**
   * Get the raw store for testing/debugging.
   */
  getStore(): Map<string, Map<string, Entity>> {
    return this.store;
  }

  private matchesFilters(entity: Entity, filters: Filter[]): boolean {
    return filters.every((f) => {
      const val = entity.properties[f.field];
      switch (f.op) {
        case "eq":
          return val === f.value;
        case "neq":
          return val !== f.value;
        case "gt":
          return Number(val) > Number(f.value);
        case "gte":
          return Number(val) >= Number(f.value);
        case "lt":
          return Number(val) < Number(f.value);
        case "lte":
          return Number(val) <= Number(f.value);
        case "in":
          return Array.isArray(f.value) && f.value.includes(val);
        case "nin":
          return Array.isArray(f.value) && !f.value.includes(val);
        case "contains":
          return String(val).includes(String(f.value));
        case "startsWith":
          return String(val).startsWith(String(f.value));
        case "endsWith":
          return String(val).endsWith(String(f.value));
        case "isNull":
          return val === null || val === undefined;
        case "isNotNull":
          return val !== null && val !== undefined;
        default:
          return true;
      }
    });
  }

  private inferType(val: unknown): string {
    if (val === null || val === undefined) return "string";
    if (typeof val === "number") return "number";
    if (typeof val === "boolean") return "boolean";
    if (val instanceof Date) return "timestamp";
    if (typeof val === "string") {
      if (/^\d{4}-\d{2}-\d{2}/.test(val)) return "timestamp";
      return "string";
    }
    if (Array.isArray(val)) return "array";
    return "object";
  }
}
