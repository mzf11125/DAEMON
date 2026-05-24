# Environment contract v1

| Variable | Required | Consumers | Notes |
|----------|----------|-----------|-------|
| DATABASE_URL | dev yes | all Go services | Postgres via `daemon_runtime` (Supabase local `:54332`) |
| SEED_DATABASE_URL | migrate/seed only | seed, `supabase db reset` | superuser — never app runtime |
| NEXT_PUBLIC_SUPABASE_URL | console | console-web | `http://127.0.0.1:54331` |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | console | console-web | from `supabase status` |
| SUPABASE_JWT_SECRET | dev yes | Go auth middleware | server only; HS256 |
| SUPABASE_SERVICE_ROLE_KEY | seed only | `supabase-seed-auth.sh` | never `DATABASE_URL` |
| SUPABASE_DEMO_USER_ID | seed | `infra/seed` | UUID from seed-auth script |
| CLICKHOUSE_DSN | dev yes | ingestion, rules | Analytics |
| OIDC_REQUIRED | no | auth middleware | `true` in prod-like |
| OIDC_ISSUER | if OIDC | auth | Supabase: `http://127.0.0.1:54331/auth/v1` |
| OIDC_AUDIENCE | if OIDC | auth | `authenticated` (Supabase) |
| TENANT_ID | no | MCP, pipelines | default `tenant-demo` |
| RULES_ROOT | no | rules-engine | ontology rules path |
| ONTOLOGY_SERVICE_URL | AIP | MCP, agent | `:8081` |
| OPENROUTER_API_KEY | AIP optional | aip-agent, market-intel | never commit; chat + embeddings when `MARKET_INTEL_MODEL=openrouter:*` |
| TAVILY_API_KEY | market-intel | pipelines/market-intel | Tavily search/crawl/research |
| MARKET_INTEL_MODEL | no | market-intel | default `openrouter:openai/gpt-4o-mini` |
| AGENT_MAX_STEPS | no | aip-agent | default 8 |
| MCP_SSE_PORT | no | mcp-ontology | default 8090 |
| SIM_API_KEY | for `sim-dune` | dune-ingest/sim | Sim by Dune; never commit |
| DUNE_API_KEY | for `dune-sql` | dune-ingest/analytics | Dune Analytics API; never commit |
| SIM_API_BASE_URL | no | dune-ingest/sim | default `https://api.sim.dune.com` |
| DUNE_API_BASE_URL | no | dune-ingest/analytics | default `https://api.dune.com/api/v1` |
| DUNE_INGEST_MAX_ROWS | no | dune-ingest/analytics | cap SQL rows (default 50000) |
| SIM_INGEST_TIMEOUT | no | dune-ingest/sim | e.g. `180s` |

**Layer A (developer machine only):** `DUNE_API_KEY` for Dune CLI and official MCP (`~/.config/dune/config.yaml` after `dune auth`). Do not commit. See [dune-agent-tooling-v1.md](../integrations/dune-agent-tooling-v1.md).

When `OIDC_REQUIRED=true`, do not trust `X-Tenant-Id` from clients; use JWT claims only.

## Supabase local ports

| Service | URL |
|---------|-----|
| API (Auth + REST) | `http://127.0.0.1:54331` |
| Studio | `http://127.0.0.1:54323` |
| Postgres | `127.0.0.1:54332` |
| Inbucket | `http://127.0.0.1:54324` |

**Workflow:** `make supabase-up` → `make migrate` → `./scripts/supabase-seed-auth.sh` → `make seed` → `make run-*` on host.

**Legacy:** Keycloak `:8180` and Docker Postgres `:5432` via `docker compose --profile legacy-keycloak`.
