# RB-DUNE-01 — Sim (`sim-dune`) ingest failures

## Symptoms

- Job `failed` with `sim api` or `SIM_API_KEY` in `error_message`
- HTTP 429 / rate limit
- Response warnings: `UNSUPPORTED_CHAIN_IDS`

## Steps

1. `GET /v1/jobs/{jobId}` — confirm `connector=sim-dune` and redacted `params`.
2. Verify `SIM_API_KEY` is set on `ingestion-service` / worker env (not in job body).
3. Narrow scope: fewer `addresses`, explicit `chain_ids`, lower `limit_per_address`.
4. Retry with backoff; check [Sim docs](https://docs.sim.dune.com) for CU and supported chains.
5. If bronze empty but job completed, run `scripts/data-health-check.sh` and inspect `raw_observations` count.

## Prevention

- Always pass `chain_ids` for `0x` addresses.
- Cap `limit_per_address` (default 100, max 1000).
