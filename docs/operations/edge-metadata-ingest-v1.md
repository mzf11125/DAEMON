# Edge metadata ingest v1

**Metadata-only** observation uplink pattern (AIS/IoT analog) — maps public Edge AI offering concepts to Daemon cloud ingest **without** edge runtime in repo.

## Pattern

1. Connector or demo script emits JSON positions/metrics (no raw video/audio in ClickHouse).
2. Pipeline writes bronze → silver `dataset_observations`.
3. Sync updates **Asset** lat/lon or **Observation** properties in Postgres.
4. Rules evaluate → **Signal**; `/live` map consumes geo-tagged objects.

## Demo

- `connectors/ais-demo/positions.json`
- `packages/pipeline-runner/ais_demo.go` — `ais-demo` connector
- `scripts/ais-position-ingest-demo.sh`

## Non-goals

- On-device inference, tactical edge deployment, air-gapped sync.

## Related

- P3 geo vertical plan (traffic loop detectors use same Observation shape)
