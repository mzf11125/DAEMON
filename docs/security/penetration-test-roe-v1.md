# External penetration test — rules of engagement v1

Template ROE for third-party penetration testing of DAEMON staging/production. **Draft** — Legal and Security must approve before vendor engagement (Phase 5).

**Owner:** Security  
**Status:** Template

## 1. Engagement summary

| Field | Value |
|-------|-------|
| Customer / target | DAEMON platform (SaaS) |
| Environment | Staging primary; production read-only optional |
| Test window | TBD (business days, timezone) |
| Vendor | TBD (qualified firm) |
| DAEMON contact | security@[domain] |
| Emergency contact | On-call rotation |

## 2. Objectives

- Identify vulnerabilities in external attack surface (APIs, console, agent bridge)
- Validate tenant isolation (RLS, JWT)
- Assess AI/agent injection surfaces per [agent-redteam-v1.md](./agent-redteam-v1.md)
- Provide remediation-ready report for SOC 2 / ISO evidence

## 3. Scope — in

| Asset | URL / identifier | Notes |
|-------|----------------|-------|
| Platform API | `https://api.staging.[domain]/v1/*` | Authenticated tests |
| Ontology service | staging internal + public routes | Per network diagram |
| Console web | `https://app.staging.[domain]` | OWASP ASVS L2 target |
| Agent bridge | staging agent route | No production customer data |
| Supabase Auth | staging project | Test accounts only |

## 4. Scope — out of scope (OOS)

| Item | Rationale |
|------|-----------|
| Denial-of-service / load flooding | Separate capacity test |
| Social engineering of employees | Not in SOW |
| Third-party Supabase/CH/Aura infrastructure | Covered by vendor SOC 2 |
| Customer tenant content attacks on other customers | Use dedicated test tenants only |
| Physical security | N/A |
| Supply-chain compromise of vendor laptops | Separate assessment |

## 5. Rules of engagement

| Rule | Detail |
|------|--------|
| Authorization | Signed letter from DAEMON officer attached |
| Test accounts | Provisioned by DAEMON; no password guessing on real users |
| Data | Synthetic only in staging; no PII export in report |
| Exploitation | PoC required for High/Critical; no destructive payloads |
| Persistence | Remove all artifacts before report delivery |
| Notification | Critical findings within 24h to security@[domain] |
| Hours | 09:00–18:00 [TZ] unless pre-approved |

## 6. Testing methods allowed

- [x] Automated scanning (rate-limited)
- [x] Manual web/API testing
- [x] Authenticated testing
- [ ] Password spraying against production
- [ ] Ransomware simulation

## 7. Deliverables

| Deliverable | Due |
|-------------|-----|
| Executive summary | T+5 business days |
| Technical findings (CVSS + repro) | T+10 business days |
| Retest letter (optional) | T+30 after fixes |

## 8. Severity mapping

Align to DAEMON vulnerability management: Critical / High / Medium / Low / Informational. Critical = unauthenticated RCE or cross-tenant data breach.

## 9. Retest

- DAEMON fixes within agreed SLA
- Vendor retests at no extra cost for findings marked fixed (negotiate in SOW)
- Evidence attached to SOC 2 folder

## 10. Authorization letter (template)

> [Date]  
>  
> [Vendor] is authorized to perform security testing against DAEMON staging environment described in ROE v1 dated [date], through [end date].  
>  
> Signed: _________________________  
> Title: _________________________  
> Company: DAEMON [legal entity]
