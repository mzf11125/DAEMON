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
| Status | **Verified locally** after migrate + seed + 5-service start |
| CI | `ci.yml` job `integration` — `TestOperationalLoopHTTP` (testcontainers) |
| Gate 1 commit | `326e5a7` — green validate, integration, aip-eval, L1-L3 proof |
| Date | 2026-05-22 |

## Related

- Matrix: [matrix-v1.md](./matrix-v1.md)
- AIP phase 2: [aip-phase-2.md](./aip-phase-2.md)
