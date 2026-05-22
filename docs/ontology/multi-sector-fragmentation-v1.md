# Multi-sector fragmentation v1

## Problem

Enterprises run **many vendor systems per sector** (hospital EMR + lab + billing; NVOCC TMS + AIS + EDI; agency case systems + chain analytics). Fragmentation stays at the source; DAEMON **does not** force one global schema.

## Solution pattern

```text
Sources (heterogeneous) → connectors → medallion (CH) → ontology objects (PG)
                              ↓
                    tenant + RLS (isolation)
                              ↓
              core Signal / Case / Decision (same loop all sectors)
                              ↓
              sector pack (extra types, rules, panels only)
```

## Principles

| Principle | Implication |
|-----------|-------------|
| Unify at ontology bus | Shared object/link IDs and `backingDatasets` registration |
| Tenant = isolation boundary | Hospital group, NVOCC org, agency — not one shared customer row |
| Packs extend, never fork | No AML-only `Case` table (A-PACK-03) |
| Connectors per profile | `connectorProfiles[]` in pack manifest (doc/schema v1) |

## Sector pack IDs (manifest stubs)

| packId | Sector |
|--------|--------|
| `logistics-nvocc` | Logistics / NVOCC |
| `healthcare-ops` | Hospital operations |
| `government-ops` | Public sector |
| `web3-intel` | Web3 operations |
| `agri-food` | Agriculture / food chain |
| `banking-core` | Banking core (non-aml gate) |
| `finance-ledger` | Finance / ledger |
| `aml-fintech` | Reference example pack |

## W2 product choice

First **full** sector E2E after v1 is **product-selected** (e.g. logistics or healthcare), not aml-fintech gate (A-PACK-04).

## Related

- [`healthcare-ops-assume-case-v1.md`](healthcare-ops-assume-case-v1.md)
- [`vertical-packs.md`](vertical-packs.md)
- [`../lifecycle/pack-framework-v1.md`](../lifecycle/pack-framework-v1.md)
