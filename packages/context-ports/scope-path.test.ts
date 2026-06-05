import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  assertSafeScope,
  assertSafeScopeSegment,
  resolveWithinDirectory,
} from "./scope-path.js";

test("assertSafeScopeSegment accepts default scope values", () => {
  assert.doesNotThrow(() => assertSafeScopeSegment("tenantId", "default"));
  assert.doesNotThrow(() => assertSafeScopeSegment("domainId", "foundation"));
});

test("assertSafeScopeSegment rejects traversal", () => {
  assert.throws(
    () => assertSafeScopeSegment("tenantId", "../etc"),
    /invalid tenantId/,
  );
});

test("resolveWithinDirectory stays within root", () => {
  const root = join(tmpdir(), "daemon-scope-path-test");
  const child = resolveWithinDirectory(root, "default", "foundation");
  assert.ok(child.startsWith(resolve(root)));
});

test("resolveWithinDirectory rejects escape segments", () => {
  const root = join(tmpdir(), "daemon-scope-path-test");
  assert.throws(
    () => resolveWithinDirectory(root, "..", "passwd"),
    /invalid path segment/,
  );
});

test("assertSafeScope validates both segments", () => {
  assert.doesNotThrow(() =>
    assertSafeScope({ tenantId: "default", domainId: "foundation" }),
  );
  assert.throws(
    () => assertSafeScope({ tenantId: "bad/path", domainId: "foundation" }),
    /invalid tenantId/,
  );
});
