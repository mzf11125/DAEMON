# Digital twin v1 (read model)

Daemon treats a **digital twin** as a **read model** over ontology objects and analytics datasets — not a separate shadow database.

## Layers

1. **Semantic** — object types, links, actions (`ontology-service`).
2. **Analytics** — versioned `dataset_*` tables (ClickHouse) fed by pipelines.
3. **Files** — attachment plane (MinIO) for blobs/thumbnails.
4. **Presentation** — console map, grids, and case views consume the same APIs.

## Geo twin

- `Site` and `Asset` objects carry `latitude` / `longitude` in properties.
- `GET /v1/geo/map` aggregates tenant-scoped pins for console `/live`.
- Position updates flow: connector → ingest job → transform → ontology sync (CAP-03).

## State updates

Operational state changes go through **action types** or governed ingestion — not ad hoc SQL from UI or agents (agents PROPOSE; humans execute).

## Sector sandboxes

Each vertical `packId` under `ontology/v2/examples/packs/` can seed a minimal twin slice via `make seed-sandbox` for local developer simulation.

See [developer-sandbox-v1.md](../dx/developer-sandbox-v1.md).
