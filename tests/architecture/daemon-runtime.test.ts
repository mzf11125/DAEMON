import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { entityId, ontologyId } from "@daemon/platform-types";
import { OntologyRegistry } from "../../ontology/registry/ontology-registry.js";
import { DaemonRuntime } from "../../api/gateway/src/platform/daemon-runtime.js";
import { AuditPortAdapter } from "../../security-governance/audit/audit-port-adapter.js";

describe("DaemonRuntime composition", () => {
  it("wires read/write loop with scoped store and records audit", async () => {
    const store = new OntologyRegistry();
    const audit = new AuditPortAdapter(null);
    const runtime = new DaemonRuntime({ store, audit });
    const scope = { tenantId: "default", domainId: "foundation" };
    const ont = ontologyId("foundation");
    const id = entityId("loop-ent-1");
    store.register({
      scope,
      ontologyId: ont,
      entityId: id,
      entityType: "Case",
      properties: { title: "Case A", status: "open", entityType: "Case" },
    });
    const outcome = await runtime.runWriteLoop(scope, {
      session: { subjectId: "user-1", roles: ["analyst"] },
      ontologyId: "foundation",
      entityId: "loop-ent-1",
      patch: { status: "closed" },
    });
    assert.equal(outcome.version, 2);
    assert.ok(outcome.trace.length > 0);
    assert.ok(audit.list(10).some((e) => e.action === "loop.write"));
    const auditEntry = audit.list(10).find((e) => e.action === "loop.write");
    assert.ok(Array.isArray(auditEntry?.metadata?.trace));
    if (runtime.actionCatalog) {
      assert.ok(
        outcome.workflowResults?.some((r) => r.includes("entity-write-audit")),
        "onCommitted workflow should run after commit",
      );
    }
  });

  it("propagation updates read-model projection on register", () => {
    const store = new OntologyRegistry();
    const audit = new AuditPortAdapter(null);
    const runtime = new DaemonRuntime({ store, audit });
    const scope = { tenantId: "inst-alpha", domainId: "foundation" };
    const pack = runtime.packs.resolve(
      runtime.tenants.require("inst-alpha"),
      "foundation",
    );
    const id = entityId(`prop-${Date.now()}`);
    runtime.registerEntity(
      scope,
      {
        scope,
        ontologyId: ontologyId("foundation"),
        entityId: id,
        entityType: "Case",
        properties: { title: "Propagated", status: "open" },
      },
      pack,
    );
    const view = runtime.projection.get(
      scope.tenantId,
      scope.domainId,
      "foundation",
      String(id),
    );
    assert.ok(view);
    assert.equal(view?.properties.title, "Propagated");
    assert.ok(
      audit.list(20).some((e) => e.action === "ontology.register"),
    );
  });

  it("upsertEntity patches when entity already exists", () => {
    const store = new OntologyRegistry();
    const runtime = new DaemonRuntime({ store });
    const scope = { tenantId: "inst-alpha", domainId: "foundation" };
    const pack = runtime.packs.resolve(
      runtime.tenants.require("inst-alpha"),
      "foundation",
    );
    const ont = ontologyId("foundation");
    const id = entityId("upsert-party-1");
    const input = {
      scope,
      ontologyId: ont,
      entityId: id,
      entityType: "Party",
      properties: { displayName: "First", partyId: "upsert-party-1" },
    };
    const first = runtime.upsertEntity(scope, input, pack);
    assert.equal(first.version, 1);
    const second = runtime.upsertEntity(
      scope,
      {
        ...input,
        properties: { displayName: "Second", partyId: "upsert-party-1" },
      },
      pack,
    );
    assert.equal(second.version, 2);
    assert.equal(second.properties.displayName, "Second");
  });
});
