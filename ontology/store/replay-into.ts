import type { EntityRecord } from "@daemon/context-ports";
import type { EntityJournal } from "@daemon/data-platform/operational-store/entity-journal";
import type { OntologyRegistry } from "../registry/ontology-registry.js";

/**
 * Hydrate an in-memory registry from the durable journal (deterministic order).
 */
export async function replayInto(
  registry: OntologyRegistry,
  journal: EntityJournal,
): Promise<number> {
  const rows = await journal.loadAll();
  for (const record of rows) {
    applySnapshot(registry, record);
  }
  return rows.length;
}

function applySnapshot(registry: OntologyRegistry, record: EntityRecord): void {
  const existing = registry.get(
    { tenantId: record.tenantId, domainId: record.domainId },
    record.ontologyId,
    record.entityId,
  );
  if (!existing) {
    registry.register({
      scope: { tenantId: record.tenantId, domainId: record.domainId },
      ontologyId: record.ontologyId,
      entityId: record.entityId,
      entityType: record.entityType,
      properties: { ...record.properties },
    });
    return;
  }
  if (existing.version >= record.version) return;
  const delta: Record<string, unknown> = { ...record.properties };
  registry.patch({
    scope: { tenantId: record.tenantId, domainId: record.domainId },
    ontologyId: record.ontologyId,
    entityId: record.entityId,
    patch: delta,
  });
}
