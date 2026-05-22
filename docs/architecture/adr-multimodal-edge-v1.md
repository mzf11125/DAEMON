# ADR: Multimodal edge roadmap v1

## Status

Proposed — not implemented in sprint.

## Context

Future connectors may ingest MQTT telemetry, images, or audio at edge. Current path is CSV seed only.

## Decision

Defer multimodal ingestion. Document extension points:

- `ingestion_jobs.connector` enum may add `mqtt-telemetry` later.
- Bronze table remains observation-shaped; media blobs → object storage (phase 2).

## Consequences

No edge runtime in repo v1. Align with `schema-migration-002` job indexes when adding connectors.
