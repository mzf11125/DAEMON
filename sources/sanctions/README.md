# Sanctions List Data Sources

This directory holds sanctions screening data consumed by `SanctionsScreener`
(`read-write-loops/loop-controller/sanctions-screener.ts`).

## Supported lists

| List ID | Authority | Typical use |
|---------|-----------|-------------|
| `DTTOT` | BNPT (Indonesia) | Terrorism designation list |
| `UN_SC` | UN Security Council | Global sanctions |
| `OFAC_SDN` | US Treasury OFAC | SDN program |
| `EU_CSL` | European Union | Consolidated sanctions |
| `PPATK_AML` | PPATK internal | Domestic watchlist |

## File format

Each list is a JSON array of `SanctionEntry` objects:

```json
[
  {
    "listId": "OFAC_SDN",
    "entryId": "sdn-12345",
    "names": ["Primary Name"],
    "aliases": ["Alias Name"],
    "listedDate": "2026-01-01",
    "program": "SDGT"
  }
]
```

Suggested filenames:

- `dttot.json`
- `un-sc.json`
- `ofac-sdn.json`
- `eu-csl.json`
- `ppatk-aml.json`

## Updating from official sources

### DTTOT (Indonesia)

1. Download the latest published list from BNPT / official government channels.
2. Normalize names to Latin script; preserve all aliases.
3. Map each row to `SanctionEntry` with `listId: "DTTOT"`.
4. Replace `sources/sanctions/dttot.json` and record the publication date in git commit message.

### OFAC SDN

1. Export from [OFAC SDN Advanced Search](https://sanctionssearch.ofac.treas.gov/) or Treasury bulk data.
2. Use `entryId` from OFAC unique ID field.
3. Include `program` (e.g. `SDGT`, `IRGC`) when available.
4. Save as `ofac-sdn.json`.

### UN Security Council

1. Download consolidated XML/CSV from the [UN Sanctions List](https://www.un.org/securitycouncil/sanctions/information).
2. Map `DATAID` → `entryId`, primary name + aliases → `names` / `aliases`.
3. Save as `un-sc.json`.

### EU CSL

1. Download from [EU Financial Sanctions Database](https://www.sanctionsmap.eu/).
2. Map reference number → `entryId`.
3. Save as `eu-csl.json`.

## Loading in application code

```typescript
import { readFile } from "node:fs/promises";
import { SanctionsScreener, type SanctionEntry } from "@daemon/read-write-loops/loop-controller/sanctions-screener.js";

const screener = new SanctionsScreener();
const ofac = JSON.parse(await readFile("sources/sanctions/ofac-sdn.json", "utf8")) as SanctionEntry[];
await screener.loadList("OFAC_SDN", ofac);
```

## Operational notes

- Treat sanctions files as sensitive operational data; do not commit live production watchlists to public repos without policy review.
- Re-screen entities after each list update; log `screenedAt` for audit.
- Fuzzy matching threshold defaults to `0.92` (Jaro-Winkler); lower only with compliance approval.
