# Sandbox gate — logistics-express-cargo v1

**Owner:** vertical pack owner (placeholder)  
**Review:** platform engineering  
**Lifecycle gate:** G-EC-02 (seed/fixture), G-EC-03 (operational loop)

## Entry criteria

- `connectors/synthetic/logistics-express-cargo/manifest.json` present with `fixtureVersion` set
- Ontology pack at `ontology/v2/examples/packs/logistics-express-cargo/` with `catalogVersion` 2.0.1
- Seed function `seedExpressCargoSim` registered in `infra/seed/main.go`
- Gate packet (this file) and integration subtests registered before merge

## Exit criteria

- `make seed-sandbox` loads ≥1 `Site` with `properties->>'vertical' = 'logistics-express-cargo'`
- Open `Signal` `signal-logistics-express-cargo-001` present for tenant `tenant-demo`
- SLA scenario: `signal-express-sla-001` linked to `case-express-sla-001` via `case_signals`
- `go test -tags=integration ./tests/integration/ -run TestExpressCargoSim` — PASS
- `go test -tags=integration ./tests/integration/ -run TestExpressCargoRulesEvaluate` — PASS (6 express rules: SLA, routing anomaly, champion idle, z-score propensity, volume ec-sm-011, ML propensity)
- `./scripts/prove-express-cargo-sim.sh` — exit 0
- Traceability row in `docs/traceability/matrix-v1.md` for `logistics-express-cargo`
- Predictive Phase 2 complete per [predictive-roadmap-v1.md](../../analytics/predictive-roadmap-v1.md) and [predictive-cold-start-v1.md](../../analytics/predictive-cold-start-v1.md)

## FMEA-lite

| Failure mode | Effect | Mitigation |
|--------------|--------|------------|
| Missing tenant | Seed skipped; smoke fails | `tenant-demo` in seed; integration test fails closed |
| Fixture/registry drift | Wrong counts or missing pack | `scripts/check-sandbox-registry-drift.sh`; bump `fixtureVersion` |
| Junction drift | ShipmentLeg not linked to Manifest | Catalog link cardinality; seed neo4j links in `express_cargo_sim.go` |
| Silent SLA miss | Exception desk empty while legs late | `TestExpressCargoSim` asserts `case_signals` row |
| Geo flag off | Empty map for sector | `geoEnabled: true`; `TestSandboxGeoMapGeoEnabledPacks` |

## Evidence

| Artifact | Expected |
|----------|----------|
| Connector manifest | `connectors/synthetic/logistics-express-cargo/manifest.json` |
| Catalog | 41 objects, 5 junctions — `./scripts/check-express-cargo-catalog.sh` |
| Signal PK (sandbox) | `signal-logistics-express-cargo-001` |
| SLA signal / case | `signal-express-sla-001` → `case-express-sla-001` |
| Integration test | `TestExpressCargoSim`; `TestExpressCargoRulesEvaluate`; `TestSandboxSectorsSeeded/logistics-express-cargo` |
| Smoke | `prove-express-cargo-sim.sh` |
| Predictive rules | `make ontology-sync`; CH migrations 003–004; `make train-propensity-express` (optional) |

Geo-enabled: `/v1/geo/map` must return ≥1 feature when `geoMapEnabled=true`.

## Stop-the-line

Changing `connectors/synthetic/logistics-express-cargo/*` or `infra/seed/express_cargo_sim.go` without bumping `fixtureVersion`, updating this packet, and keeping integration tests green **blocks merge** (Tier 1).

Gate bypass requires documented waiver and re-run of G-EC-01..09 within 24h.

## Phase 2 gates (agents)

| Gate | Requirement | Evidence |
|------|-------------|----------|
| G-EC-07 | Intake proposes `CreateShipmentDraft` only; no execute | `express-cargo-intake-propose.json`; `propose_express_cargo_draft` MCP |
| G-EC-08 | Sales brief read-only; signal map ≥30 rows | `express-cargo-sales-brief.json`; `signals-map.yaml`; brief console route |
| G-EC-09 | Human approve required before stable draft RID | Console `/express-cargo/intake`; `TestExpressCargoHITL`; Go `CreateShipmentDraft` only after review |

Kill-switch: set `AIP_EXPRESS_CARGO_INTAKE_DISABLED=1` to disable intake propose tools in agent-service feature flags (documented in criticality doc).

## Related

- [logistics-express-cargo-criticality-v1.md](../logistics-express-cargo-criticality-v1.md) — Tier 0–3 register and G-EC catalog
- [logistics-express-cargo-assume-case-v1.md](../../ontology/logistics-express-cargo-assume-case-v1.md) — dual hierarchy narrative
