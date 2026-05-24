# Traceability matrix v1 (sample)

| Requirement | Implementation | Test / evidence |
|-------------|----------------|-----------------|
| Tenant-scoped rules | `RenderSQL` + tenant filter | `rules_test.go` |
| SELECT-only rules | `ValidateSQL` | validate-ontology.sh |
| Analyst OpenCase | `AuthorizeAction` | `auth_test.go` |
| Read-only agent eval | forbidden tools in case | `aip/evals/cases/` |
| Ingestion observability | job status in console | e2e-smoke E2E_FULL |
| L3 operational loop | OpenCase → RecordDecision → audit | [operational-proof-l3-v1.md](./operational-proof-l3-v1.md); `prove-operational-loop.sh` |
| Merge-track agent bridge | `AGENT_DAEMON_BRIDGE` → :8081 | `smoke-agent-bridge.sh`; compose profile `merge-track` |
| Control-plane tenant registry | D-TENANT-01 seed | `seed-control-plane-demo-tenant.sh` |
| External chain data ingest | `sim-dune`, `dune-sql` connectors; `packages/dune-ingest` | `ingestparams` tests; `ingestion_dune_params_test` |
| Dune agent tooling (Layer A) | `docs/integrations/dune-agent-tooling-v1.md`, `dune-docs-index.md` | `make dune-dev-setup`; `scripts/dune-smoke-cli.sh` (manual) |
| Local IdP = Supabase Auth | `@supabase/ssr`, `custom_access_token_hook` | console sign-in; RSC loads without manual refresh |
| JWT fail-closed | `auth.Middleware`, `OIDC_REQUIRED` | missing/invalid Bearer → 401; `verify-auth-migration.sh` |
| Tenant in token | hook + `jwt_tenant_id()` RLS | rules evaluate; RLS policy SQL |
| Tenant isolation on API path | `db.WithRLSTx` / `ExecRLS` + policies | `rls_tenant_isolation_test.go` |
| No service role in runtime | `DATABASE_URL` = `daemon_runtime`; `SEED_DATABASE_URL` separate | `verify-auth-migration.sh` |
| Role-gated actions | `AuthorizeAction` | `auth_test.go` |
| No Keycloak on default path | compose without `legacy-keycloak` | `make up`; platform-check `:54331` |
| Seed identity alignment | `SUPABASE_DEMO_USER_ID` | `/v1/me` `sub` matches Auth user |
| Geo map read model | `GET /v1/geo/map`; tenant `geoMapEnabled` | `p3_geo_attachments_test.go`; `prove-p3-geo.sh` |
| Attachment plane | MinIO + `POST/GET /v1/attachments` | `p3_geo_attachments_test.go`; `role=thumbnail` |
| Vendor-neutral public docs | `check-vendor-neutral-language.sh` | CI `validate` job |
| Sandbox registry drift | `check-sandbox-registry-drift.sh` | CI `validate` job |

## Sandbox sectors (23 × packId)

