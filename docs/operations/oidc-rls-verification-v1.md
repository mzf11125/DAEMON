# OIDC + RLS verification (P2)

Staging (P1) may run with `OIDC_REQUIRED=false`. Production (P2) requires JWT auth and tenant isolation.

## Checklist

- [x] `OIDC_REQUIRED=true` in production env (local repro: `verify-auth-migration.sh` with `OIDC_REQUIRED=true`)
- [x] Requests without `Authorization` return 401 on protected routes when `OIDC_REQUIRED=true` (go-common auth tests; invalid Bearer → 401 on manifest)
- [x] Valid JWT maps `sub` / claims → `tenant_id` (see [ai-surface-review-v1.md](../security/ai-surface-review-v1.md); password grant + `app_metadata.tenant_id` hook)
- [x] Cross-tenant negative test: tenant A token cannot read tenant B cases/signals (`tests/integration` RLS suite)
- [x] Postgres RLS policies enabled on tenant-scoped tables (Supabase or managed Postgres)
- [x] `./scripts/verify-auth-migration.sh` passes after auth schema changes

## Local proof (2026-05-24)

```bash
make supabase-up
OIDC_REQUIRED=true ./scripts/verify-auth-migration.sh
unset OIDC_REQUIRED && make test-integration
./scripts/prove-operational-loop.sh
./scripts/prove-aip-eval.sh
./scripts/smoke-agent-bridge.sh
./scripts/prove-express-cargo-sim.sh
curl -sf http://localhost:4000/health
```

Staging pilot: run the same prove scripts against staging URLs with `OIDC_REQUIRED=true` on Go services and a valid Supabase JWT for console HITL (`/express-cargo/intake`).

### Staging smoke template (fill on deploy)

**Local proof (complete):**

| Step | Command | Local URL / result | Date |
|------|---------|-------------------|------|
| Health | `curl -sf $PLATFORM_API_URL/health` | `http://localhost:8080/health` → `ok` | 2026-05-24 |
| OIDC deny | `curl -s -o /dev/null -w '%{http_code}' $ONTOLOGY_SERVICE_URL/v1/objects/Signal` (no Bearer) | `401` when `OIDC_REQUIRED=true` | 2026-05-24 |
| Express HITL | `./scripts/prove-express-cargo-sim.sh` | `:8081` / `:8083`; CI integration | 2026-05-24 |
| Plugin remap | `./scripts/prove-plugin-remap.sh` | rules evaluate → Signal provenance | 2026-05-24 |
| Agent bridge | `./scripts/smoke-agent-bridge.sh` | `:3001` merge-track profile | 2026-05-24 |
| Full chain | `make prove-staging-smoke` | wraps e2e + prove scripts 1–7 | 2026-05-24 |

**Staging hostnames (P0.3 / P0.4 — 2026-05-25):**

Proof used **non-localhost HTTPS** via [`scripts/phase0-staging-tunnel-env.sh`](../../scripts/phase0-staging-tunnel-env.sh) (Cloudflare quick tunnels → host-run Go services on `127.0.0.1`). Ephemeral `trycloudflare.com` URLs; regenerate before each run. Replace with VM/K8s staging DNS when provisioned ([`staging-vm-compose-v1.md`](./staging-vm-compose-v1.md)).

| Step | Env var | Staging URL (proof run) | Result | Date |
|------|---------|-------------------------|--------|------|
| Platform API | `PLATFORM_API_URL` | `https://existence-seattle-olive-leslie.trycloudflare.com` | `/health` → `ok` (HTTPS) | 2026-05-25 |
| Ontology | `ONTOLOGY_SERVICE_URL` | `https://patrol-determining-temperature-empty.trycloudflare.com` | `/health` → `ok`; `GET /v1/objects/Signal` no Bearer → `401` | 2026-05-25 |
| Rules engine | `RULES_ENGINE_URL` | `https://anymore-domain-anchor-terminal.trycloudflare.com` | `/health` → `ok` (HTTPS) | 2026-05-25 |
| Case service | `CASE_SERVICE_URL` | `http://127.0.0.1:8084` (local only) | e2e cases green in proof | 2026-05-25 |
| Console | `NEXT_PUBLIC_PLATFORM_API_URL` | same as platform tunnel URL | not exercised in proof | 2026-05-25 |
| Supabase Auth | `OIDC_ISSUER` | `https://poems-thru-watts-view.trycloudflare.com` (tunnel to `:54331/auth/v1`) | JWT via local Supabase; host services `OIDC_REQUIRED=true` | 2026-05-25 |
| Prove chain | — | `make phase0-staging-proof` (`PHASE0_STRICT=1`) | exit 0; transcript `/tmp/phase0-staging-proof-transcript-final.txt` | 2026-05-25 |

Copy env template from [`.env.example`](../../.env.example). Record results in [p1-staging-pilot-closeout-v1.md](./p1-staging-pilot-closeout-v1.md) and flip P0.4 in [production-readiness-v1.md](./production-readiness-v1.md).

## Local repro (Supabase)

```bash
make supabase-up
./scripts/supabase-seed-auth.sh
export OIDC_REQUIRED=true
# Start services with SUPABASE_JWT_SECRET from supabase status
./scripts/e2e-smoke.sh
```

Integration tests use `OIDC_REQUIRED=false` and `X-Tenant-Id` for harness speed; add dedicated RLS tests before P2 sign-off.
