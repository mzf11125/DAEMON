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

## Security before P2

- [ai-surface-review-v1.md](../security/ai-surface-review-v1.md): JWT → tenant, RLS negative tests
- [supply-chain-v1.md](../security/supply-chain-v1.md): CI `supply-chain` job
- GitHub ruleset active on `main` ([github-rulesets-v1.md](../governance/github-rulesets-v1.md))

## Kubernetes (optional)

If using `infra/kubernetes/`, pin image digests in manifests; separate namespaces `daemon-staging` / `daemon-prod`.
