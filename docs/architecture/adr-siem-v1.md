# ADR: SIEM integration and log routing (Phase 3)

## Status

**Proposed — DRAFT** (implementation Phase 3).

## Context

SOC 2 / ISO 27001 require centralized security logging. Daemon emits audit events (Postgres), application logs (OTel), and ClickHouse analytics.

## Decision

1. **Audit plane:** `audit_events` → archival pipeline → object storage; SIEM consumes S3/GCS notifications or forwarder (vendor TBD at procurement).
2. **App logs:** OTel collector → optional SIEM exporter (Syslog/HTTP) in addition to Grafana/Loki backend.
3. **Retention:** Align with [audit-retention-v1](../operations/audit-retention-v1.md); SIEM retention ≥ 1 year for security events.
4. **PII:** SIEM payloads use hashed `user_id` where possible; full email only in restricted indexes.

## Implementation phases

| Phase | Deliverable |
|-------|-------------|
| P3.1 | Evidence matrix rows for log aggregation |
| P3.2 | OTel exporter config in `infra/helm` observability values |
| P3.3 | Pen test includes log tampering scenarios |

## Open items

- Vendor selection (Splunk / Datadog / Elastic) — procurement.
- Cross-border log residency — map to GDPR DPA.
