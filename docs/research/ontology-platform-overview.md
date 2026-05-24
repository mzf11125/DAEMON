# Ontology platform overview

Research notes mapping enterprise data-platform concepts to Daemon. This is an internal glossary companion, not vendor documentation.

## Layers

1. **Data integration** — connectors, pipelines, datasets (`connectors/`, `pipelines/`, ClickHouse `dataset_*`)
2. **Ontology** — object/link/action/function definitions (`ontology/v2`, `interfaces/ontology`)
3. **Applications** — operator UI and SDK (`apps/console-web`, `packages/sdk-ts`)
4. **AIP** — agents, tools, eval harness stubs (`aip/`)

## Daemon mapping

| Concept | Location |
|---------|----------|
| Object type | `ontology/v2/object-types/*.json` |
| Link type | `ontology/v2/link-types/*.json` |
| Action | `ontology-service` `POST /v1/actions/{type}` |
| Dataset | ClickHouse tables + pipeline materialization |
| Rules | `ontology/v2/rules/*.json` + `rules-engine` |
| Lineage | `observability/lineage/event-schema.json` |

See [ontology-platform-overview.md](./ontology-platform-overview.md) for a longer narrative breakdown and [../operational-glossary.md](../operational-glossary.md) for term definitions.
