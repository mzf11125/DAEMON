import type {
  DataSourceQuery,
  QueryResult,
  AggregationResult,
  EntitySchema,
  DataSourceHealth,
  DataSourceMetrics,
  WriteCommand,
  WriteResult,
} from "./types.js";

/**
 * What every storage backend must implement.
 *
 * Plugins register implementations of this interface with the DataSourceRegistry.
 * The registry routes queries to the best-fit backend based on entity type,
 * query complexity, and performance hints.
 */
export interface DataSourcePlugin {
  /** Unique identifier for this data source (e.g., "pg-entities", "ch-analytics"). */
  readonly id: string;

  /** Human-readable name. */
  readonly name: string;

  /** Backend category — used for routing decisions. */
  readonly backend: "postgres" | "clickhouse" | "neo4j" | "memory" | "custom";

  /** Which ontology entity types this backend can serve. */
  readonly entityTypes: string[];

  /** Priority (lower = preferred). Used when multiple backends serve the same entity type. */
  readonly priority: number;

  /** Execute a read query. */
  query(request: DataSourceQuery): Promise<QueryResult>;

  /** Execute an aggregation query (optional — not all backends support this). */
  aggregate?(request: DataSourceQuery): Promise<AggregationResult>;

  /** Return schema information for an entity type. */
  schema(entityType: string): Promise<EntitySchema>;

  /** Health check. */
  health(): Promise<DataSourceHealth>;

  /** Performance metrics. */
  metrics(): Promise<DataSourceMetrics>;

  /** Write data (optional — read-only sources skip this). */
  write?(command: WriteCommand): Promise<WriteResult>;

  /** Write batch (optional). */
  writeBatch?(commands: WriteCommand[]): Promise<WriteResult[]>;

  /** Lifecycle hook — called once when the data source is registered. */
  initialize?(): Promise<void>;

  /** Lifecycle hook — called when the data source is deregistered or shutdown. */
  destroy?(): Promise<void>;
}
