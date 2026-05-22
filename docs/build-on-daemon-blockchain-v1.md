# Build on DAEMON — blockchain v1

Multi-chain **intelligence** feeds the **same** operational loop; on-chain contracts are not the system of record for Case/Decision.

## Layers

| Layer | DAEMON | Chain |
|-------|--------|-------|
| Settlement / DeFi | Optional dApp | Smart contracts |
| Investigation | Signal → Case → Decision | Address/tx as **Signal** metadata |
| Ingestion | Dune/Sim pipelines | Solana + EVM v1 (A-CHAIN-03) |

## Developer flow

1. Ingest via `sim-dune` / `dune-sql` pipelines → ClickHouse silver.
2. Rules materialize **Signal** rows (generic operational seed in v1).
3. OpenCase with `signalIds` preserving on-chain provenance in `case_signals`.
4. Use MCP `investigate_case` read-only; human OpenCase in console.

## Unify at ontology

- `chainId` + address/tx identifiers in signal payload — not one RPC-only workflow.
- See [`integrations/chain-connector-catalog-v1.md`](integrations/chain-connector-catalog-v1.md).

## Related

- [`blockchain/multi-chain-dapp-guide-v1.md`](blockchain/multi-chain-dapp-guide-v1.md)
- [`build-on-daemon-v1.md`](build-on-daemon-v1.md)
