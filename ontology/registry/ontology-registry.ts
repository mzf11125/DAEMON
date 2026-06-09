import type { EntityId, OntologyId } from "@daemon/platform-types";
import { DaemonError, ErrorCodes } from "@daemon/platform-types";
import { entityId, ontologyId } from "@daemon/platform-types";
import type {
  OntologyStore,
  OntologyScope,
  RegisterEntityInput,
  PatchEntityInput,
  RegistryListener as StoreListener,
} from "@daemon/context-ports";
import {
  DEFAULT_DOMAIN_ID,
  DEFAULT_TENANT_ID,
  defaultScope,
} from "@daemon/context-ports";
export type { EntityRecord, OntologyScope } from "@daemon/context-ports";
export { DEFAULT_TENANT_ID, DEFAULT_DOMAIN_ID, defaultScope } from "@daemon/context-ports";
import type { EntityRecord } from "@daemon/context-ports";

/**
 * Event emitted by the registry whenever an entity is created or mutated.
 * Projections subscribe to these to maintain derived read models.
 */
export interface RegistryEvent {
  kind: "registered" | "patched";
  record: EntityRecord;
}

export type RegistryEventListener = (event: RegistryEvent) => void;

function storageKey(
  scope: OntologyScope,
  ont: OntologyId,
  id: EntityId,
): string {
  return `${scope.tenantId}:${scope.domainId}:${ont}:${id}`;
}

function resolveScope(scope?: Partial<OntologyScope>): OntologyScope {
  return {
    tenantId: scope?.tenantId ?? DEFAULT_TENANT_ID,
    domainId: scope?.domainId ?? DEFAULT_DOMAIN_ID,
  };
}

export class OntologyRegistry implements OntologyStore {
  private readonly entities = new Map<string, EntityRecord>();
  private readonly eventListeners = new Set<RegistryEventListener>();
  private readonly storeListeners = new Set<StoreListener>();

  /** OntologyStore port: record-only notifications. */
  subscribe(listener: StoreListener): () => void {
    this.storeListeners.add(listener);
    return () => {
      this.storeListeners.delete(listener);
    };
  }

  /** Projections that need registered vs patched events. */
  subscribeEvents(listener: RegistryEventListener): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  private emit(event: RegistryEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
    for (const listener of this.storeListeners) {
      listener(event.record);
    }
  }

  register(input: RegisterEntityInput): EntityRecord;
  register(
    ont: OntologyId,
    props: Record<string, unknown>,
    id?: EntityId,
    scope?: Partial<OntologyScope>,
  ): EntityRecord;
  register(
    ontOrInput: OntologyId | RegisterEntityInput,
    props?: Record<string, unknown>,
    id?: EntityId,
    scopeArg?: Partial<OntologyScope>,
  ): EntityRecord {
    if (typeof ontOrInput === "object" && "scope" in ontOrInput) {
      return this.registerScoped(ontOrInput);
    }
    const scope = resolveScope(scopeArg);
    return this.registerScoped({
      scope,
      ontologyId: ontOrInput as OntologyId,
      properties: props ?? {},
      entityId: id,
      entityType:
        typeof props?.entityType === "string"
          ? props.entityType
          : undefined,
    });
  }

  private registerScoped(input: RegisterEntityInput): EntityRecord {
    const scope = resolveScope(input.scope);
    const entityIdValue =
      input.entityId ?? entityId(`ent-${this.entities.size + 1}`);
    const key = storageKey(scope, input.ontologyId, entityIdValue);
    const entityType =
      input.entityType ??
      (typeof input.properties.entityType === "string"
        ? input.properties.entityType
        : undefined);
    const record: EntityRecord = {
      tenantId: scope.tenantId,
      domainId: scope.domainId,
      entityId: entityIdValue,
      ontologyId: input.ontologyId,
      entityType,
      properties: { ...input.properties },
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    this.entities.set(key, record);
    this.emit({ kind: "registered", record });
    return record;
  }

  get(
    scopeOrOnt: OntologyScope | OntologyId,
    ontOrId?: OntologyId | EntityId,
    idArg?: EntityId,
  ): EntityRecord | undefined {
    if (typeof scopeOrOnt === "object" && "tenantId" in scopeOrOnt) {
      const scope = resolveScope(scopeOrOnt);
      return this.entities.get(
        storageKey(scope, ontOrId as OntologyId, idArg as EntityId),
      );
    }
    return this.get(resolveScope(), scopeOrOnt as OntologyId, ontOrId as EntityId);
  }

  list(scopeOrOnt?: OntologyScope | OntologyId, ontArg?: OntologyId): EntityRecord[] {
    let scope: OntologyScope = defaultScope();
    let filterOnt: OntologyId | undefined;
    if (scopeOrOnt === undefined) {
      filterOnt = undefined;
    } else if (typeof scopeOrOnt === "object" && "tenantId" in scopeOrOnt) {
      scope = resolveScope(scopeOrOnt);
      filterOnt = ontArg;
    } else {
      filterOnt = scopeOrOnt as OntologyId;
    }
    const all = [...this.entities.values()].filter(
      (r) => r.tenantId === scope.tenantId && r.domainId === scope.domainId,
    );
    return filterOnt
      ? all.filter((record) => record.ontologyId === filterOnt)
      : all;
  }

  patch(input: PatchEntityInput): EntityRecord;
  patch(
    ont: OntologyId,
    id: EntityId,
    patchProps: Record<string, unknown>,
    scope?: Partial<OntologyScope>,
  ): EntityRecord;
  patch(
    ontOrInput: OntologyId | PatchEntityInput,
    id?: EntityId,
    patchProps?: Record<string, unknown>,
    scopeArg?: Partial<OntologyScope>,
  ): EntityRecord {
    if (typeof ontOrInput === "object" && "scope" in ontOrInput) {
      return this.patchScoped(ontOrInput);
    }
    const scope = resolveScope(scopeArg);
    return this.patchScoped({
      scope,
      ontologyId: ontOrInput as OntologyId,
      entityId: id as EntityId,
      patch: patchProps ?? {},
    });
  }

  private patchScoped(input: PatchEntityInput): EntityRecord {
    const scope = resolveScope(input.scope);
    const key = storageKey(scope, input.ontologyId, input.entityId);
    const existing = this.entities.get(key);
    if (!existing) {
      throw new DaemonError(
        ErrorCodes.NOT_FOUND,
        `entity not found: ${key}`,
        404,
      );
    }
    const next: EntityRecord = {
      ...existing,
      properties: { ...existing.properties, ...input.patch },
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.entities.set(key, next);
    this.emit({ kind: "patched", record: next });
    return next;
  }
}

export const globalRegistry = new OntologyRegistry();

export function defaultOntology(): OntologyId {
  return ontologyId("foundation");
}
