# Operational platform glossary v1

Neutral terms for Daemon docs and gate packets. See also [operational-glossary.md](../operational-glossary.md).

| Term | Meaning |
|------|---------|
| Ontology | Versioned object, link, action, and function definitions |
| Operational loop | Observation → Signal → Case → Action with audit |
| Dataset plane | ClickHouse tables materialized by pipelines |
| Attachment plane | Binary objects in object storage, linked to ontology resources |
| Geo read model | `Site`/`Asset` lat/lon exposed via `/v1/geo/map` |
| Pack | Sector vertical under `ontology/v2/examples/packs/{packId}` |
| Sandbox sector | One of 22 demo verticals seeded for local simulation |
| HITL | Human-in-the-loop approval before mutating actions |
| RLS | Postgres row-level security keyed by `tenant_id` |
| CAP-* | Capability pattern ID in traceability (no vendor names) |
