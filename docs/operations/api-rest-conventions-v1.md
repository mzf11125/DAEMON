# API REST conventions v1 (Go / chi)

Daemon HTTP APIs are **Go services using chi**, not Django/DRF. Use this map when reviewing handlers or OpenAPI changes.

| Concept (typical REST framework) | Daemon equivalent |
|----------------------------------|-------------------|
| Serializers / schema validation | OpenAPI + handler validation; ontology manifest for semantic types |
| View / ViewSet | `chi` routes in `services/*/cmd` |
| JWT auth | Supabase JWT + [`packages/go-common/auth`](../../packages/go-common/auth/auth.go); `OIDC_REQUIRED` |
| Object-level permissions | Tenant RLS (`db.WithRLSTx`) + `AuthorizeAction` |
| Pagination | Query params on list endpoints (`limit`, `cursor`) |
| Error envelope | JSON `{ code, message, requestId }` via go-common HTTP helpers |

## Health and OIDC

When `OIDC_REQUIRED=true`, `/health` and `/internal/health` remain unauthenticated so orchestration and e2e startup can probe liveness without a Bearer token.

## Edge / Vercel (deferred)

[`apps/console-web`](../../apps/console-web) is Next.js; production API remains Go on `:8080–8084`. If console deploys to Vercel, add WAF/rate-limit runbook in staging docs — not Gate 0 scope.

## References

- [api/openapi-v1.yaml](../../api/openapi-v1.yaml)
- [oidc-rls-verification-v1.md](./oidc-rls-verification-v1.md)
