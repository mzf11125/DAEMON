# audit-archival

Go batch job that drains hot `audit_log` rows from Postgres into immutable object storage and records hash-chained batches in `audit_archive_batches`.

**Policy:** [docs/governance/audit-retention-v1.md](../../docs/governance/audit-retention-v1.md)  
**Schema:** [infra/migrations/postgres/009_audit_event_class_and_archive_batches.sql](../../infra/migrations/postgres/009_audit_event_class_and_archive_batches.sql)

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` or `POSTGRES_URL` | Postgres connection (Supabase local default) |
| `AUDIT_ARCHIVE_BUCKET` | S3 bucket for cold archives (default `daemon-audit-archive`) |
| `AWS_REGION` | AWS region for S3 client |
| `CLICKHOUSE_DSN` | Reserved for future archive index mirror |

## CLI

```bash
cd pipelines/audit-archival
go run ./cmd --dry-run --tenant tenant-demo --since 2026-01-01T00:00:00Z
```

| Flag | Description |
|------|-------------|
| `--tenant` | Filter by `tenant_id` (empty = all) |
| `--since` | RFC3339 minimum `created_at` |
| `--dry-run` | Log only; no S3 upload or batch insert |
| `--batch-limit` | Max rows per run (default 5000) |

## Layout

- `cmd/main.go` — entrypoint
- `internal/archiver/` — `Reader`, `Writer`, `BatchRecorder`, `Runner`

Production schedule: hourly CronJob (Phase 2 infra). Failures page on-call per retention policy.
