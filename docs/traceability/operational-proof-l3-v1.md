# Operational proof L3 (traceability)

Evidence for [technical proof ladder v1](../gtm/technical-proof-ladder-v1.md) rung **L3** — signal → case → decision → audit.

## Commands

| Rung | Command | CI / local |
|------|---------|------------|
| L1 | `./scripts/e2e-smoke.sh` | `ci.yml` job `e2e-full` (with `E2E_FULL=0`) |
| L2 | `E2E_FULL=1 ./scripts/e2e-smoke.sh` | `ci.yml` job `e2e-full` |
| L3 | `./scripts/prove-operational-loop.sh` | Local + `make prove-operational-loop` |

## L3 proof record

| Field | Value |
|-------|--------|
| Script | `scripts/prove-operational-loop.sh` |
| Integration test | `TestOperationalLoopHTTP` in `tests/integration/` |
| Prerequisites | `make up`, `make supabase-up`, `make migrate`, Go services on :8080–:8084 |
| ClickHouse | `scripts/apply-clickhouse-migrations.sh` (via `make migrate`) |
| Status | **Verified locally** — ES256 JWT + `OIDC_ISSUER` from `SUPABASE_URL`; `case_signals` verified via case-service API (RLS-safe); re-run: `make up && make supabase-up && make migrate && ./scripts/prove-operational-loop.sh` |
| CI | `ci.yml` job `integration` — other integration tests via testcontainers; `TestOperationalLoopHTTP` skips when services/signals unavailable |
| Gate 0 fix | `005_authenticated_grants.sql` required for `aip-eval` (`SET LOCAL role authenticated`); `load_supabase_env` + ES256 JWKS in `go-common/auth` |
| Gate 1 commit | `326e5a7` — prior green run; `ccb72b0` docs-only follow-up |
| Date | 2026-05-23 |

## Related

- Matrix: [matrix-v1.md](./matrix-v1.md)
- AIP phase 2: [aip-phase-2.md](./aip-phase-2.md)
