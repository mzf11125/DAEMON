# RB-DR-05 — Total tenant data loss

**Severity:** P1 (potentially reportable breach under GDPR Art. 33 / HIPAA Breach Notification)
**Owner:** Incident commander + Compliance + Legal
**Estimated time:** 24–72h
**Last drilled:** TBD

## Triggers

- Catastrophic loss of a single tenant's data across multiple stores.
- Confirmed cross-tenant data corruption (e.g. mass `tenant_id` overwrite).
- Tenant-targeted attack with destructive payload.

## DO NOT proceed without

- Incident commander appointed.
- Legal reviewer engaged (counsel; this skill is **not** legal advice).
- Compliance lead engaged.
- Communication lead engaged (status page lockdown).

## Steps (parallel tracks)

### Track A — Containment

1. Freeze writes on the affected tenant: revoke runtime credentials, block ingress, disable agents.
2. Mark tenant `frozen` in control-plane registry; prevent CronJobs from running for that tenant.
3. Snapshot every store immediately (forensic copies — separate KMS, separate bucket, write-once).

### Track B — Forensics

1. Collect `audit_log` events for the affected tenant for the past 90 days.
2. Pull cold archive batches from object store (per [`audit-retention-v1.md`](../../governance/audit-retention-v1.md)).
3. Verify hash chain integrity end-to-end on the archive batches (Phase 2.5 verifier).
4. Reconstruct timeline: who, what, when, from where (IP / user / agent).
5. Preserve evidence; chain-of-custody log opened.

### Track C — Restoration

1. **Postgres**: PITR per RB-DR-02 to most recent uncorrupted timestamp.
2. **ClickHouse**: PITR + cold archive replay per RB-DR-03.
3. **Neo4j**: snapshot + audit-log replay per RB-DR-04.
4. **Object store** (attachments): version restore per object; verify Object Lock didn't permit deletion.

### Track D — Notification

1. **GDPR Art. 33**: if personal data breach is "likely to result in a risk", notify supervisory authority within **72h** of becoming aware. Use [`incident-comms-templates-v1.md`](../incident-comms-templates-v1.md).
2. **HIPAA Breach Notification Rule**: if PHI involved (and tenant uses a healthcare-ops pack), notify affected individuals within **60 days**; HHS within 60 days for breaches affecting < 500; immediately for ≥ 500.
3. **Customer DPA**: most DPAs require notice within 24–72h. Check signed DPA.
4. **Internal**: exec brief; board notice if material.

### Track E — Post-incident

1. Post-incident review per [`post-incident-template.md`](../post-incident-template.md).
2. Stop-the-line review per [`stop-the-line-policy-v1.md`](../stop-the-line-policy-v1.md).
3. Insurance notification (cyber policy carrier).
4. Customer remediation: credits, free service period, written commitments.
5. Update DR drill schedule to include this scenario.

## Compliance evidence

- SOC 2 CC7.3 + CC7.4 + CC7.5 (incident response)
- ISO 27001 A.5.24 / A.5.25 / A.5.26 / A.5.27 (incident management)
- HIPAA 45 CFR 164.404 / 164.406 / 164.408 (breach notification)
- GDPR Art. 33 / Art. 34 (notification)

## Open items (Phase 3)

- [ ] Cyber insurance carrier list + 24h notification path.
- [ ] Forensic retainer with external IR firm (Phase 5 pen-test partner is a candidate).
- [ ] Tabletop exercise of this runbook in Phase 6 dress rehearsal.
