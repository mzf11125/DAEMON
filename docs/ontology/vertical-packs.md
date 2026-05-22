# Vertical packs

Sector extensions live under `ontology/v2/examples/packs/{packId}/manifest.json` and appear in `GET /v1/ontology/v2/manifest` under `packs`.

## v1 (framework + stubs)

| packId | Status | Notes |
|--------|--------|-------|
| `aml-fintech` | reference example | Object types in repo; **not** v1 E2E gate |
| `logistics-nvocc` | stub | Post–v1 candidate W2 |
| `healthcare-ops` | stub | [`healthcare-ops-assume-case-v1.md`](healthcare-ops-assume-case-v1.md) |
| `government-ops` | stub | |
| `web3-intel` | stub | Dune/Sim aligned (A-CHAIN-03) |
| `agri-food` | stub | |
| `banking-core` | stub | |
| `finance-ledger` | stub | |

Legacy short-name stubs (`logistics`, `healthcare`, …) remain on disk for backward compatibility; prefer `*-nvocc` / `*-ops` IDs for new work.

## Core invariant (A-PACK-03)

Packs add types, links, rules, datasets, and UI panels. They **do not** redefine `Case`, `Signal`, or `Decision` tables.

## Fragmentation

See [`multi-sector-fragmentation-v1.md`](multi-sector-fragmentation-v1.md).

## Enablement

- Query: `?pack=healthcare-ops` (when loader wired in env)
- Env: `ONTOLOGY_DEFAULT_PACK` (documented in pack-framework)
