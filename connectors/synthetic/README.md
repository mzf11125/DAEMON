# Synthetic sector fixtures

Developer-local **replay-only** fixtures for the 22-pack sandbox. No live API calls; ingestion replays JSON under each `packId` folder.

## Layout

```text
connectors/synthetic/{packId}/
  manifest.json          # connector + sandbox metadata (packId, geoEnabled, fixtureVersion)
  fixtures/sample.json   # minimal object records for replay tests
```

Optional (future): `observations.csv`, `signals.csv` for ClickHouse replay.

## Data rules

- IDs: `syn.demo.*` or `ri.demo.*` only.
- Names clearly fictional; no real MMSI, PHI, or street addresses.
- Coordinates: open-ocean or demo grid unless a map exercise requires land pins.
- Runtime seeds authoritative objects in Postgres via `infra/seed/` — fixtures document the intended shape for connectors.

## Regenerate manifests and gate packets

```bash
./scripts/generate-sandbox-artifacts.sh
```

## Load all sectors

```bash
make seed-sandbox
```

See [docs/dx/developer-sandbox-v1.md](../../docs/dx/developer-sandbox-v1.md).
