import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { SourceCatalog } from "../orchestrator/source-catalog.js";
import { createConnectorForSource } from "./connector-factory.js";

describe("createConnectorForSource", () => {
  it("builds file connector and fetches jsonl rows", async () => {
    const root = join(import.meta.dirname, "..", "..");
    process.env.DAEMON_REPO_ROOT = root;
    const catalog = SourceCatalog.fromYamlFile();
    const source = catalog.require("demo-parties");
    const connector = createConnectorForSource(source);
    const records = await connector.fetch();
    assert.equal(records.length, 2);
    assert.equal(records[0]?.payload.partyId, "party-demo-1");
  });
});
