# Glossary

Daemon maps operational-intelligence concepts to this monorepo. Terms are descriptive, not vendor trademarks.

| Term | Meaning in Daemon |
|------|-------------------|
| Dataset | Versioned analytical table in ClickHouse (`dataset_*`), produced by pipelines |
| Object type | Semantic entity schema under `ontology/v2/object-types/` |
| Link type | Relationship schema under `ontology/v2/link-types/` |
| Interface | Shared property contract under `interfaces/ontology/` |
| Action type | Governed mutation invoked via `POST /v1/actions/{actionType}` |
| Function | Pure logic referenced in rules and `@daemon/ontology-functions` |
| Signal | Operational alert object, often created by `rules-engine` |
| Case | Investigation container in Postgres + ontology `Case` objects |
| Pipeline | Go CLI under `pipelines/*` (raw-ingest → transforms → features → quality) |
| MMDP | Multimodal data plane roadmap (`docs/data-integration/mmdp-roadmap.md`) |
| AIP | Agent layer stubs under `aip/` (agents, tools, evals) |
