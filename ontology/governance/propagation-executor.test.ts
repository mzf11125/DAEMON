import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PropagationExecutor } from "./propagation-executor.js";
import { EntityReadModelProjection } from "../projections/read-models/entity-read-model.js";
import { MaterializedView } from "../projections/materialized-views/materialized-view.js";
import { AuditPortAdapter } from "../../security-governance/audit/audit-port-adapter.js";

describe("PropagationExecutor entity filter", () => {
  it("applies party rule only to Party patches", () => {
    const projection = new EntityReadModelProjection();
    const audit = new AuditPortAdapter(null);
    const partyView = new MaterializedView("party-by-kind", (p) =>
      String(p.partyKind ?? "unknown"),
    );
    const executor = new PropagationExecutor(
      [
        {
          id: "party-patch",
          trigger: "patch",
          entityTypes: ["Party"],
          propagate: ["materialized-view:party-by-kind"],
        },
      ],
      {
        projection,
        audit,
        materializedViews: new Map([["party-by-kind", partyView]]),
      },
    );
    const scope = { tenantId: "t1", domainId: "d1" };
    const partyRecord = {
      tenantId: "t1",
      domainId: "d1",
      ontologyId: "foundation",
      entityId: "p1",
      entityType: "Party",
      version: 2,
      properties: { partyKind: "person", displayName: "A" },
    };
    executor.run({ trigger: "patch", record: partyRecord, scope });
    assert.equal(partyView.countFor("person"), 1);

    const caseRecord = { ...partyRecord, entityType: "Case", entityId: "c1" };
    executor.run({ trigger: "patch", record: caseRecord, scope });
    assert.equal(partyView.countFor("person"), 1);
  });
});
