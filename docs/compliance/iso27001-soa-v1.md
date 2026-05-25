# ISO 27001 Statement of Applicability (SoA) v1 — draft

Annex A control applicability for the DAEMON platform ISMS. **Template** — Legal and certification body review required before external audit (Phase 7).

**ISMS scope (draft):** DAEMON multi-tenant operational intelligence platform — SaaS APIs, data pipelines, AIP agent bridge, console — hosted on customer-contracted cloud regions.

**Owner:** GRC  
**Version:** 0.1-draft

## SoA table

| Annex A ref | Control title | Applicable | Justification if N/A | Implementation summary | Status | Evidence |
|-------------|---------------|----------|----------------------|------------------------|--------|----------|
| A.5.1 | Policies for information security | Yes | — | Security + compliance doc set under `docs/security`, `docs/compliance` | Partial | Policy index |
| A.5.2 | Information security roles | Yes | — | RACI in readiness tracker | Partial | Tracker |
| A.5.9 | Inventory of information | Yes | — | Asset inventory in sub-processor + data maps | Partial | ROPA |
| A.5.10 | Acceptable use | Yes | — | Customer + employee AUP TBD | Planned | Legal |
| A.5.15 | Access control | Yes | — | OIDC, RBAC, RLS | Partial | OIDC doc |
| A.5.23 | Information security for cloud | Yes | — | Shared responsibility with Supabase/CH/Aura | Partial | Vendor DPAs |
| A.5.28 | Collection of evidence | Yes | — | `audit_log`, cold archive | Partial | Migration 009 |
| A.5.29 | Information security during disruption | Yes | — | DR runbooks | Partial | DR log |
| A.5.30 | ICT readiness for BC | Yes | — | RTO/RPO in SLO spec | Planned | slo-spec |
| A.6.1 | Screening | Yes | — | HR background checks TBD | Planned | HR |
| A.6.3 | Awareness, education, training | Yes | — | Security onboarding | Planned | HR |
| A.8.1 | User endpoint devices | Partial | BYOD policy for engineers | Corporate MDM TBD | Planned | IT |
| A.8.2 | Privileged access | Yes | — | Break-glass; no shared prod creds | Partial | Secrets ADR |
| A.8.3 | Information access restriction | Yes | — | Tenant isolation RLS | Implemented | Integration tests |
| A.8.5 | Secure authentication | Yes | — | Supabase Auth + JWT | Implemented | platform-api |
| A.8.9 | Configuration management | Yes | — | GitOps + Helm | Planned | Phase 1 |
| A.8.10 | Information deletion | Yes | — | Retention tiers + erasure procedure | Partial | audit-retention |
| A.8.15 | Logging | Yes | — | audit_log, OTel | Partial | Services |
| A.8.16 | Monitoring activities | Yes | — | Prometheus/Grafana Phase 1 | Planned | Phase 1 |
| A.8.24 | Use of cryptography | Yes | — | TLS, KMS | Partial | Cloud config |
| A.8.25 | Secure development lifecycle | Yes | — | CI gates, maturation policy | Implemented | ci.yml |
| A.8.28 | Secure coding | Yes | — | PR review, go vet, integration tests | Implemented | CI |
| A.8.29 | Security testing in development | Yes | — | RLS tests, aip-eval, pen test Phase 5 | Partial | security docs |
| A.8.30 | Outsourced development | Partial | Contractors under NDA | Vendor agreements | Planned | Legal |

## Risk treatment references

Link each applicable control to risks in the organizational risk register (export from GRC tool). Minimum risks to document:

- Cross-tenant data leak (RLS misconfiguration)
- Agent prompt injection → unauthorized action
- Sub-processor breach
- Audit log tampering (mitigated by hash chain + WORM)

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| ISMS owner | TBD | | |
| CISO | TBD | | |
| Legal | TBD | | |
