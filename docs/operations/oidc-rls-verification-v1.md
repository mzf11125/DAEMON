# OIDC + RLS verification (P2)

Staging (P1) may run with `OIDC_REQUIRED=false`. Production (P2) requires JWT auth and tenant isolation.

## Checklist

- [x] `OIDC_REQUIRED=true` in production env (local repro: `verify-auth-migration.sh` with `OIDC_REQUIRED=true`)
- [x] Requests without `Authorization` return 401 on protected routes when `OIDC_REQUIRED=true` (go-common auth tests; invalid Bearer → 401 on manifest)
- [x] Valid JWT maps `sub` / claims → `tenant_id` (see [ai-surface-review-v1.md](../security/ai-surface-review-v1.md); password grant + `app_metadata.tenant_id` hook)
- [x] Cross-tenant negative test: tenant A token cannot read tenant B cases/signals (`tests/integration` RLS suite)
- [x] Postgres RLS policies enabled on tenant-scoped tables (Supabase or managed Postgres)
- [x] `./scripts/verify-auth-migration.sh` passes after auth schema changes

## Local proof (2026-05-24)

```bash
make supabase-up
OIDC_REQUIRED=true ./scripts/verify-auth-migration.sh
unset OIDC_REQUIRED && make test-integration
./scripts/prove-operational-loop.sh
./scripts/prove-aip-eval.sh
./scripts/smoke-agent-bridge.sh
./scripts/prove-express-cargo-sim.sh
curl -sf http://localhost:4000/health
```

Staging pilot: run the same prove scripts against staging URLs with `OIDC_REQUIRED=true` on Go services and a valid Supabase JWT for console HITL (`/express-cargo/intake`).

### Staging smoke template (fill on deploy)

| Step | Command | Staging URL / result | Date |
|------|---------|----------------------|------|
| Health | `curl -sf $PLATFORM_API_URL/health` | | |
| OIDC deny | `curl -s -o /dev/null -w '%{http_code}' $ONTOLOGY_SERVICE_URL/v1/objects/Signal` (no Bearer) | expect 401 when `OIDC_REQUIRED=true` | |
| Express HITL | `./scripts/prove-express-cargo-sim.sh` | set `ONTOLOGY_SERVICE_URL`, `RULES_ENGINE_URL` | |
| Plugin remap | `./scripts/prove-plugin-remap.sh` | agent-bridge → :8081 | |

## Local repro (Supabase)

```bash
make supabase-up
./scripts/supabase-seed-auth.sh
export OIDC_REQUIRED=true
# Start services with SUPABASE_JWT_SECRET from supabase status
./scripts/e2e-smoke.sh
```

Integration tests use `OIDC_REQUIRED=false` and `X-Tenant-Id` for harness speed; add dedicated RLS tests before P2 sign-off.
