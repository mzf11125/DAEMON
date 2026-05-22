# Developer experience paper cuts v1

Internal backlog for local Supabase + Go service friction. Not a public roadmap.

## Ports and URLs

| Service | Port / URL |
|---------|------------|
| platform-api | `:8080` |
| ontology-service | `:8081` |
| ingestion-service | `:8082` |
| rules-engine | `:8083` |
| case-service | `:8084` |
| console-web | `:3000` |
| Supabase API | `54331` |
| Supabase Postgres | `54332` |
| Supabase Studio | `54333` |
| Legacy Keycloak (deprecated) | `:8180` |

## Common fixes

1. **Postgres not ready** — `make supabase-up` then wait for `pg_isready -h 127.0.0.1 -p 54332`.
2. **No JWT for e2e** — run `scripts/supabase-seed-auth.sh`; export `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `supabase status -o env`.
3. **`daemon_runtime` permission denied** — apply migration `20260101000004_daemon_runtime_grants.sql` via `make migrate`.
4. **Wrong `ONTOLOGY_ROOT`** — export `ONTOLOGY_ROOT=$REPO_ROOT/ontology/v2` when running services outside repo root.
5. **Port 5432 conflict** — legacy `docker-postgres` profile; use `make down` or Supabase on `54332` only.

## Lint / CI tooling

- Go: per-module `go test ./...` in CI (no single workspace module yet).
- Ontology: `./scripts/validate-ontology.sh` on every PR.
- Optional future: unify on `golangci-lint` vs Palantir-style linters — see ADR when adopted.

## Seed and demo user

- Email: `analyst@demo.local` / password `analyst` (local only).
- Align `users.user_id` with `SUPABASE_DEMO_USER_ID` from seed-auth script.
