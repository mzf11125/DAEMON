import type { DataSourcePlugin } from "./data-source-plugin.js";
import type {
  DataSourceQuery,
  QueryResult,
  AggregationResult,
  EntitySchema,
  DataSourceHealth,
  WriteCommand,
  WriteResult,
} from "./types.js";

export interface RoutingHint {
  preferredBackend?: string;
  forceBackend?: string;
  maxLatencyMs?: number;
}

export interface RegistryMetrics {
  totalSources: number;
  healthySources: number;
  queryCount: number;
  routingErrors: number;
}

/**
 * Central registry for all data source backends.
 *
 * Routes queries to the best-fit backend based on entity type,
 * backend priority, health, and optional routing hints.
 */
export class DataSourceRegistry {
  private sources = new Map<string, DataSourcePlugin>();
  private entityIndex = new Map<string, DataSourcePlugin[]>();
  private queryCount = 0;
  private routingErrors = 0;

  /**
   * Register a data source plugin.
   * Automatically indexes by entity type for fast routing.
   */
  register(source: DataSourcePlugin): void {
    if (this.sources.has(source.id)) {
      throw new Error(`Data source "${source.id}" is already registered`);
    }
    this.sources.set(source.id, source);

    // Index by entity type, sorted by priority (lower = better)
    for (const entityType of source.entityTypes) {
      const existing = this.entityIndex.get(entityType) ?? [];
      existing.push(source);
      existing.sort((a, b) => a.priority - b.priority);
      this.entityIndex.set(entityType, existing);
    }

    console.log(
      `[data-plane] registered: ${source.id} (${source.backend}) → [${source.entityTypes.join(", ")}]`,
    );
  }

  /**
   * Register multiple data source plugins.
   */
  registerAll(sources: DataSourcePlugin[]): void {
    for (const source of sources) {
      this.register(source);
    }
  }

  /**
   * Deregister a data source plugin.
   */
  deregister(sourceId: string): void {
    const source = this.sources.get(sourceId);
    if (!source) return;

    // Remove from entity index
    for (const entityType of source.entityTypes) {
      const list = this.entityIndex.get(entityType);
      if (list) {
        const filtered = list.filter((s) => s.id !== sourceId);
        if (filtered.length === 0) {
          this.entityIndex.delete(entityType);
        } else {
          this.entityIndex.set(entityType, filtered);
        }
      }
    }

    this.sources.delete(sourceId);
    console.log(`[data-plane] deregistered: ${sourceId}`);
  }

  /**
   * Check if a data source is registered.
   */
  has(sourceId: string): boolean {
    return this.sources.has(sourceId);
  }

  /**
   * Get a specific data source by ID.
   */
  get(sourceId: string): DataSourcePlugin | undefined {
    return this.sources.get(sourceId);
  }

  /**
   * List all registered data sources.
   */
  list(): DataSourcePlugin[] {
    return Array.from(this.sources.values());
  }

  /**
   * List data sources that serve a specific entity type.
   */
  listForEntityType(entityType: string): DataSourcePlugin[] {
    return this.entityIndex.get(entityType) ?? [];
  }

  /**
   * Route a query to the best-fit backend and execute it.
   */
  async query(
    request: DataSourceQuery,
    hint?: RoutingHint,
  ): Promise<QueryResult> {
    const source = this.resolve(request.entityType, hint);
    if (!source) {
      this.routingErrors++;
      throw new Error(
        `No data source registered for entity type "${request.entityType}"`,
      );
    }

    this.queryCount++;
    const start = performance.now();

    try {
      const result = await source.query(request);
      return {
        ...result,
        executionTime: performance.now() - start,
        backend: source.id,
      };
    } catch (err) {
      this.routingErrors++;
      throw err;
    }
  }

  /**
   * Route an aggregation query to the best-fit backend.
   */
  async aggregate(
    request: DataSourceQuery,
    hint?: RoutingHint,
  ): Promise<AggregationResult> {
    const source = this.resolve(request.entityType, hint);
    if (!source?.aggregate) {
      throw new Error(
        `No aggregation support for entity type "${request.entityType}"`,
      );
    }

    this.queryCount++;
    return source.aggregate(request);
  }

  /**
   * Route a write command to the appropriate backend.
   */
  async write(command: WriteCommand, hint?: RoutingHint): Promise<WriteResult> {
    const source = this.resolve(command.entityType, hint);
    if (!source?.write) {
      throw new Error(
        `No write support for entity type "${command.entityType}"`,
      );
    }
    return source.write(command);
  }

  /**
   * Write batch — dispatches to the best backend for each command.
   */
  async writeBatch(commands: WriteCommand[]): Promise<WriteResult[]> {
    const results: WriteResult[] = [];
    for (const cmd of commands) {
      results.push(await this.write(cmd));
    }
    return results;
  }

  /**
   * Get schema for an entity type from the preferred backend.
   */
  async schema(entityType: string, hint?: RoutingHint): Promise<EntitySchema> {
    const source = this.resolve(entityType, hint);
    if (!source) {
      throw new Error(
        `No data source registered for entity type "${entityType}"`,
      );
    }
    return source.schema(entityType);
  }

  /**
   * Health check all registered data sources.
   */
  async healthCheck(): Promise<Map<string, DataSourceHealth>> {
    const results = new Map<string, DataSourceHealth>();
    for (const [id, source] of this.sources) {
      try {
        results.set(id, await source.health());
      } catch (err) {
        results.set(id, { ok: false, latencyMs: 0, message: String(err) });
      }
    }
    return results;
  }

  /**
   * Aggregate metrics from all sources.
   */
  async registryMetrics(): Promise<RegistryMetrics> {
    const health = await this.healthCheck();
    return {
      totalSources: this.sources.size,
      healthySources: Array.from(health.values()).filter((h) => h.ok).length,
      queryCount: this.queryCount,
      routingErrors: this.routingErrors,
    };
  }

  /**
   * Resolve the best data source for an entity type, considering hints and health.
   */
  private resolve(
    entityType: string,
    hint?: RoutingHint,
  ): DataSourcePlugin | undefined {
    // Force backend override
    if (hint?.forceBackend) {
      return this.sources.get(hint.forceBackend);
    }

    const candidates = this.entityIndex.get(entityType);
    if (!candidates || candidates.length === 0) {
      return undefined;
    }

    // Preferred backend hint
    if (hint?.preferredBackend) {
      const preferred = candidates.find((s) => s.id === hint.preferredBackend);
      if (preferred) return preferred;
    }

    // Default: first candidate (lowest priority)
    return candidates[0];
  }
}
