import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { SourceCatalog } from "./source-catalog.js";

describe("SourceCatalog", () => {
  it("loads demo-parties from repo sources.yaml", () => {
    const root = join(import.meta.dirname, "..", "..");
    process.env.DAEMON_REPO_ROOT = root;
    const catalog = SourceCatalog.fromYamlFile();
    const source = catalog.require("demo-parties");
    assert.equal(source.normalize.ontologyId, "foundation");
    assert.equal(source.normalize.entityType, "Party");
    assert.equal(source.connector.type, "file");
    if (source.connector.type === "file") {
      assert.equal(source.connector.path, "tests/fixtures/ingest/parties.jsonl");
    }
  });

  it("throws for unknown source", () => {
    const root = join(import.meta.dirname, "..", "..");
    process.env.DAEMON_REPO_ROOT = root;
    const catalog = SourceCatalog.fromYamlFile();
    assert.throws(() => catalog.require("missing-source"), /unknown ingest source/);
  });
});
