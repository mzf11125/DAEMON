# Range MCP investigation playbook v1

Read-only wallet investigation using Range AI MCP tools — Layer A/B/C separation for web3-intel assume-case.

## Layers

| Layer | Source | Daemon mapping |
|-------|--------|----------------|
| A | Range MCP (risk, sanctions, transfers) | Agent tools; results summarized in Case narrative |
| B | Dune / warehouse queries | `dataset_observations` + rules → **Signal** |
| C | Ontology mutations | **Forbidden** in readonly eval; HITL for `OpenCase` |

## Playbook steps

1. Screen address (`range_screen_address` / OFAC check).
2. Pull recent transfers and counterparties.
3. If severity warrants, cite existing **Signal** or propose **OpenCase** (HITL).
4. Attach investigation export PDF via `/v1/attachments` when attachments enabled.

## Eval

- `aip/evals/cases/web3-investigation.json` — `investigate-wallet-readonly`

## Related

- [`../ontology/web3-intel-assume-case-v1.md`](../ontology/web3-intel-assume-case-v1.md)
- [`../ontology/aml-fintech-assume-case-v1.md`](../ontology/aml-fintech-assume-case-v1.md)
