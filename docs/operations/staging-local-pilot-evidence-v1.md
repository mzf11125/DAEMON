# Staging local pilot evidence v1 (pre–non-localhost)

**Purpose:** Document reproducible smoke chain while Phase 1 staging hostnames (P0.3) are pending. Satisfies Track A3 **pre-staging** proof; replace with non-localhost transcripts in [oidc-rls-verification-v1.md](./oidc-rls-verification-v1.md) when URLs exist.

## Environment

| Variable | Local pilot value |
|----------|-------------------|
| `PLATFORM_API_URL` | `http://localhost:8080` |
| `ONTOLOGY_SERVICE_URL` | `http://localhost:8081` |
| `RULES_ENGINE_URL` | `http://localhost:8083` |
| `OIDC_REQUIRED` | `false` (local); staging target `true` |

## Smoke chain (items 1–7)

| # | Step | Command | Last verified |
|---|------|---------|---------------|
| 1 | Health | `curl -sf localhost:8080/health` (platform, ontology, rules) | 2026-05-25 |
| 2 | E2E smoke | `./scripts/e2e-smoke.sh` | via `prove-staging-smoke.sh` |
| 3 | E2E full | `E2E_FULL=1 ./scripts/e2e-smoke.sh` | via `prove-staging-smoke.sh` |
| 4 | Operational loop | `./scripts/prove-operational-loop.sh` | 2026-05-25 |
| 5 | AIP eval | `./scripts/prove-aip-eval.sh` | when aip stack up |
| 6 | Agent bridge | `./scripts/smoke-agent-bridge.sh` | merge-track profile |
| 7 | Express + plugin | `prove-express-cargo-sim.sh`; `prove-plugin-remap.sh` | 2026-05-25 |

**Single script:** `make prove-staging-smoke` (defaults to localhost URLs).

## OIDC pilot (local)

| Check | Local | Staging (required for A3 exit) |
|-------|-------|------------------------------|
| JWT tenant claim | `verify-auth-migration.sh` | Repeat against staging Auth URL |
| RLS negative | `go test -tags=integration -run TestRLSTenantIsolation` | Same against staging `DATABASE_URL` |
| No `X-Tenant-Id` in prod | N/A locally | Document curl without header → 401 |

## Blockers for A3 full exit

1. Provision staging URLs (P0.3).
2. Fill hostname rows in [oidc-rls-verification-v1.md](./oidc-rls-verification-v1.md).
3. Re-run `prove-staging-smoke` with exported staging URLs and paste transcripts.

## Related

- [staging-deploy-v1.md](./staging-deploy-v1.md)
- [p1-staging-pilot-closeout-v1.md](./p1-staging-pilot-closeout-v1.md)
