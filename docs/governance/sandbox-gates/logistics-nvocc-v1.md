# Sandbox gate — logistics-nvocc v1

**Owner:** vertical pack owner (placeholder)  
**Review:** platform engineering

## Entry criteria

- `connectors/synthetic/logistics-nvocc/manifest.json` present with `fixtureVersion` set
- Ontology pack at `ontology/v2/examples/packs/logistics-nvocc/`
- Seed function registered in `infra/seed/synthetic_sectors.go` or `infra/seed/p3_verticals.go`
- Gate packet (this file) and integration subtest registered before merge

## Exit criteria

- `make seed-sandbox` loads ≥1 `Site` with `properties->>'vertical' = 'logistics-nvocc'`
- Open `Signal` `signal-logistics-001` present for tenant `tenant-demo`
- `go test -tags=integration ./tests/integration/ -run TestSandboxSectorsSeeded/logistics-nvocc` — PASS
- `./scripts/prove-sandbox-sectors.sh` — exit 0
- `./scripts/prove-logistics-nvocc.sh` — exit 0 (focused pack prove)
- Traceability row in `docs/traceability/matrix-v1.md` for `logistics-nvocc`

## FMEA-lite

| Failure mode | Effect | Mitigation |
|--------------|--------|------------|
| Missing tenant | Seed skipped; smoke fails | `tenant-demo` in seed; integration test fails closed |
| Fixture/registry drift | Wrong counts or missing pack | `scripts/check-sandbox-registry-drift.sh`; bump `fixtureVersion` in manifest |
| Geo flag off (geo packs) | Empty map for sector | Tenant `geoMapEnabled`; `TestSandboxGeoMapGeoEnabledPacks` |

## Evidence

| Artifact | Expected |
|----------|----------|
| Connector manifest | `connectors/synthetic/logistics-nvocc/manifest.json` |
| Signal PK | `signal-logistics-001` |
| Integration test | `TestSandboxSectorsSeeded/logistics-nvocc` |
| Smoke | `prove-sandbox-sectors.sh` line for `logistics-nvocc` |

Geo-enabled: `/v1/geo/map` must return ≥1 feature when `geoMapEnabled=true`.

## Stop-the-line

Changing `connectors/synthetic/logistics-nvocc/*` without bumping `fixtureVersion`, updating this packet, and keeping the integration test table in sync **blocks merge** (Tier 1).
