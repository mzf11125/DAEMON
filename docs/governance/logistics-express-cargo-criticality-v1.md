# Logistics express-cargo — criticality & lifecycle v1

Consolidates mission-critical posture, verification gates, release governance, and lifecycle baselines for pack **`logistics-express-cargo`**. Operational sandbox entry/exit: [sandbox-gates/logistics-express-cargo-v1.md](./sandbox-gates/logistics-express-cargo-v1.md).

## Criticality register

| Component | Tier | Rationale | Sim target |
|-----------|------|-----------|------------|
| Tenant RLS + JWT binding | **0** | Cross-tenant leak = integrity failure | Fail-closed 401/403; geo negative test |
| Signal → Case → WorkOrder loop | **0** | Core operational proof | `TestExpressCargoSim`, `prove-express-cargo-sim.sh` |
| Rules engine → Signal | **1** | Drives exception desk | Idempotent signals; rule JSON in `ontology/v2/rules/express-*.json` |
| Synthetic ingest + seed | **1** | Wrong fixture = invalid sim | `fixtureVersion` in connector manifest |
| Ontology catalog | **1** | 41-object contract | `check-express-cargo-catalog.sh` (G-EC-01) |
| Geo map + attachments | **2** | Enhances sim; loop works without map | Degraded: cases/signals still provable |
| Console monitor/detail | **2** | Read-only over seed/API | Tier 2 until stable read API |
| TP / allocation stubs | **3** | Read-only finance narrative | `stub: true`; actions return 501 |

**Continuity (local sim):** RTO = re-run `make bootstrap-integration-local` + seed (< 30 min); RPO = full fixture replay.

## Verification gates (G-EC)

| Gate | Hold point | Evidence | Fail mode |
|------|------------|----------|-----------|
| G-EC-01 | Pre-merge catalog | 41 objects, 5 junctions; `check-express-cargo-catalog.sh` | Block merge |
| G-EC-02 | Pre-merge seed | `fixtureVersion` matches gate; integration seed rows | Block merge |
| G-EC-03 | Operational loop | SLA signal → `case_signals` | Block merge |
| G-EC-04 | Tenancy | Cross-tenant geo negative (`TestExpressCargoCrossTenantGeoEmpty`) | Block merge (Tier 0) |
| G-EC-05 | Vendor-neutral | `check-vendor-neutral-language.sh` | Block merge |
| G-EC-06 | AIP safety | `make aip-eval` when eval harness touched | Block merge |
| G-EC-07 | Intake HITL | `express-cargo-intake-propose.json`; MCP propose only | Block merge |
| G-EC-08 | Sales brief read-only | `express-cargo-sales-brief.json`; no `propose_action` / execute | Block merge |

## Agent kill-switch

Set `AIP_EXPRESS_CARGO_INTAKE_DISABLED=1` in agent-service / MCP runtime to disable `extract_express_cargo_intake` and `propose_express_cargo_draft` (intake path only). Sales brief (`generate_express_cargo_sales_brief`) remains available unless `AIP_EXPRESS_CARGO_SALES_DISABLED=1`.

## Fail-closed behaviors

- Rules evaluation errors → **no** new Signal (no fail-open monitor-only path).
- Missing/invalid JWT → 401; wrong tenant → empty geo or 403.
- Finance stubs expose `stub: true`; `AllocateVendorCost` action marked `returns501`.

## Release governance matrix

| Change type | Tier | Gates | Hold |
|-------------|------|-------|------|
| Catalog YAML only | 1 | G-EC-01, validate-ontology | Standard review |
| Seed/fixture | 1 | G-EC-02, fixtureVersion bump, gate doc | Gate owner sign-off |
| Rules / signals | 0–1 | G-EC-03, prove script | Stop-the-line if provenance breaks |
| RLS / auth / migration | 0 | Full integration + OIDC RLS checklist | **Hold** until green |
| Console + read API | 2 | Monitor/detail smoke | Product + eng review |

Emergency bypass: revert PRs only; cite ticket; re-run gates within 24h.

## Stop-the-line triggers

1. RLS or cross-tenant integration failure  
2. `prove-operational-loop` or `prove-express-cargo-sim` regression on main-equivalent branch  
3. Gate bypass without waiver when pack/seed/rules/auth touched  
4. Confidential trademark in public artifact (NDA guardrail)

## Lifecycle phases

| Phase | Exit gate | Baseline |
|-------|-----------|----------|
| Concept | Neutral term map (private) | External derivation note only |
| Design | G-EC-01 | `catalog/*.yaml`, `catalogVersion` |
| Build | G-EC-02 | `fixtureVersion`, `express_cargo_sim.go` |
| Verify | G-EC-03..08 | Integration tests + prove scripts + AIP eval cases |
| Operate | Sandbox gate signed | Gate packet v1, matrix row |
| Sustain | Quarterly catalog diff | Changelog in gate packet |
| Retire | Migration note | `status: deprecated` in pack manifest |

## Configuration baselines

Pinned in `ontology/v2/examples/packs/logistics-express-cargo/manifest.json`:

- `catalogVersion`: 2.0.1  
- `fixtureVersion`: 1  
- `sourceMasterRef`: `express-master-v2.0.1` (generic; no counterparty name)

Approved change = version bump + gate packet + traceability matrix sync (same PR or within 48h).

## Prevention metrics

Track in release notes: defect escape (sim bugs post-merge), repeat signal-path failures, gate bypass count, prove-script near-misses.

## Traceability

See [matrix-v1.md](../traceability/matrix-v1.md) — express-cargo rows with `criticalityTier` and `lifecycleGate` columns.
