# RB-ING-01 — Ingestion job failed or stuck

1. `GET /v1/jobs/{jobId}` — read `status` and `error_message`.
2. Logs from `ingestion-service` / `pipelinerunner`.
3. Manual recovery: `make pipeline-all` or individual pipeline targets.
4. Verify ClickHouse counts via `scripts/data-health-check.sh`.
