# Sandbox gate — traffic-engineering v1

**Owner:** vertical pack owner (placeholder)  
**Review:** platform engineering

## Entry criteria

- `connectors/synthetic/traffic-engineering/manifest.json` present with `fixtureVersion` set
- Ontology pack at `ontology/v2/examples/packs/traffic-engineering/`
- Seed function registered in `infra/seed/synthetic_sectors.go` or `infra/seed/p3_verticals.go`
- Gate packet (this file) and integration subtest registered before merge

## Exit criteria

- `make seed-sandbox` loads ≥1 `Site` with `properties->>'vertical' = 'traffic-engineering'`
- Open `Signal` `signal-traffic-001` present for tenant `tenant-demo`
- `go test -tags=integration ./tests/integration/ -run TestSandboxSectorsSeeded/traffic-engineering` — PASS
- `./scripts/prove-sandbox-sectors.sh` — exit 0
- `./scripts/prove-traffic-engineering.sh` — exit 0 (focused pack prove)
- Traceability row in `docs/traceability/matrix-v1.md` for `traffic-engineering`

## FMEA-lite

| Failure mode | Effect | Mitigation |
|--------------|--------|------------|
| Missing tenant | Seed skipped; smoke fails | `tenant-demo` in seed; integration test fails closed |
| Fixture/registry drift | Wrong counts or missing pack | `scripts/check-sandbox-registry-drift.sh`; bump `fixtureVersion` in manifest |
| Geo flag off (geo packs) | Empty map for sector | Tenant `geoMapEnabled`; `TestSandboxGeoMapGeoEnabledPacks` |

## Evidence

| Artifact | Expected |
|----------|----------|
| Connector manifest | `connectors/synthetic/traffic-engineering/manifest.json` |
| Signal PK | `signal-traffic-001` |
| Integration test | `TestSandboxSectorsSeeded/traffic-engineering` |
| Smoke | `prove-sandbox-sectors.sh` line for `traffic-engineering` |

Geo-enabled: `/v1/geo/map` must return ≥1 feature when `geoMapEnabled=true`.

## Stop-the-line

Changing `connectors/synthetic/traffic-engineering/*` without bumping `fixtureVersion`, updating this packet, and keeping the integration test table in sync **blocks merge** (Tier 1).
