import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { entityId, ontologyId } from "@daemon/platform-types";
import type { EntityRecord, OntologyScope } from "@daemon/context-ports";
import type { EntityJournal } from "@daemon/data-platform/operational-store/entity-journal";
import { OntologyRegistry } from "../registry/ontology-registry.js";
import { DurableOntologyStore } from "./durable-ontology-store.js";

class MemoryJournal implements EntityJournal {
  readonly rows: EntityRecord[] = [];

  async upsert(record: EntityRecord): Promise<void> {
    const idx = this.rows.findIndex(
      (r) =>
        r.tenantId === record.tenantId &&
        r.domainId === record.domainId &&
        r.ontologyId === record.ontologyId &&
        r.entityId === record.entityId,
    );
    if (idx >= 0) this.rows[idx] = record;
    else this.rows.push(record);
  }

  async loadAll(): Promise<EntityRecord[]> {
    return [...this.rows];
  }

  async loadScope(scope: OntologyScope): Promise<EntityRecord[]> {
    return this.rows.filter(
      (r) => r.tenantId === scope.tenantId && r.domainId === scope.domainId,
    );
  }

  async close(): Promise<void> {}
}

describe("DurableOntologyStore", () => {
  it("write-through register and patch to journal", async () => {
    const inner = new OntologyRegistry();
    const journal = new MemoryJournal();
    const store = new DurableOntologyStore(inner, journal);
    const scope = { tenantId: "inst-alpha", domainId: "foundation" };
    const ont = ontologyId("foundation");
    const id = entityId("dur-1");
    store.register({
      scope,
      ontologyId: ont,
      entityId: id,
      entityType: "Case",
      properties: { title: "A", status: "open" },
    });
    await store.pendingWrites();
    assert.equal(journal.rows.length, 1);
    assert.equal(journal.rows[0]?.properties.title, "A");
    store.patch({
      scope,
      ontologyId: ont,
      entityId: id,
      patch: { status: "closed" },
    });
    await store.pendingWrites();
    assert.equal(journal.rows[0]?.version, 2);
    assert.equal(journal.rows[0]?.properties.status, "closed");
  });
});
