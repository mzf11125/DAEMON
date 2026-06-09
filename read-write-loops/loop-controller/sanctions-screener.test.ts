/** BigPlan Phase 4.3 | Sanctions Screener tests */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { SanctionsScreener, type SanctionEntry } from "./sanctions-screener.js";

const ofacEntry: SanctionEntry = {
  listId: "OFAC_SDN",
  entryId: "sdn-12345",
  names: ["Osama Bin Laden"],
  aliases: ["Usama Bin Ladin"],
  listedDate: "2001-10-12",
  program: "SDGT",
};

describe("SanctionsScreener", () => {
  let screener: SanctionsScreener;

  beforeEach(async () => {
    screener = new SanctionsScreener({ enabledLists: ["OFAC_SDN"] });
    await screener.loadList("OFAC_SDN", [ofacEntry]);
  });

  it("returns EXACT hit for identical name (happy path)", async () => {
    const result = await screener.screen("Osama Bin Laden");
    assert.equal(result.hits.length, 1);
    assert.equal(result.hits[0]?.matchType, "EXACT");
    assert.equal(result.hits[0]?.similarity, 1.0);
  });

  it("returns FUZZY hit for close typo", async () => {
    const result = await screener.screen("Osama Bin Ladan");
    assert.equal(result.hits.length, 1);
    assert.equal(result.hits[0]?.matchType, "FUZZY");
    assert.ok((result.hits[0]?.similarity ?? 0) >= 0.92);
  });

  it("returns NO_HIT for unrelated name", async () => {
    const result = await screener.screen("Maria Garcia");
    assert.equal(result.hits.length, 0);
    assert.equal(result.screened, true);
  });
});
