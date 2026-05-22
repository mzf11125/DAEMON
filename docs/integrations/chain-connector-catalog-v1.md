# Chain connector catalog v1

| Connector | Chains | v1 status | Env |
|-----------|--------|-----------|-----|
| Dune Sim API | EVM + SVM | Active | `SIM_API_KEY` |
| Dune SQL | EVM (+ configured) | Active | `DUNE_API_KEY` |
| Helius enhanced tx | Solana | Optional | `HELIUS_API_KEY` |
| Chainalysis sanctions | EVM/SVM addresses | Public API | `CHAINALYSIS_API_KEY` |

## Usage in loop

1. Pipelines write normalized transfers/signals to ClickHouse.
2. Rules-engine evaluates → **Signal** in Postgres.
3. Investigator links signal to case; audit captures human decision.

## Not in v1

- Unified mempool monitoring product
- Automatic OpenCase from chain events (Automate analogue post–v1)

## Related

- [`docs/integrations/dune-connectors-v1.md`](dune-connectors-v1.md)
- [`docs/build-on-daemon-blockchain-v1.md`](../build-on-daemon-blockchain-v1.md)
