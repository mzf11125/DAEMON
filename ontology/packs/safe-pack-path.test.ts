import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { foundationPackRoot } from "./load-pack.js";
import {
  assertPackDirectoryUnderConfigs,
  assertSafeOntologyTypeName,
  assertSafePackYamlFilename,
  resolvePackManifestPath,
  resolvePackTypeYamlPath,
} from "./safe-pack-path.js";

test("assertSafeOntologyTypeName accepts PascalCase types", () => {
  assert.doesNotThrow(() => assertSafeOntologyTypeName("entity", "Party"));
  assert.doesNotThrow(() =>
    assertSafeOntologyTypeName("relation", "RoutingDecision"),
  );
});

test("assertSafeOntologyTypeName rejects traversal", () => {
  assert.throws(
    () => assertSafeOntologyTypeName("entity", "../Party"),
    /invalid entity type name/,
  );
});

test("assertSafePackYamlFilename validates on-disk names", () => {
  assert.equal(assertSafePackYamlFilename("Party.yaml"), "Party");
  assert.throws(
    () => assertSafePackYamlFilename("bad-name.yaml"),
    /invalid pack yaml filename/,
  );
});

test("resolvePackTypeYamlPath stays under foundation pack", () => {
  const packDir = foundationPackRoot();
  assertPackDirectoryUnderConfigs(packDir);
  const path = resolvePackTypeYamlPath(
    packDir,
    "entities",
    "Party",
    "entity",
  );
  assert.ok(path.endsWith(join("entities", "Party.yaml")));
  assert.doesNotThrow(() => resolvePackManifestPath(packDir));
});

test("assertPackDirectoryUnderConfigs rejects paths outside packs root", () => {
  assert.throws(
    () => assertPackDirectoryUnderConfigs("/tmp/evil-pack"),
    /pack directory must be under/,
  );
});
