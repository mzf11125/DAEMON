# Baseline manifest: Supabase local full stack v1

Cutover date: 2026-05-22 (local dev path).

## Tooling

- Supabase CLI: record `supabase --version` at cutover when pinning CI images.
- Local ports: API `54331`, Postgres `54332`, Studio `54333`, Inbucket `54334` (avoids default Supabase ports used by other local projects).

## Migrations (order)

1. `supabase/migrations/20260101000000_daemon_core.sql`
2. `supabase/migrations/20260101000001_rls_enable.sql`
3. `supabase/migrations/20260101000002_rls_policies.sql`
4. `supabase/migrations/20260101000003_daemon_runtime_role.sql`
5. `supabase/migrations/20260101000004_daemon_runtime_grants.sql`

Apply with: `supabase db reset` or `make migrate`.

## Auth

- `[auth.hook.custom_access_token]` enabled in `supabase/config.toml` → SQL function `public.custom_access_token_hook`.
- Demo user: `analyst@demo.local` via `scripts/supabase-seed-auth.sh`.
- Postgres `users.user_id` aligned via `SUPABASE_DEMO_USER_ID` in `make seed`.

## Environment (names only)

| Variable | Role |
|----------|------|
| `DATABASE_URL` | Go runtime (`daemon_runtime`) |
| `SEED_DATABASE_URL` | Migrations/seed superuser |
| `SUPABASE_JWT_SECRET` | HS256 validation (server only) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin API / seed script only |
| `NEXT_PUBLIC_SUPABASE_URL` | Console |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Console + password grant tests |
| `OIDC_ISSUER` | `http://127.0.0.1:54331/auth/v1` |
| `OIDC_REQUIRED` | `true` for prod-like local |

## Rollback baseline

- Docker Compose profile: `legacy-keycloak` (Keycloak `:8180`, Postgres `:5432`).
- Realm export: `infra/keycloak/daemon-demo-realm.json`.
- Legacy migrations: `infra/migrations/postgres/` (reference only).

## G7 decommission checklist

- [ ] G5 green for two weeks on main; G4b green at cutover
- [ ] No default docs/scripts on `:8180`
- [x] `legacy-keycloak` marked deprecated in compose comments (`infra/docker/docker-compose.yml`)
- [ ] Archive date recorded below when Keycloak retired

**Retired on:** _pending_

## Parity v1 cross-links

- Assumptions (gated): [`docs/governance/assumption-register-parity-v1.md`](../governance/assumption-register-parity-v1.md)
- Proof map: [`docs/traceability/foundry-parity-v1.md`](../traceability/foundry-parity-v1.md)
- Operator UX: [`docs/ux/operational-cockpit-flow-v1.md`](../ux/operational-cockpit-flow-v1.md)
