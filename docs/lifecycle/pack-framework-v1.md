# Sector pack framework v1

## Layout

```text
ontology/v2/manifest.json          # core types, availablePacks[]
ontology/v2/examples/packs/
  {packId}/manifest.json             # pack metadata (+ future types/rules)
  aml-fintech/                     # reference example with sample object types
```

Runtime: ontology-service merges each `examples/packs/*/manifest.json` into manifest response `packs`.

## Manifest fields (pack)

| Field | Purpose |
|-------|---------|
| `packId` | Directory name |
| `displayName` | Console / docs |
| `status` | `stub` \| `reference` \| `active` |
| `sector` | Taxonomy |
| `connectorProfiles` | Planned ingestion interfaces |
| `regulatoryNotes` | Non-binding doc pointer |

## v1 scope (E0)

- Stub packs: `logistics-nvocc`, `healthcare-ops`, `government-ops`, `web3-intel`, `agri-food`, `banking-core`, `finance-ledger`
- **No** full sector E2E in v1 CI (A-PACK-01)
- **No** aml-fintech full E2E gate

## W2 (post–v1)

Pick **one** sector for first full pack: minimal types + rule + seed + console panel + `E2E_PACK=1` (future).

## Docs

- [`docs/ontology/multi-sector-fragmentation-v1.md`](../ontology/multi-sector-fragmentation-v1.md)
- [`docs/ontology/vertical-packs.md`](../ontology/vertical-packs.md)
