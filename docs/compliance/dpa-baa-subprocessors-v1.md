# DPA, BAA, and sub-processor register v1 — draft

**Not legal advice.** Counsel must approve customer-facing DPA/BAA before signature.

**Owner:** Legal + GRC  
**Status:** Template — Phase 3.4 / 3.5

---

## 1. Data Processing Agreement (DPA) — outline

Standard DPA modules (customer = controller, DAEMON = processor):

| Clause | Summary |
|--------|---------|
| Subject matter | Operational intelligence platform services |
| Duration | Term of MSA |
| Nature & purpose | Storage, computation, audit, optional AI proposals |
| Types of personal data | As described in ROPA P1–P5 |
| Categories of subjects | Customer-authorized users |
| Processor obligations | Art. 28 GDPR — subprocessors, assistance, deletion, audit |
| Sub-processors | List below; 30-day objection window |
| Security | Annex: SOC 2 / ISO control summary |
| Transfers | SCCs Module 2 (draft) for non-adequate countries |
| Breach notification | 72 hours to controller |

**Template file:** Store executed customer DPAs in contract repository (not in git).

---

## 2. Business Associate Agreement (BAA) — outline

For US healthcare customers processing PHI:

| Element | Notes |
|---------|-------|
| Permitted uses | Platform services per order form |
| Safeguards | Reference [hipaa-safeguards-matrix-v1.md](./hipaa-safeguards-matrix-v1.md) |
| Subcontractors | BAAs with sub-processors handling PHI |
| Breach reporting | Per HIPAA timelines |
| Termination | Return or destroy PHI |

**Template file:** Legal-owned; do not publish full text in public repo.

---

## 3. Sub-processor register

| Vendor | Purpose | Data categories | Region(s) | DPA/BAA status | Last reviewed |
|--------|---------|-----------------|-----------|----------------|---------------|
| Supabase (Postgres + Auth) | Primary OLTP, authentication | User profiles, audit_log, cases, ontology | US / EU (project TBD) | DPA required | TBD |
| ClickHouse Cloud | Analytics, features, propensity | Operational metrics, labels | US / EU TBD | DPA required | TBD |
| Neo4j Aura | Graph / link store | Entity relationships | US / EU TBD | DPA required | TBD |
| AWS (S3) | Audit cold archive | audit payloads | Per bucket region | DPA + SCC | TBD |
| OpenRouter / LLM provider | Agent inference | Prompts, completions (redacted) | US | DPA required | TBD |
| LangSmith | LLM tracing | Traces, eval artifacts | US | DPA required | TBD |
| HashiCorp Vault (if selected) | Secrets | API keys, credentials metadata | TBD | DPA required | TBD |
| Vercel / hosting (if used for console) | Static/console hosting | Session, logs | US/EU | DPA required | TBD |
| GitHub | Source, CI metadata | Engineering metadata only | US | DPA (enterprise) | TBD |

### Adding a sub-processor

1. GRC ticket + legal review
2. Update this table and customer sub-processor notification
3. Update [gdpr-ropa-v1.md](./gdpr-ropa-v1.md)
4. Verify SOC 2 / ISO report or security questionnaire

---

## 4. Customer notification template (sub-processor change)

> Subject: DAEMON sub-processor update  
>  
> We intend to engage [Vendor] for [purpose]. Data categories: [list]. Region: [region].  
> Objection deadline: [date + 30 days].  
> Contact: privacy@[domain]

---

## 5. Review cadence

- **Quarterly:** Refresh vendor attestations
- **On new vendor:** Before production dependency
- **Annual:** Full register sign-off by Legal + GRC
