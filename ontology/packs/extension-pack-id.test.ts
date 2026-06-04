import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertValidExtensionPackId,
  listKnownExtensionPackIds,
} from "./extension-pack-id.js";
import { loadExtensionPack } from "./load-pack.js";

test("listKnownExtensionPackIds includes aml-compliance", () => {
  const ids = listKnownExtensionPackIds();
  assert.ok(ids.includes("aml-compliance"));
});

test("assertValidExtensionPackId accepts known pack", () => {
  assert.doesNotThrow(() => assertValidExtensionPackId("aml-compliance"));
});

test("rejects invalid characters before filesystem access", () => {
  assert.throws(
    () => assertValidExtensionPackId("../aml-compliance"),
    /invalid extension pack id/,
  );
  assert.throws(
    () => assertValidExtensionPackId("AML"),
    /invalid extension pack id/,
  );
  assert.throws(
    () => assertValidExtensionPackId("pack/sub"),
    /invalid extension pack id/,
  );
});

test("rejects unknown pack id", () => {
  assert.throws(
    () => assertValidExtensionPackId("not-a-real-pack"),
    /unknown extension pack/,
  );
});

test("loadExtensionPack rejects path traversal id", () => {
  assert.throws(() => loadExtensionPack(".."), /invalid extension pack id/);
});
