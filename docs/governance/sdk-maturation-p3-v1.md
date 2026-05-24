# SDK maturation P3 epic

Post–Gate 0 hardening for `@daemon/sdk-ts` (Daemon OSDK — not a third-party SDK dependency).

## Scope

| Item | Target |
|------|--------|
| Typed errors | Map HTTP `code` to discriminated union |
| Timeouts / retries | Idempotent GET retry; bounded POST |
| Pagination | Iterator helpers on list endpoints |
| Contract tests | OpenAPI-driven smoke against local platform-api |

## Proof (when complete)

```bash
pnpm -r typecheck
# future: pnpm --filter @daemon/sdk-ts test:contract
```

## Non-goals

- npm dependency on external lattice/entity SDK packages
- gRPC client generation in P3

Track progress in [matrix-v1.md](../traceability/matrix-v1.md).
