import type { EntityId, OntologyId } from "@daemon/platform-types";

/** Tenant + domain slice for multi-institution, multi-domain isolation. */
export interface OntologyScope {
  tenantId: string;
  domainId: string;
}

export const DEFAULT_TENANT_ID = "default";
export const DEFAULT_DOMAIN_ID = "foundation";

export function defaultScope(): OntologyScope {
  return { tenantId: DEFAULT_TENANT_ID, domainId: DEFAULT_DOMAIN_ID };
}

export interface EntityRecord {
  tenantId: string;
  domainId: string;
  ontologyId: OntologyId;
  entityId: EntityId;
  /** Pack entity type (e.g. Party, Case) when using foundation pack. */
  entityType?: string;
  properties: Record<string, unknown>;
  version: number;
  updatedAt: string;
}

export interface RegisterEntityInput {
  scope: OntologyScope;
  ontologyId: OntologyId;
  properties: Record<string, unknown>;
  entityId?: EntityId;
  entityType?: string;
}

export interface PatchEntityInput {
  scope: OntologyScope;
  ontologyId: OntologyId;
  entityId: EntityId;
  patch: Record<string, unknown>;
}

export type RegistryListener = (record: EntityRecord) => void;

/**
 * Bounded-context port for ontology entity persistence (in-memory or future SSOT).
 */
export interface OntologyStore {
  register(input: RegisterEntityInput): EntityRecord;
  get(
    scope: OntologyScope,
    ontologyId: OntologyId,
    entityId: EntityId,
  ): EntityRecord | undefined;
  patch(input: PatchEntityInput): EntityRecord;
  list(scope: OntologyScope, ontologyId?: OntologyId): EntityRecord[];
  subscribe(listener: RegistryListener): () => void;
}