| packId | Fixture | Seed | Integration test | Gate packet |
|--------|---------|------|------------------|-------------|
| traffic-engineering | `connectors/synthetic/traffic-engineering/` | `p3_verticals.go` | `TestSandboxSectorsSeeded/traffic-engineering` | [traffic-engineering-v1.md](../governance/sandbox-gates/traffic-engineering-v1.md) |
| healthcare-ops | `connectors/synthetic/healthcare-ops/` | `p3_verticals.go` | `TestSandboxSectorsSeeded/healthcare-ops` | [healthcare-ops-v1.md](../governance/sandbox-gates/healthcare-ops-v1.md) |
| logistics-nvocc | `connectors/synthetic/logistics-nvocc/` | `p3_verticals.go` + ais-demo | `TestSandboxSectorsSeeded/logistics-nvocc` | [logistics-nvocc-v1.md](../governance/sandbox-gates/logistics-nvocc-v1.md) |
| humanitarian-logistics | `connectors/synthetic/humanitarian-logistics/` | `p3_verticals.go` | `TestSandboxSectorsSeeded/humanitarian-logistics` | [humanitarian-logistics-v1.md](../governance/sandbox-gates/humanitarian-logistics-v1.md) |
| public-health | `connectors/synthetic/public-health/` | `p3_verticals.go` | `TestSandboxSectorsSeeded/public-health` | [public-health-v1.md](../governance/sandbox-gates/public-health-v1.md) |
| manufacturing-ops | `connectors/synthetic/manufacturing-ops/` | `p3_verticals.go` | `TestSandboxSectorsSeeded/manufacturing-ops` | [manufacturing-ops-v1.md](../governance/sandbox-gates/manufacturing-ops-v1.md) |
| intelligence-ops | `connectors/synthetic/intelligence-ops/` | `synthetic_sectors.go` | `TestSandboxSectorsSeeded/intelligence-ops` | [intelligence-ops-v1.md](../governance/sandbox-gates/intelligence-ops-v1.md) |
| finance-risk | `connectors/synthetic/finance-risk/` | `synthetic_sectors.go` | `TestSandboxSectorsSeeded/finance-risk` | [finance-risk-v1.md](../governance/sandbox-gates/finance-risk-v1.md) |
| life-sciences-ops | `connectors/synthetic/life-sciences-ops/` | `synthetic_sectors.go` | `TestSandboxSectorsSeeded/life-sciences-ops` | [life-sciences-ops-v1.md](../governance/sandbox-gates/life-sciences-ops-v1.md) |
| aml-fintech | `connectors/synthetic/aml-fintech/` | `synthetic_sectors.go` | `TestSandboxSectorsSeeded/aml-fintech` | [aml-fintech-v1.md](../governance/sandbox-gates/aml-fintech-v1.md) |
| web3-intel | `connectors/synthetic/web3-intel/` | `synthetic_sectors.go` | `TestSandboxSectorsSeeded/web3-intel` | [web3-intel-v1.md](../governance/sandbox-gates/web3-intel-v1.md) |
| banking-core | `connectors/synthetic/banking-core/` | `synthetic_sectors.go` | `TestSandboxSectorsSeeded/banking-core` | [banking-core-v1.md](../governance/sandbox-gates/banking-core-v1.md) |
| federal-health | `connectors/synthetic/federal-health/` | `synthetic_sectors.go` | `TestSandboxSectorsSeeded/federal-health` | [federal-health-v1.md](../governance/sandbox-gates/federal-health-v1.md) |
| government-finance | `connectors/synthetic/government-finance/` | `synthetic_sectors.go` | `TestSandboxSectorsSeeded/government-finance` | [government-finance-v1.md](../governance/sandbox-gates/government-finance-v1.md) |
| agri-food | `connectors/synthetic/agri-food/` | `synthetic_sectors.go` | `TestSandboxSectorsSeeded/agri-food` | [agri-food-v1.md](../governance/sandbox-gates/agri-food-v1.md) |
| insurance | `connectors/synthetic/insurance/` | `synthetic_sectors.go` | `TestSandboxSectorsSeeded/insurance` | [insurance-v1.md](../governance/sandbox-gates/insurance-v1.md) |
| energy-utilities | `connectors/synthetic/energy-utilities/` | `synthetic_sectors.go` | `TestSandboxSectorsSeeded/energy-utilities` | [energy-utilities-v1.md](../governance/sandbox-gates/energy-utilities-v1.md) |
| retail-ops | `connectors/synthetic/retail-ops/` | `synthetic_sectors.go` | `TestSandboxSectorsSeeded/retail-ops` | [retail-ops-v1.md](../governance/sandbox-gates/retail-ops-v1.md) |
| rail-network | `connectors/synthetic/rail-network/` | `synthetic_sectors.go` | `TestSandboxSectorsSeeded/rail-network` | [rail-network-v1.md](../governance/sandbox-gates/rail-network-v1.md) |
| telecom-ops | `connectors/synthetic/telecom-ops/` | `synthetic_sectors.go` | `TestSandboxSectorsSeeded/telecom-ops` | [telecom-ops-v1.md](../governance/sandbox-gates/telecom-ops-v1.md) |
| construction-ops | `connectors/synthetic/construction-ops/` | `synthetic_sectors.go` | `TestSandboxSectorsSeeded/construction-ops` | [construction-ops-v1.md](../governance/sandbox-gates/construction-ops-v1.md) |
| mission-tasking | `connectors/synthetic/mission-tasking/` | `synthetic_sectors.go` (proximity WO) | `TestSandboxSectorsSeeded/mission-tasking`; `TestMissionTaskingProximityAssets` | [mission-tasking-v1.md](../governance/sandbox-gates/mission-tasking-v1.md) |
| logistics-express-cargo | `connectors/synthetic/logistics-express-cargo/` | `express_cargo_sim.go` | `TestExpressCargoSim`; `TestSandboxSectorsSeeded/logistics-express-cargo` | [logistics-express-cargo-v1.md](../governance/sandbox-gates/logistics-express-cargo-v1.md) |

## Express-cargo requirements (logistics-express-cargo)

