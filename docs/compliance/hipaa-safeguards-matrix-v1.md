# HIPAA technical safeguards matrix v1 — draft

Platform-level mapping for customers who execute a **BAA** with DAEMON when processing **PHI** in the service. This document does **not** constitute a BAA, legal determination of covered entity status, or attestation of compliance.

**Owner:** GRC + Legal  
**Status:** Draft for Phase 3.3 review

## Administrative safeguards (45 CFR §164.308) — platform responsibilities

| Safeguard | Standard | DAEMON platform posture | Customer responsibility | Evidence |
|-----------|----------|----------------------|-------------------------|----------|
| Security management | §164.308(a)(1) | Risk register; security program | Own risk analysis for PHI workflows | Tracker |
| Workforce security | §164.308(a)(3) | Employee access least-privilege | Train users; role assignment | IAM |
| Information access | §164.308(a)(4) | RBAC + tenant RLS | Minimum necessary in product config | OIDC doc |
| Security awareness | §164.308(a)(5) | Annual training planned | Workforce training | HR |
| Contingency plan | §164.308(a)(7) | DR drills; backup via managed DB | BCP for clinical workflows | DR log |
| Evaluation | §164.308(a)(8) | Internal audit + SOC 2 path | Periodic evaluation | Phase 5 |

## Physical safeguards (§164.310)

| Safeguard | Standard | DAEMON posture | Notes |
|-----------|----------|----------------|-------|
| Facility access | §164.310(a) | N/A — cloud provider | Relies on Supabase/CH/Aura SOC 2 |
| Workstation | §164.310(b) | Corporate policy for staff | Customer endpoints out of scope |
| Device/media controls | §164.310(d) | No PHI on employee laptops in prod | Logs redacted in LangSmith |

## Technical safeguards (§164.312) — primary engineering focus

| Safeguard | Standard | DAEMON implementation | Status | Evidence |
|-----------|----------|----------------------|--------|----------|
| Access control | §164.312(a)(1) | Unique user IDs via Auth; emergency access procedure TBD | Partial | platform-api |
| Emergency access | §164.312(a)(2)(ii) | Break-glass runbook TBD | Planned | Runbook |
| Automatic logoff | §164.312(a)(2)(iii) | JWT expiry; session config in Auth | Implemented | Supabase settings |
| Encryption/decryption | §164.312(a)(2)(iv) | TLS 1.2+; provider encryption at rest | Partial | Cloud |
| Audit controls | §164.312(b) | `audit_log` + `event_class`; 6y financial tier | Partial | audit-retention |
| Integrity | §164.312(c)(1) | Hash-chained cold archives | Partial | Migration 009 |
| Authentication | §164.312(d) | OIDC / Supabase Auth | Implemented | Auth migration |
| Transmission security | §164.312(e)(1) | TLS on all API paths | Implemented | Ingress |

## Documentation (§164.316)

| Requirement | DAEMON artifact |
|-------------|-----------------|
| Policies | Security overview + this matrix (draft) |
| Procedures | Runbooks under `docs/operations/runbooks/` |
| Records | `audit_log`, `audit_archive_batches`, change history in Git |

## BAA template pointer

Full BAA language lives in [dpa-baa-subprocessors-v1.md](./dpa-baa-subprocessors-v1.md) § Business Associate Agreement (legal draft TBD).

## Human review required

- [ ] Legal confirms scope of PHI in default platform vs optional healthcare pack
- [ ] Confirm minimum retention meets §164.530(j) for applicable workflows
- [ ] Sign BAA only after DPIA and sub-processor DPAs executed
