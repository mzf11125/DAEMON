# Deployment

- **Local**: `deployment/docker/compose.dev.yaml` — Postgres, Redis, NATS, collect-sensing, policy-server, gateway.
- **Kubernetes**: manifests under `deployment/kubernetes/`.
- **Helm**: chart skeleton in `deployment/helm/daemon-platform/`.
- **Terraform**: `deployment/terraform/` — `terraform validate` only; no cloud credentials in repo.

Production OIDC and external ERP credentials are supplied via environment secrets, not committed.

## Production environment checklist

The gateway refuses to boot in production without explicit credentials. Set these via your secret store (not in git):

| Variable | Required | Notes |
|----------|----------|-------|
| `DAEMON_API_KEYS` | Yes | `key:subjectId:tenantId:role1,role2` — no default dev key in production |
| `DAEMON_AUTH_MODE` | Recommended | Set `prod` (default when `NODE_ENV=production`) |
| `DAEMON_WEBHOOK_HMAC_SECRET` | Yes | Webhook ingest fails closed when unset in production policy mode |
| `POLICY_ENGINE_URL` | Yes | Upstream policy for sensitive actions; local Authorizer is dev-only fallback |
| `DAEMON_OIDC_JWKS_URL` | If using JWT | JWKS endpoint for Bearer token verification |
| `DAEMON_OIDC_ISSUER` | If using JWT | Expected `iss` claim |
| `DAEMON_OIDC_AUDIENCE` | If using JWT | Expected `aud` claim |
| `DAEMON_POSTGRES_URL` | Recommended | Durable journal, RLS, search replay |

Optional hardening:

- `DAEMON_WEBHOOK_REQUIRE_HMAC=1` — reject webhooks without HMAC even outside production policy mode.
- Do not expose `/metrics` on the public internet; restrict to your observability network (endpoint is `@Public()` by design).

## Container images and Snyk

There is no root `Dockerfile` in this repository today; compose under `deployment/docker/` references built images from local development. A dedicated Snyk container scan workflow is omitted until a published image build exists. Dependency scanning runs via GitHub `ci.yml` and CodeQL.

## Auth and tenant headers

Clients must send credentials (`x-api-key` or verified Bearer JWT) on all data routes (`/v1/read`, `/v1/search`, `/v1/lakehouse`, etc.). `X-Daemon-Tenant` must match the session tenant unless the principal has `platform-admin` or `admin`. Webhook ingest derives tenant scope from `configs/collect-sensing/sources.yaml`, not from client tenant headers.