| Requirement | Design | Implementation | Verification | criticalityTier | lifecycleGate |
|-------------|--------|----------------|--------------|-----------------|---------------|
| 41-object catalog contract | `catalog/objects.yaml` | pack manifest `catalogVersion: 2.0.1` | `check-express-cargo-catalog.sh`; ontology-language test | 1 | G-EC-01 |
| Dual hierarchy seed | `catalog/links.yaml` junctions | `infra/seed/express_cargo_sim.go` | `TestExpressCargoSim` (shipments, legs) | 1 | G-EC-02 |
| SLA signal → case loop | `express-leg-sla-breach.json` | seed `case-express-sla-001` + `case_signals` | `TestExpressCargoSim` | 0 | G-EC-03 |
| Tenancy isolation | RLS + JWT | platform-api geo | `TestExpressCargoCrossTenantGeoEmpty` | 0 | G-EC-04 |
| Vendor-neutral public artifacts | gate + assume-case docs | `check-vendor-neutral-language.sh` | CI validate job | 1 | G-EC-05 |
| AIP propose-only triage | `aip/evals/cases/express-cargo-triage.json` | triage-analyst agent | `make aip-eval` when harness touched | 2 | G-EC-06 |
| Document intake HITL | `aip/evals/cases/express-cargo-intake-propose.json` | MCP intake tools | `make aip-eval` | 2 | G-EC-07 |
| Sales brief read-only | `aip/evals/cases/express-cargo-sales-brief.json` | MCP sales brief | `make aip-eval` | 2 | G-EC-08 |
| Cross-domain signal map | `catalog/signals-map.yaml` | signal-map doc v0.1 | manual review | 2 | G-EC-08 |
| Console HITL intake → draft | `bast-sim-001` fixture | `packages/sdk-ts` + `/express-cargo/intake` | `TestExpressCargoHITL` | 1 | G-EC-09 |
| Rules-engine express signals | `ontology/v3/rules/express-*.json` | CH `dataset_observations` labels | `TestExpressCargoRulesEvaluate` | 1 | G-EC-03 |
| Action proposals (Postgres) | `008_action_proposals.sql` | `POST/GET/PATCH /v1/action-proposals` | platform-api build; intake HITL path | 1 | G-EC-10 |
| Horizontal pack prove (traffic) | `prove-traffic-engineering.sh` | `TestSandboxSectorsSeeded/traffic-engineering` | `make prove-traffic-engineering` | 2 | — |
| Horizontal pack prove (nvocc) | `prove-logistics-nvocc.sh` | `TestSandboxSectorsSeeded/logistics-nvocc` | `make prove-logistics-nvocc` | 2 | — |

## Proof ladder (L0–L4)

| Level | Command | Evidence location |
|-------|---------|-------------------|
| L0 | `make test` | CI `validate` / unit jobs |
| L1 | `./scripts/e2e-smoke.sh` | JWT from `supabase status`; console + API health |
| L2 | `E2E_FULL=1 ./scripts/e2e-smoke.sh` | CI `e2e-full` job |
| L3 | `./scripts/prove-operational-loop.sh` | [operational-proof-l3-v1.md](./operational-proof-l3-v1.md) |
| L4 | `make up-merge-track` + `./scripts/smoke-agent-bridge.sh` + `./scripts/prove-plugin-remap.sh` | [merge-track-runbook-v1.md](../operations/merge-track-runbook-v1.md); [plugin-remap-v1.md](../aip/plugin-remap-v1.md) |

Last verified locally: 2026-05-23 (`prove-express-cargo-sim`, `make aip-eval` 8/8 after `ensure-aip-eval-stack.sh`).

## Operational patterns (CAP-*)

| CAP ID | Implementation | Test / evidence |
|--------|----------------|-----------------|
| CAP-OBJECT-STORE | MinIO + attachment metadata | `TestAttachmentsHTTP`; `prove-p3-geo.sh` |
| CAP-OBJECT-CLI | `POST/GET /v1/attachments*`; `role=thumbnail` | `TestAttachmentsHTTP`; console case + LiveMap sidebar |
| CAP-ENTITY-MAP | `GET /v1/geo/map`; console `/live` | `TestGeoMapHTTP`; `TestSandboxGeoMapGeoEnabledPacks` |
| CAP-POSITION-INGEST | ingestion jobs + sim/AIS connectors | ingestion integration; geo sandbox seeds |
| CAP-PROXIMITY-TASKING | `mission-tasking` WorkOrder + assets | `TestMissionTaskingProximityAssets`; [mission-tasking-assume-case-v1.md](../ontology/mission-tasking-assume-case-v1.md) |

Expand per release when adding object types or MCP tools.
