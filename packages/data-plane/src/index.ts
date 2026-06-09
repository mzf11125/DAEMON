export {
  DataSourceRegistry,
  type RoutingHint,
  type RegistryMetrics,
} from "./registry/data-source-registry.js";
export type { DataSourcePlugin } from "./registry/data-source-plugin.js";
export type {
  Filter,
  FilterOp,
  Sort,
  AggregationSpec,
  TimeRange,
  Pagination,
  DataSourceQuery,
  Entity,
  EntityLink,
  QueryResult,
  AggregationResult,
  EntitySchema,
  FieldSpec,
  DataSourceHealth,
  DataSourceMetrics,
  WriteCommand,
  WriteResult,
} from "./registry/types.js";
export { MemoryBackend } from "./backends/memory-backend.js";
export {
  PostgresBackend,
  type PostgresBackendConfig,
} from "./backends/postgres-backend.js";
