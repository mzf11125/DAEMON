# Sandbox gate — banking-core v1

**Owner:** vertical pack owner (placeholder)  
**Review:** platform engineering

## Entry criteria

- `connectors/synthetic/banking-core/manifest.json` present with `fixtureVersion` set
- Ontology pack at `ontology/v2/examples/packs/banking-core/`
- Seed function registered in `infra/seed/synthetic_sectors.go` or `infra/seed/p3_verticals.go`
- Gate packet (this file) and integration subtest registered before merge

## Exit criteria

- `make seed-sandbox` loads ≥1 `Site` with `properties->>'vertical' = 'banking-core'`
- Open `Signal` `signal-bank-001` present for tenant `tenant-demo`
- `go test -tags=integration ./tests/integration/ -run TestSandboxSectorsSeeded/banking-core` — PASS
- `./scripts/prove-sandbox-sectors.sh` — exit 0
- Traceability row in `docs/traceability/matrix-v1.md` for `banking-core`

## FMEA-lite

| Failure mode | Effect | Mitigation |
|--------------|--------|------------|
| Missing tenant | Seed skipped; smoke fails | `tenant-demo` in seed; integration test fails closed |
| Fixture/registry drift | Wrong counts or missing pack | `scripts/check-sandbox-registry-drift.sh`; bump `fixtureVersion` in manifest |
| Geo flag off (geo packs) | Empty map for sector | Tenant `geoMapEnabled`; `TestSandboxGeoMapGeoEnabledPacks` |

## Evidence

| Artifact | Expected |
|----------|----------|
| Connector manifest | `connectors/synthetic/banking-core/manifest.json` |
| Signal PK | `signal-bank-001` |
| Integration test | `TestSandboxSectorsSeeded/banking-core` |
| Smoke | `prove-sandbox-sectors.sh` line for `banking-core` |

Non-geo pack: Site rows seeded; map pins optional.

## Stop-the-line

Changing `connectors/synthetic/banking-core/*` without bumping `fixtureVersion`, updating this packet, and keeping the integration test table in sync **blocks merge** (Tier 1).
