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
