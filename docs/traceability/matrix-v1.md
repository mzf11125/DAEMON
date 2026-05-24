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
| Sandbox 22 sectors | `seedP3Verticals` + `seedSyntheticSectors` | `sandbox_sectors_test.go`; `prove-sandbox-sectors.sh` |
| CAP-MAP-01 entity map | console `/live`, sdk `geoMap` | Partial — see [operational-sample-apps-parity-v1.md](./operational-sample-apps-parity-v1.md), [operational-pattern-parity-v1.md](./operational-pattern-parity-v1.md) |
| CAP-FILE-01 objects CLI | attachment service | Implemented |
| CAP-THUMB-01 thumbnail | `role=thumbnail` on Case | Partial — case page upload |
| CAP-RECON-01 proximity task | `mission-tasking` pack + WorkOrder seed | Partial — [mission-tasking-assume-case-v1.md](../ontology/mission-tasking-assume-case-v1.md) |
| Vendor-neutral public docs | `check-vendor-neutral-language.sh` | CI `validate` job |

Expand per release when adding object types or MCP tools.
