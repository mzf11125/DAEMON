/**
 * Unified filter operators for querying across all backend types.
 */
export type FilterOp =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "nin"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "isNull"
  | "isNotNull";

export interface Filter {
  field: string;
  op: FilterOp;
  value?: unknown;
}

export interface Sort {
  field: string;
  direction: "asc" | "desc";
}

export interface AggregationSpec {
  type: "count" | "sum" | "avg" | "min" | "max";
  field?: string;
  groupBy?: string[];
}

export interface TimeRange {
  from: string;
  to: string;
}

export interface Pagination {
  limit: number;
  offset: number;
}

/**
 * Unified query that any backend can consume.
 */
export interface DataSourceQuery {
  entityType: string;
  filters?: Filter[];
  sort?: Sort[];
  limit?: number;
  offset?: number;
  fields?: string[];
  includeLinks?: boolean;
  timeRange?: TimeRange;
  aggregation?: AggregationSpec;
}

/**
 * A single entity as returned by a data source.
 */
export interface Entity {
  id: string;
  entityType: string;
  properties: Record<string, unknown>;
  version?: number;
  updatedAt?: string;
  links?: EntityLink[];
}

export interface EntityLink {
  linkType: string;
  fromEntityType: string;
  fromEntityId: string;
  toEntityType: string;
  toEntityId: string;
  properties?: Record<string, unknown>;
}

/**
 * Unified result from any data source query.
 */
export interface QueryResult {
  entities: Entity[];
  total: number;
  executionTime: number;
  backend: string;
  cached: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Aggregation result for analytics queries.
 */
export interface AggregationResult {
  groups: Array<{
    key: Record<string, unknown>;
    value: number;
  }>;
  total: number;
  executionTime: number;
  backend: string;
}

/**
 * Schema information for an entity type.
 */
export interface EntitySchema {
  entityType: string;
  fields: FieldSpec[];
  primaryKey: string;
  titleProperty?: string;
}

export interface FieldSpec {
  name: string;
  type:
    | "string"
    | "number"
    | "boolean"
    | "timestamp"
    | "enum"
    | "object"
    | "array";
  required: boolean;
  enumValues?: string[];
  description?: string;
}

/**
 * Health and metrics for a data source.
 */
export interface DataSourceHealth {
  ok: boolean;
  latencyMs: number;
  message?: string;
}

export interface DataSourceMetrics {
  queryCount: number;
  avgLatencyMs: number;
  errorRate: number;
  cacheHitRate: number;
  lastQueryAt?: string;
}

/**
 * Write command for mutating data.
 */
export interface WriteCommand {
  entityType: string;
  entityId?: string;
  operation: "upsert" | "delete" | "patch";
  properties: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface WriteResult {
  entityId: string;
  operation: string;
  success: boolean;
  version?: number;
  error?: string;
}
