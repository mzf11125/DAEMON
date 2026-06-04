import type {
  EntityRecord,
  OntologyRegistry,
  RegistryEvent,
} from "../../registry/ontology-registry.js";

/** A denormalized, query-friendly snapshot of an entity. */
export interface EntityReadModel {
  key: string;
  tenantId: string;
  domainId: string;
  ontologyId: string;
  entityId: string;
  properties: Record<string, unknown>;
  version: number;
  updatedAt: string;
}

/**
 * Maintains denormalized entity read models fed from registry events. The
 * projection is eventually consistent with the registry: it applies each
 * `registered`/`patched` event to keep a fast read view without re-querying
 * the system of record.
 */
export class EntityReadModelProjection {
  private readonly views = new Map<string, EntityReadModel>();
  private unsubscribe?: () => void;

  /** Folds a single registry event into the read model store. */
  apply(event: RegistryEvent): void {
    const view = toReadModel(event.record);
    this.views.set(view.key, view);
  }

  /** Attaches to a registry so future mutations update this projection. */
  attach(registry: OntologyRegistry): void {
    this.detach();
    this.unsubscribe = registry.subscribeEvents((event) => this.apply(event));
  }

  /** Detaches from the registry, if attached. */
  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  /** Returns a read model by ontology + entity id, if present. */
  get(
    tenantId: string,
    domainId: string,
    ontologyId: string,
    entityId: string,
  ): EntityReadModel | undefined;
  get(ontologyId: string, entityId: string): EntityReadModel | undefined;
  get(
    a: string,
    b: string,
    c?: string,
    d?: string,
  ): EntityReadModel | undefined {
    if (c !== undefined && d !== undefined) {
      return this.views.get(`${a}:${b}:${c}:${d}`);
    }
    return this.views.get(`${DEFAULT_TENANT}:${DEFAULT_DOMAIN}:${a}:${b}`);
  }

  /** Lists all read models for an ontology within tenant/domain, sorted by entity id. */
  list(
    tenantId: string,
    domainId: string,
    ontologyId: string,
  ): EntityReadModel[];
  list(ontologyId: string): EntityReadModel[];
  list(a: string, b?: string, c?: string): EntityReadModel[] {
    if (b !== undefined && c !== undefined) {
      return [...this.views.values()]
        .filter(
          (v) =>
            v.tenantId === a &&
            v.domainId === b &&
            v.ontologyId === c,
        )
        .sort((x, y) => x.entityId.localeCompare(y.entityId));
    }
    const ont = a;
    return [...this.views.values()]
      .filter(
        (v) =>
          v.tenantId === DEFAULT_TENANT &&
          v.domainId === DEFAULT_DOMAIN &&
          v.ontologyId === ont,
      )
      .sort((x, y) => x.entityId.localeCompare(y.entityId));
  }

  get size(): number {
    return this.views.size;
  }
}

const DEFAULT_TENANT = "default";
const DEFAULT_DOMAIN = "foundation";

function toReadModel(record: EntityRecord): EntityReadModel {
  return {
    key: `${record.tenantId}:${record.domainId}:${record.ontologyId}:${record.entityId}`,
    tenantId: record.tenantId,
    domainId: record.domainId,
    ontologyId: String(record.ontologyId),
    entityId: String(record.entityId),
    properties: { ...record.properties },
    version: record.version,
    updatedAt: record.updatedAt,
  };
}
