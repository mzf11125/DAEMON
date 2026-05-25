# RB-DR-02 — Postgres point-in-time restore

**Severity:** P1 if primary unavailable; P2 if a single tenant's data corrupted
**Owner:** Data engineering on-call
**Estimated time:** 30–90 min for PITR; ≤ 4h end-to-end
**Last drilled:** TBD

## Triggers

- Logical corruption: tenant requests a row-level restore for a known timestamp.
- Operator error: bad migration / accidental delete.
- Primary region down (RB-DR-01 calls this for the database half).

## Pre-conditions

- Supabase Cloud project with PITR enabled (verified in Phase 1.2).
- Vault contains `daemon/<env>/runtime/DATABASE_URL` and admin URL (separately).
- DR project provisioned in target region (Phase 1.2).

## Steps — full restore (RB-DR-01 path)

1. Open Supabase Cloud dashboard for the DR project.
2. Restore from PITR snapshot to a wall-clock timestamp ≤ RPO (1h).
3. Verify migration version after restore:
   ```bash
   psql "$ADMIN_DATABASE_URL" -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;"
   ```
4. Re-apply ontology compile data and seed if needed:
   ```bash
   make migrate
   make ontology-sync
   ```
5. Run RLS verification:
   ```bash
   ./scripts/verify-auth-migration.sh
   ```
6. Update DR `DATABASE_URL` in Vault if endpoint changed; trigger ESO refresh (`kubectl annotate externalsecret platform-api-runtime force-sync=$(date +%s)`).
7. Validate from app: `curl -sf "$PLATFORM_API_URL/health"` and a tenant-scoped `GET /v1/objects/Signal` with valid JWT.

## Steps — partial / row-level restore

1. Spin up an ephemeral PITR clone (Supabase "branch" feature or a separate restored project).
2. Identify rows to restore via `tenant_id` + `case_id` / `signal_id` filter.
3. `pg_dump` filtered tables from clone; review with stakeholder + legal if PII involved.
4. `psql -c "BEGIN; <INSERT...ON CONFLICT...>; COMMIT;"` against production with explicit transaction.
5. Audit the change — append to `audit_log` with class `security` (Phase 2.5 schema).
6. Tear down ephemeral clone.

## Compliance evidence

- SOC 2 A1.2 + CC7.5
- ISO 27001 A.8.13 (information backup) + A.8.14 (redundancy)
- HIPAA 45 CFR 164.308(a)(7)(ii)(B)
- GDPR Art. 32(1)(c)

## Stop-the-line conditions

- Migration version after restore differs from main → freeze writes; investigate before lifting maintenance banner.
- Custom access token hook missing post-restore → restore from migrations 004/005; verify `verify-auth-migration.sh`.
