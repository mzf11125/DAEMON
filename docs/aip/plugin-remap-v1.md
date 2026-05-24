# Agent plugin remap v1 (merge track)

Documents how vendored `aip/agent-service` plugin slots map to DAEMON runtime. **P1:** bridge + read-only MCP. **P3:** verify each path in staging before production-agent claims.

| Concern | Vendored expectation | DAEMON implementation |
|---------|---------------------|------------------------|
| Ontology reads | SDK → ontology engine | HTTP bridge → Go `:8081` |
| Ontology writes | Engine mutations | Go `POST /v1/actions/*` only |
| Analytics | Plugin SQL / CH | `pipelines/raw-ingest` … `quality`; CH tables `daemon.dataset_*` |
| Monitoring | Plugin alert hooks | `services/rules-engine` `POST /v1/evaluate` |
| Case workflow | Agent tools | Go case + ontology actions |

Mutating MCP tools remain deferred: [mutating-mcp-defer-v1.md](./mutating-mcp-defer-v1.md).

Verification commands:

```bash
make agent-bridge-smoke
make aip-build && ./scripts/prove-aip-eval.sh
./scripts/prove-plugin-remap.sh
```

**P3 runtime proof:** `prove-plugin-remap.sh` runs `make ontology-sync` and `TestExpressCargoRulesEvaluate` (ClickHouse `dataset_observations` → rules-engine `POST /v1/evaluate` → ontology `Signal` rows with `provenanceRuleId`).

## Evidence log (update on each staging weekly)

| Date | Environment | `agent-bridge-smoke` | `prove-plugin-remap.sh` | Notes |
|------|-------------|----------------------|-------------------------|-------|
| 2026-05-23 | local | manual | local pass after ontology-sync | D0 baseline; staging URLs TBD Wave 2 |
