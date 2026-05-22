import { strict as assert } from "node:assert";
import test from "node:test";
import { aggregateObservations } from "./aggregateObservations";
import { computeSignalPriority } from "./computeSignalPriority";
import { summarizeCaseContext } from "./summarizeCaseContext";
import { matchReferenceList } from "./matchReferenceList";

test("aggregateObservations", () => {
  const r = aggregateObservations([{ value: 10 }, { value: 20 }]);
  assert.equal(r.count, 2);
  assert.equal(r.avg, 15);
  assert.equal(r.max, 20);
});

test("computeSignalPriority", () => {
  const r = computeSignalPriority([{ signalId: "s1", severity: "high" }]);
  assert.equal(r.s1, "P1");
});

test("summarizeCaseContext", () => {
  const t = summarizeCaseContext({ caseId: "c1", title: "Test", signalIds: ["s1"] });
  assert.match(t, /c1/);
});

test("matchReferenceList", () => {
  assert.deepEqual(matchReferenceList({ partyId: "p1", email: "a@demo.local" }), ["internal:p1"]);
});
