#!/usr/bin/env node
/**
 * Local parity harness: register entities, read via ReadRouter with parity
 * checking enabled, print match/mismatch counters.
 *
 * Usage:
 *   node scripts/measure-read-projection-parity.mjs
 */
import { OntologyRegistry } from "../ontology/registry/ontology-registry.js";
import { EntityReadModelProjection } from "../ontology/projections/read-models/entity-read-model.js";
import { ReadRouter } from "../read-write-loops/reads/read-router.js";
import { globalReadParityMetrics } from "../read-write-loops/reads/read-parity-metrics.js";
import { entityId, ontologyId } from "@daemon/platform-types";

globalReadParityMetrics.reset();

const store = new OntologyRegistry();
const projection = new EntityReadModelProjection();
projection.attach(store);

const router = new ReadRouter(store, {
  projection,
  useProjection: true,
  parityCheck: true,
  parityMetrics: globalReadParityMetrics,
});

const scope = { tenantId: "inst-alpha", domainId: "foundation" };
const ont = ontologyId("foundation");
const id = entityId("parity-demo-1");

store.register({
  scope,
  ontologyId: ont,
  entityId: id,
  entityType: "Party",
  properties: { displayName: "Parity Demo", entityType: "Party" },
});

for (let i = 0; i < 5; i++) {
  router.route({
    tenantId: scope.tenantId,
    domainId: scope.domainId,
    ontologyId: ont,
    entityId: id,
  });
}

const snap = globalReadParityMetrics.snapshot();
console.log(JSON.stringify({
  checks: snap.checks,
  matches: snap.matches,
  mismatches: Object.fromEntries(snap.mismatches),
  matchRate: snap.checks > 0 ? snap.matches / snap.checks : 0,
}, null, 2));

if (snap.matches !== snap.checks) {
  process.exitCode = 1;
}
