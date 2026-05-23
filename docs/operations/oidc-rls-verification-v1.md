# OIDC + RLS verification (P2)

Staging (P1) may run with `OIDC_REQUIRED=false`. Production (P2) requires JWT auth and tenant isolation.

## Checklist

- [ ] `OIDC_REQUIRED=true` in production env
- [ ] Requests without `Authorization` return 401 on protected routes
- [ ] Valid JWT maps `sub` / claims → `tenant_id` (see [ai-surface-review-v1.md](../security/ai-surface-review-v1.md))
- [ ] Cross-tenant negative test: tenant A token cannot read tenant B cases/signals
- [ ] Postgres RLS policies enabled on tenant-scoped tables (Supabase or managed Postgres)
- [ ] `./scripts/verify-auth-migration.sh` passes after auth schema changes

## Local repro (Supabase)

```bash
make supabase-up
./scripts/supabase-seed-auth.sh
export OIDC_REQUIRED=true
# Start services with SUPABASE_JWT_SECRET from supabase status
./scripts/e2e-smoke.sh
```

Integration tests use `OIDC_REQUIRED=false` and `X-Tenant-Id` for harness speed; add dedicated RLS tests before P2 sign-off.
