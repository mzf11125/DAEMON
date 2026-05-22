# ingestion-service

Ingestion job tracking and pipeline orchestration. Port **8082**.

- `POST /v1/jobs` — create job; runs connector pipeline chain asynchronously
- `GET /v1/jobs/{jobId}` — job status (tenant-scoped)

Supported connectors:

| Connector | Pipeline chain |
|-----------|----------------|
| `seed-csv` | raw-ingest → transforms → features → quality |

Job statuses: `running`, `completed`, `failed` (with `error_message` on failure).

```bash
make run-ingestion-service
```
