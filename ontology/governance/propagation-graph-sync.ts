import type { EntityRecord } from "@daemon/context-ports";
import type { AuditPort } from "@daemon/context-ports";

/**
 * Records graph-edge propagation for Link entities (journal upsert runs in durable store).
 */
export class GraphEdgeSyncPort {
  constructor(private readonly audit: AuditPort) {}

  sync(record: EntityRecord, scope: { tenantId: string; domainId: string }): void {
    if (record.entityType !== "Link") return;
    const fromId = record.properties.fromEntityId;
    const toId = record.properties.toEntityId;
    this.audit.record({
      action: "graph.edge.sync",
      subjectId: "system",
      resource: `${scope.tenantId}/${scope.domainId}/${record.ontologyId}/${record.entityId}`,
      outcome: "allow",
      tenantId: scope.tenantId,
      domainId: scope.domainId,
      metadata: {
        fromEntityId: fromId,
        toEntityId: toId,
        linkType: record.properties.linkType,
      },
    });
  }
}
