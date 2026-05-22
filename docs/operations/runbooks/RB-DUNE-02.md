# RB-DUNE-02 — Dune SQL (`dune-sql`) ingest failures

## Symptoms

- Job `failed` during execute or poll
- `execute_sql on large tables requires block_date or block_time`
- Timeout waiting for execution results

## Steps

1. `GET /v1/jobs/{jobId}` — check `mode` (`query_id` vs `execute_sql`) and `error_message`.
2. Verify `DUNE_API_KEY` on service env.
3. For `execute_sql`, add partition filters on `ethereum.transactions` and similar tables (`block_date`, `block_time`).
4. Prefer saved `query_id` with bounded parameters for production jobs.
5. Lower row volume: tighten SQL `LIMIT`, set `DUNE_INGEST_MAX_ROWS` (default 50_000).
6. Increase `SIM_INGEST_TIMEOUT` only for Sim; Dune uses same HTTP client timeout in `RunConfig` (default 120s).

## Credits

Dune Analytics API consumes query credits. Use Layer A CLI (`dune query run-sql`) to validate SQL before scheduling jobs.

## Related

- [dune-connectors-v1.md](../../integrations/dune-connectors-v1.md)
- [RB-ING-01](./RB-ING-01.md)
