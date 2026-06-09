import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { entityId, ontologyId } from "@daemon/platform-types";
import { OntologyRegistry } from "../../ontology/registry/ontology-registry.js";
import { DaemonRuntime } from "../../api/gateway/src/platform/daemon-runtime.js";
import { AuditPortAdapter } from "../../security-governance/audit/audit-port-adapter.js";

describe("integration ontology propagation", () => {
  it("register then patch updates projection", () => {
    const store = new OntologyRegistry();
    const audit = new AuditPortAdapter(null);
    const runtime = new DaemonRuntime({ store, audit });
    const scope = { tenantId: "inst-alpha", domainId: "foundation" };
    const pack = runtime.packs.resolve(
      runtime.tenants.require("inst-alpha"),
      "foundation",
    );
    const ont = ontologyId("foundation");
    const id = entityId(`prop-int-${Date.now()}`);

    runtime.registerEntity(
      scope,
      {
        scope,
        ontologyId: ont,
        entityId: id,
        entityType: "Case",
        properties: { title: "Before", status: "open" },
      },
      pack,
    );

    store.patch({
      scope,
      ontologyId: ont,
      entityId: id,
      patch: { status: "closed" },
    });

    const view = runtime.projection.get(
      scope.tenantId,
      scope.domainId,
      String(ont),
      String(id),
    );
    assert.equal(view?.properties.status, "closed");
    assert.equal(view?.version, 2);
    assert.ok(audit.list(20).some((e) => e.action === "ontology.patch"));

    const caseView = runtime.materializedViews.get("case-by-status");
    assert.ok(caseView);
    assert.equal(caseView!.countFor("closed"), 1);
    assert.equal(caseView!.countFor("open"), 0);
  });

  it("logistics domain Shipment register then patch updates projection", () => {
    const store = new OntologyRegistry();
    const audit = new AuditPortAdapter(null);
    const runtime = new DaemonRuntime({ store, audit });
    const scope = { tenantId: "logistics-pilot", domainId: "logistics" };
    const pack = runtime.packs.resolve(
      runtime.tenants.require("logistics-pilot"),
      "logistics",
    );
    const ont = ontologyId("foundation");
    const id = entityId(`log-prop-${Date.now()}`);

    runtime.registerEntity(
      scope,
      {
        scope,
        ontologyId: ont,
        entityId: id,
        entityType: "Shipment",
        properties: {
          displayName: "Before",
          entityType: "Shipment",
          status: "open",
        },
      },
      pack,
    );

    store.patch({
      scope,
      ontologyId: ont,
      entityId: id,
      patch: { status: "closed" },
    });

    const view = runtime.projection.get(
      scope.tenantId,
      scope.domainId,
      String(ont),
      String(id),
    );
    assert.equal(view?.properties.status, "closed");
    assert.equal(view?.version, 2);
    assert.ok(audit.list(20).some((e) => e.action === "ontology.patch"));
  });
});
