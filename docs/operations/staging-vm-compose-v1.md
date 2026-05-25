# Staging VM — Docker Compose (Phase 0 Option A)

Minimal **non-localhost** staging before Phase 1 Kubernetes. Sufficient to close P0.3–P0.4 and run `./scripts/run-phase0-staging-proof.sh`.

## Prerequisites

- Linux VM with public DNS (e.g. `staging-api.example.com`) and TLS (Caddy or nginx reverse proxy).
- Ports 443 → internal `:8080`–`:8084`, `:3001` (agent-bridge if merge-track profile).
- Staging Supabase project (or self-hosted Postgres with same migration chain as local).

## Deploy steps (operator)

1. Clone repo at release SHA (post–`v0.1.0` tag).
2. Apply Postgres migrations: `SEED_DATABASE_URL=... make migrate-superuser` (managed DB) or `supabase db push` for Supabase Cloud.
3. Seed: `DATABASE_URL=... make seed` (staging tenant only).
4. On VM: `docker compose -f infra/docker/docker-compose.yml --profile apps up -d --build`.
5. Terminate TLS at reverse proxy; set env from [`.env.staging.example`](../../.env.staging.example) (copy to `.env.staging`, not committed).
6. Set `OIDC_REQUIRED=true` on all Go services in compose overrides.
7. Run proofs from laptop or CI runner with VPN:

```bash
set -a && source .env.staging && set +a
export PHASE0_STRICT=1
./scripts/run-phase0-staging-proof.sh
```

8. Paste URLs and curl transcripts into [oidc-rls-verification-v1.md](./oidc-rls-verification-v1.md) staging table.
9. Update [p1-staging-pilot-closeout-v1.md](./p1-staging-pilot-closeout-v1.md) P0.3/P0.4 rows.

## Health checks

```bash
curl -sf "$PLATFORM_API_URL/health"
curl -sf "$ONTOLOGY_SERVICE_URL/health"
curl -sf "$RULES_ENGINE_URL/health"
```

## OIDC deny (staging)

With `OIDC_REQUIRED=true`:

```bash
curl -s -o /dev/null -w '%{http_code}\n' "$ONTOLOGY_SERVICE_URL/v1/objects/Signal"
# expect 401 without Authorization
```

## Related

- [staging-deploy-v1.md](./staging-deploy-v1.md)
- [phase0-exit-gates-v1.md](./phase0-exit-gates-v1.md)
- [phase0-operator-runbook-v1.md](./phase0-operator-runbook-v1.md)
