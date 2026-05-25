# Managed data services wiring (Phase 1)

Production data plane is **outside** the cluster.

| Service | Provider | Connection from K8s | Secret keys |
|---------|----------|---------------------|-------------|
| Postgres + Auth + RLS | Supabase Cloud | `DATABASE_URL`, JWT validation | ESO → `platform-api-runtime` |
| OLAP | ClickHouse Cloud | TLS + service user | `CLICKHOUSE_*` per service chart |
| Graph | Neo4j Aura | Bolt + TLS | `NEO4J_URI`, `NEO4J_PASSWORD` |
| Object store | S3-compatible | IAM / workload identity | `MINIO_*` or native SDK keys |
| LLM | OpenRouter | Egress from `daemon-aip` | `OPENROUTER_API_KEY` |

## Network

- Static egress NAT IP from Terraform `network` module → allowlist on Supabase/CH/Neo4j.
- No managed DB credentials in Git; only External Secrets references.

## Verification

- Staging: `docs/operations/staging-deploy-v1.md` matrix row per service.
- Prod: Phase 2 proof ladder after OIDC_REQUIRED enforced.
