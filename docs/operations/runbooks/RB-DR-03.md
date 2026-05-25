# RB-DR-03 — ClickHouse restore

**Severity:** P1 if dataset_* tables empty during demo / customer; P2 otherwise
**Owner:** Data engineering on-call
**Estimated time:** 1–4h depending on dataset size
**Last drilled:** TBD

## Triggers

- ClickHouse Cloud incident affecting `dataset_*` tables.
- Bad pipeline run that wrote into `dataset_*` and needs roll-back.
- Region failover (RB-DR-01).

## Pre-conditions

- ClickHouse Cloud point-in-time recovery enabled (Phase 1.2).
- Cold export to object storage configured (90d retention).
- `infra/migrations/clickhouse/` chain reproducible from repo.

## Steps

1. **Identify** the corrupted / lost tables and the target timestamp.
2. **Vendor PITR** to a parallel ClickHouse Cloud service (do **not** PITR over a live service):
   - Supabase / CH Cloud dashboard → Backup → restore to new service.
   - Wait for service ready; verify with `SELECT count() FROM dataset_observations`.
3. **Cross-validate** target rows:
   ```sql
   SELECT toDate(observed_at) day, count() rows
   FROM dataset_observations
   WHERE tenant_id = '<tenant>'
   GROUP BY day ORDER BY day DESC LIMIT 14;
   ```
4. **Switch traffic** by updating `CLICKHOUSE_DSN` in Vault → ESO refresh on `ingestion-service` and `rules-engine`.
5. **Re-run pipelines** if data later than restore point is missing:
   ```bash
   make pipeline-all
   ```
6. **Verify rules:** `./scripts/prove-operational-loop.sh`.
7. **Decommission** the old service after 7 days of healthy operation.

## Cold archive recovery (data > 90d retention on hot store)

1. List archive segments: `aws s3 ls s3://<archive-bucket>/<tenant>/<class>/`.
2. `aws s3 cp` filtered segments to a staging bucket.
3. Use `clickhouse-client --query="INSERT INTO ... FORMAT JSONEachRow"` over the segment files.
4. Verify counts and audit hash chain integrity (Phase 2.5 verifier script).

## Compliance evidence

- SOC 2 A1.2 + CC7.5
- ISO 27001 A.8.13 + A.8.14
- HIPAA 45 CFR 164.308(a)(7)(ii)(A) + (B)
- GDPR Art. 32(1)(c)

## Common failures

- DSN not updated → still pointing at primary → roll back DSN; investigate.
- Pipeline checkpoints out of sync → `pipelines/raw-ingest` produces duplicates; dedup with primary key + `LIMIT 1 BY` rebuilds.
