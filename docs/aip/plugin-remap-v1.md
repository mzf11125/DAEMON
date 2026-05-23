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
```
