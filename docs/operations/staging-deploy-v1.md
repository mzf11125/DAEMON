# Staging deploy v1

Internal pilot (P1) before customer GA (P2). Canonical HTTP remains Go services per [ADR MERGE-STRATEGY-01](../architecture/adr-merge-strategy-01.md).

## Environment matrix

| Variable | Staging | Production (P2) |
|----------|---------|-----------------|
| `OIDC_REQUIRED` | `false` (pilot) | `true` |
| `DATABASE_URL` | Supabase or managed Postgres | Managed Postgres + RLS |
| `CLICKHOUSE_DSN` | Staging CH cluster | Prod CH cluster |
| `NEO4J_URI` | Optional graph | As required |
| Image tags | `:staging` or digest pin | **Pinned digest** |

Copy from [`.env.example`](../../.env.example); never commit `.env`.

## Bootstrap sequence

```bash
make up                    # clickhouse + neo4j
make supabase-up           # or managed Postgres URL
make migrate               # Postgres + ClickHouse SQL
make seed
make pipeline-all
make ontology-sync
# Go services: compose --profile apps OR process supervisor
make up-merge-track        # optional: control-plane + agent-bridge
./scripts/seed-control-plane-demo-tenant.sh
```

## Smoke after deploy

1. `./scripts/e2e-smoke.sh`
2. `E2E_FULL=1 ./scripts/e2e-smoke.sh`
3. `./scripts/prove-operational-loop.sh`
4. `./scripts/prove-aip-eval.sh`
5. `./scripts/smoke-agent-bridge.sh` (if merge-track profile up)
6. `./scripts/prove-express-cargo-sim.sh` (express HITL + rules; set service URLs if not localhost)
7. `./scripts/prove-plugin-remap.sh` (P3 plugin remap runtime proof)

Point smoke scripts at staging by exporting `ONTOLOGY_SERVICE_URL`, `PLATFORM_API_URL`, and rules-engine base URL before running prove scripts.

## OIDC pilot (Wave 2)

1. Set `OIDC_REQUIRED=true` on Go services (`platform-api`, `ontology-service`, `rules-engine`, `case-service`).
2. Obtain Supabase JWT for `tenant-demo` user; export `SUPABASE_JWT` for prove scripts that call authenticated routes.
3. Run staging smoke table in [oidc-rls-verification-v1.md](./oidc-rls-verification-v1.md) and paste curl transcripts with staging hostnames.
4. Confirm express HITL: `./scripts/prove-express-cargo-sim.sh` against staging ontology `:8081`.

**Exit:** Internal pilot URL + JWT login + express intake/exceptions pages load with real attachment list from `GET /v1/attachments`.

## Security before P2

- [ai-surface-review-v1.md](../security/ai-surface-review-v1.md): JWT → tenant, RLS negative tests
- [supply-chain-v1.md](../security/supply-chain-v1.md): CI `supply-chain` job
- GitHub ruleset active on `main` ([github-rulesets-v1.md](../governance/github-rulesets-v1.md))

## Kubernetes (optional)

If using `infra/kubernetes/`, pin image digests in manifests; separate namespaces `daemon-staging` / `daemon-prod`.
