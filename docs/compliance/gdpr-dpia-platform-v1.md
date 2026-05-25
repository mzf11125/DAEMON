# GDPR Data Protection Impact Assessment (DPIA) — platform template v1

Article 35 GDPR — template for DAEMON **platform** processing. Complete per deployment or material feature change. **Not legal advice.**

**Owner:** DPO / GRC (TBD)  
**Status:** Draft template

## 1. Project overview

| Field | Response |
|-------|----------|
| Project name | DAEMON platform (SaaS) |
| Controller | [Legal entity TBD] |
| DPO contact | TBD |
| Date | TBD |
| Version | 0.1 |

**Description:** Multi-tenant operational intelligence — ontology-backed cases, rules, ingestion, optional AI agent proposals (human-in-the-loop for mutating actions).

## 2. Necessity and proportionality

| Question | Answer (draft) |
|----------|----------------|
| Why is processing necessary? | Enable customers to operationalize data, detect signals, manage cases |
| Could less invasive means achieve the goal? | On-prem / BYO-cloud post-GA; minimization via tenant-scoped RLS |
| Data minimization measures | Tenant isolation; field-level markings (Phase 3.5); agent trace redaction |

## 3. Processing description

| Element | Detail |
|---------|--------|
| Categories of data subjects | Customer employees; end users of customer systems (indirect) |
| Personal data categories | Identifiers, professional email, audit metadata, optional case notes |
| Special categories | Not intended by default; customer-configured content may include — customer as controller |
| Recipients | Sub-processors per [dpa-baa-subprocessors-v1.md](./dpa-baa-subprocessors-v1.md) |
| Transfers | US/EU regions per contract; SCCs where required |
| Retention | Per [audit-retention-v1.md](../governance/audit-retention-v1.md) and DPA |

## 4. Risk assessment

| Risk ID | Description | Likelihood | Severity | Overall | Mitigation |
|---------|-------------|------------|----------|---------|------------|
| R1 | Cross-tenant leak | Low | High | Medium | RLS + CI negative tests |
| R2 | Unauthorized agent action | Medium | High | High | HITL; no mutating MCP at GA |
| R3 | Sub-processor breach | Low | High | Medium | DPAs, SOC 2 reports |
| R4 | Excessive retention | Medium | Medium | Medium | Tiered retention + erasure runbook |
| R5 | LLM prompt exfiltration | Medium | High | High | ai-surface-review; egress policy |

## 5. Measures to address risks

- Technical: OIDC, RLS, encryption, audit logging, archival hash chain
- Organizational: Access reviews, privacy review log, incident response
- Agent-specific: [agent-redteam-v1.md](../security/agent-redteam-v1.md)

## 6. Consultation

| Stakeholder | Consulted | Date | Outcome |
|-------------|-----------|------|---------|
| DPO | TBD | | |
| Engineering | TBD | | |
| Customer (pilot) | TBD | | |
| Supervisory authority | Only if residual high risk remains | | |

## 7. Approval and review

| Role | Name | Date |
|------|------|------|
| DPO sign-off | | |
| Executive sponsor | | |
| Next review trigger | Material new sub-processor, new region, or agent autonomy change |

## 8. Annex references

- [gdpr-ropa-v1.md](./gdpr-ropa-v1.md)
- [privacy-review-log-v1.md](./privacy-review-log-v1.md)
- [dpa-baa-subprocessors-v1.md](./dpa-baa-subprocessors-v1.md)
