# Audit retention v1

- Table: `audit_log` (tenant-scoped, RLS).
- Writer: ontology actions via `recordAudit`; platform-api POST for external events.
- Reader: `GET /v1/audit/events` with filters.

**Retention (local):** indefinite until `supabase db reset`.

**Production (TBD):** align with customer policy — typically 7y financial / 90d operational tiers; implement archival job before GA.
