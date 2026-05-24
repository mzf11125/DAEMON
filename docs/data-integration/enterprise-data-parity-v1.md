# Enterprise data integration parity v1

Maps common **enterprise data platform** integration patterns to Daemon modules. Neutral capability framing — no vendor product names.

| Pattern | Daemon implementation | Proof |
|---------|------------------------|-------|
| Connector catalog | `connectors/*` manifests + ingestion jobs | connector integration tests |
| Medallion datasets | ClickHouse `dataset_*` + pipeline transforms | `make pipeline-all` |
| Lineage events | `observability/lineage/event-schema.json` | pipeline metadata |
| Ontology-backed entities | Postgres `ontology_objects` + Neo4j links | seed + operational loop |
| Rules on datasets | `rules-engine` + RenderSQL | `rules_test.go` |
| Synthetic sandbox replay | `connectors/synthetic/{packId}` | `prove-sandbox-sectors.sh` |

See [overview.md](./overview.md), [connectors.md](./connectors.md), and [../research/capability-pattern-index-v1.md](../research/capability-pattern-index-v1.md).
