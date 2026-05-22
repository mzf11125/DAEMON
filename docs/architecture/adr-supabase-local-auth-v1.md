# ADR: Supabase local auth and Postgres (v1)

## Status

Accepted — local development only.

## Context

Default local stack used Keycloak and a Docker Postgres service. Product work needs Supabase-compatible JWT claims, RLS on tenant tables, and console session handling without `localStorage` bearer tokens.

## Decision

- Run **Supabase CLI** for Auth (`:54331`) and Postgres (`:54332`).
- Apply schema and RLS via `supabase/migrations/`.
- Go services connect as **`daemon_runtime`** and set `request.jwt.claims` per request (`db.WithRLSTx` / `ExecRLS`).
- Validate JWTs with **HS256** and `SUPABASE_JWT_SECRET` when issuer is Supabase `/auth/v1`.
- Console uses **`@supabase/ssr`** (cookie sessions).
- Keycloak and legacy Postgres remain under Docker Compose profile **`legacy-keycloak`**.

## Consequences

- Developers run `make supabase-up` before `make migrate` / `make seed`.
- DAEMON uses non-default ports in `supabase/config.toml` so another local Supabase project can keep `:54321`/`:54322`; or stop the other project / change ports if needed.
- Production hosted Supabase is out of scope for this ADR.

## References

- `docs/lifecycle/baseline-supabase-local-v1.md`
- `docs/security/auth-migration-fmea-v1.md`
- `scripts/verify-auth-migration.sh`
