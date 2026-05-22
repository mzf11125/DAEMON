# Auth migration FMEA v1 (Supabase local)

Scope: local development cutover from Keycloak + Docker Postgres to Supabase Auth + RLS on Postgres.

| Mode | Cause | Control | Residual risk |
|------|-------|---------|---------------|
| Cross-tenant data exposure | Missing/wrong `tenant_id` in JWT; handler omits filter | Custom access token hook; `auth.Middleware`; `jwt_tenant_id()` RLS; G4b `WithRLSTx` | Low after G4b; high if G4b skipped |
| Privilege escalation | `roles` not in JWT | Hook injects `roles`; `AuthorizeAction` unchanged | Low when hook required |
| Auth bypass | `OIDC_REQUIRED=false` in prod-like env | env-contract; `verify-auth-migration.sh`; integration defaults | Low with CI discipline |
| Stale IdP | Keycloak and Supabase both active | `legacy-keycloak` profile; G7 retirement | Medium during transition |
| HS256 secret leak | `SUPABASE_JWT_SECRET` in client bundle | Never `NEXT_PUBLIC_*`; review in PR | Low |
| RLS bypass via service role | Runtime `DATABASE_URL` uses superuser | `daemon_runtime` role; verify script check 7 | Low |
| Defense-in-depth gap | Application forgets tenant filter | RLS on pgx path (G4b) | Low when G4b enforced |
| Console session regression | `localStorage` bearer after cutover | `@supabase/ssr` cookies; grep in verify script | Low post-cutover |

## Verification gates

- G3: `packages/go-common/auth/auth_test.go`, console sign-in, `verify-auth-migration.sh` checks 1–6
- G4a: RLS policies migration + `pg_policies` smoke
- G4b: `tests/integration/rls_tenant_isolation_test.go`, `WithRLSTx` in five services
- G5: `scripts/e2e-smoke.sh` with Supabase password grant

No waiver for G4b, G3 fail-closed, or runtime service role in app `DATABASE_URL`.
