# Build on DAEMON v1

## Core loop

1. Ingest observations (CSV, Dune/Sim, rules).
2. Materialize **Signal** ontology objects.
3. **OpenCase** with `signalIds` → `case_signals`.
4. **RecordDecision** + read **audit** via platform-api.

## Extension points

| Layer | How |
|-------|-----|
| Sector pack | Add `ontology/v2/examples/packs/{id}/manifest.json` |
| Rules | `services/rules-engine` + seed rules |
| Connectors | `services/ingestion-service` |
| UI | `apps/console-web` + `@daemon/sdk-ts` |
| Agents | MCP read tools; human gate on `OpenCase` |

## Multi-chain (v1)

Solana + EVM intelligence via configured connectors — see [blockchain/multi-chain-dapp-guide-v1.md](blockchain/multi-chain-dapp-guide-v1.md).
