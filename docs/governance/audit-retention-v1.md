# Audit retention v1

Production audit retention policy. Status: **draft (legal review in Phase 3)** — tracked in [production-readiness-v1.md](../operations/production-readiness-v1.md). Supersedes the prior "TBD" stance.

## Stores and writers

- Table: `audit_log` (Postgres, tenant-scoped, RLS).
- Ontology action audit: written by `recordAudit` in `services/ontology-service` for every executed action.
- External events: `POST /v1/audit/events` on `services/platform-api` for ingestion / agent / console events.
- Reader: `GET /v1/audit/events` with `tenantId` (JWT) + filter args (`action`, `objectId`, `from`, `to`).

## Retention tiers

| Tier | Event class | Hot retention (Postgres) | Cold retention (immutable archive) | Examples |
|------|-------------|--------------------------|------------------------------------|----------|
| **Financial / regulatory** | Actions that create or close legal/financial state | 90 days | **7 years** | `OpenCase`, `CloseCase`, `RecordDecision`, `ExecuteWorkOrder`, `EscalateSignal` for tier 0–1 packs |
| **Operational** | Routine read / propose / discovery events | 90 days | **2 years** | MCP `ontology_list_objects`, agent `propose`, console route hits |
| **Telemetry / debug** | Non-actionable trace data | 30 days | **90 days** | Verbose handler traces, OTel low-priority spans |
| **Security** | Auth, authz, RLS deny, secret access | 90 days | **7 years** | JWT issuance, role check failures, vault accesses |

Tier is decided by `auditEventClass` field (added to `audit_log` schema in Phase 2.5). Default class = `operational` if unspecified.

## Cold archive

- Immutable object storage (S3-compatible, Object Lock enabled, KMS-managed keys).
- Layout: `s3://<archive-bucket>/<tenant_id>/<class>/<yyyy>/<mm>/<dd>/<hash>.jsonl.gz`.
- Hash chain: each daily archive references the prior day's SHA-256 to detect tampering.
- WORM (write-once-read-many) lock for the full hot+cold retention window.
- Legal-hold flag freezes deletion for any matching tenant + class until released.

## Archival job

- New pipeline `pipelines/audit-archival/` (Go) — implemented in **Phase 2.5**.
- Schedule: hourly drain of records older than configured hot window.
- Idempotent: writes archive-batch row in `audit_archive_batches` with batch hash; replays safe.
- Failures page on-call (P2). Backlog > 24h is P1.

## Deletion

- Tenant offboarding: hot rows purged within 30 days of contract termination (per DPA template, Phase 3.4); cold archive retained per legal hold or until tier window expires.
- GDPR Article 17 right-to-erasure: PII fields tombstoned in hot store; cold archive masked under approved process documented in [gdpr-dpia-platform-v1.md](../compliance/gdpr-dpia-platform-v1.md) (Phase 3) — full deletion only when no legal hold is active.
- Local development (`supabase db reset`): wipes hot store; cold archive does not exist locally.

## Compliance mapping

| Framework | Control | This policy satisfies |
|-----------|---------|----------------------|
| SOC 2 | CC7.2 (event monitoring) + CC7.3 (incident response evidence) | Hot+cold retention with hash chain |
| ISO 27001 | A.5.28 (collection of evidence), A.8.15 (logging) | Tiered retention + WORM |
| HIPAA | 45 CFR 164.312(b) (audit controls) + 164.530(j) (6y documentation) | Financial tier ≥ 6y |
| GDPR | Art. 30 (records of processing), Art. 5(1)(e) (storage limitation) | Class-based retention windows + erasure procedure |

## Implementation status

| Item | Phase | State |
|------|-------|-------|
| Hot store on Postgres `audit_log` | Phase 0 | ✅ Live |
| `event_class` + `archived` on `audit_log` (migration 009) | Phase 2.5 | ✅ In repo |
| Archival pipeline `pipelines/audit-archival/` | Phase 2.5 | ✅ Skeleton (`make audit-archival-dry-run`) |
| `audit_archive_batches` hash chain table | Phase 2.5 | ✅ In repo |
| Cold storage bucket + Object Lock + KMS | Phase 1 (infra) | 🟡 Planned |
| Writer wiring for `event_class` on all audit paths | Phase 2.5 | 🟡 Planned |
| Legal review of policy | Phase 3 | 🟡 Pending |
| GDPR erasure procedure runbook | Phase 3.4 | 🟡 Planned |
