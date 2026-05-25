# Stop-the-line policy v1

Halt merge or demo when:

- `make test` or `test-integration` fails on main path.
- Golden eval fails on prompt/MCP PR without waiver.
- `dataset_observations` empty before rules demo.
- Auth bypass suspected (`OIDC_REQUIRED` regression).
- `supabase db reset` fails or RLS migrations not applied.
- Custom access token hook disabled while `OIDC_REQUIRED=true` (tokens lack `tenant_id` / `roles`).
- Console stores bearer in `localStorage` (`daemon_bearer_token`) after Supabase cutover.
- Go services honor `X-Tenant-Id` while `OIDC_REQUIRED=true` (forbidden — use JWT only).
- App `DATABASE_URL` uses Postgres superuser or Supabase `service_role` at runtime.
- G4b cross-tenant test (`rls_tenant_isolation_test.go`) fails or is skipped without waiver.
- `verify-auth-migration.sh` or Supabase-backed `e2e-smoke` auth path fails after auth change.

**No waiver** for G4b, G3 fail-closed, or runtime service role. Restart when G3, G4a, G4b, and G5 evidence are green.

Resume after fix + green checks documented in PR.

## G3 / G4a / G4b / G5 remediation (in-repo)

Mapped to [auth-migration-fmea-v1.md](../security/auth-migration-fmea-v1.md). Last audit: [p1-staging-pilot-closeout-v1.md](./p1-staging-pilot-closeout-v1.md) (2026-05-25).

| Gate | What it proves | In-repo proof | If red — fix |
|------|----------------|---------------|--------------|
| **G3** | Fail-closed auth when `OIDC_REQUIRED=true` | `packages/go-common/auth/auth_test.go`; `scripts/verify-auth-migration.sh` checks 1–6; `make verify-auth-migration` | Restore Bearer requirement in `auth.Middleware`; enable hook in `supabase/config.toml` |
| **G4a** | RLS policies exist on tenant tables | `supabase/migrations/20260101000001_rls_enable.sql`, `20260101000002_rls_policies.sql` | Re-run `supabase db reset`; verify `pg_policies` |
| **G4b** | Cross-tenant deny at DB + app | `tests/integration/rls_tenant_isolation_test.go`; `WithRLSTx` in five Go services | Fix RLS policies or JWT `tenant_id` claim; never skip test without waiver |
| **G5** | End-to-end Supabase password grant path | `scripts/e2e-smoke.sh`; `make supabase-up` + seed auth | Fix `DATABASE_URL` role (`daemon_runtime`); align demo user in seed |

**Status (repo):** G3/G4a/G4b/G5 evidence present and passing locally per closeout audit. Re-verify after any auth, migration, or console session change.
