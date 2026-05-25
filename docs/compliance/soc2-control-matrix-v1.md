# SOC 2 Type II control matrix v1

Status: **draft** (Phase 3 — implementation target). Maps Trust Services Criteria to actual DAEMON platform controls.

## AI / LLM controls (Phase 3 gate)

| Ref | Control | Evidence |
|-----|---------|----------|
| AI-1 | MCP tool allowlist | [adr-mcp-tool-governance-v1.md](../architecture/adr-mcp-tool-governance-v1.md), `aip-eval` CI |
| AI-2 | No customer content for model training | [adr-llm-routing-v1.md](../architecture/adr-llm-routing-v1.md), DPA subprocessors |
| AI-3 | Inference plane isolation | [adr-ai-inference-plane-v1.md](../architecture/adr-ai-inference-plane-v1.md), NetworkPolicy |
| AI-4 | Agent audit logging | Platform audit ingest + `event_class` taxonomy |

## Trust Services Criteria — CC Series (Common Criteria)

### CC1 — Control Environment

| Ref | Criterion | DAEMON control | Evidence |
|-----|-----------|----------------|----------|
| CC1.1 | Management oversight | ARB reviews per `security/program-v1.md`; quarterly mgmt review | Meeting minutes, charter |
| CC1.2 | Integrity & ethics | Code of conduct; vendor-neutral OSS policy | AUP / handbook |
| CC1.3 | Board independence | N/A (single entity); advisory board structure TBD | — |
| CC1.4 | Org structure | Engineering → GRC → CISO accountability chain | Org chart |
| CC1.5 | Workforce competence | Role-based training; access gated by role | Training records |

### CC2 — Communication and Information

| Ref | Criterion | DAEMON control | Evidence |
|-----|-----------|----------------|----------|
| CC2.1 | Internal communication | Incident channels; ARB escalation; stop-the-line | `stop-the-line-policy-v1.md` |
| CC2.2 | External communication | Public status page; security.txt; responsible disclosure | `security/cvd-policy-v1.md` |
| CC2.3 | Communication of deficiencies | Post-incident reviews; audit findings tracking | `post-incident-template.md` |

### CC3 — Risk Assessment

| Ref | Criterion | DAEMON control | Evidence |
|-----|-----------|----------------|----------|
| CC3.1 | Risk identification | Annual ISMS risk assessment; threat modeling per PR | `security/risk-register-v1.md` |
| CC3.2 | Risk analysis | Likelihood × impact matrix; FAIR-lite scoring | Risk register |
| CC3.3 | Risk response | Accept / mitigate / transfer / avoid per treatment plan | Risk treatment plan |

### CC4 — Monitoring Activities

| Ref | Criterion | DAEMON control | Evidence |
|-----|-----------|----------------|----------|
| CC4.1 | Ongoing monitoring | OTel + Prometheus + Grafana; burn-rate alerts | Dashboards |
| CC4.2 | Separate evaluations | Quarterly internal ISMS audit; annual pen test | Audit reports |
| CC4.3 | Findings remediation | CAPA tracking; severity-based SLAs | Issue tracker |

### CC5 — Control Activities

| Ref | Criterion | DAEMON control | Evidence |
|-----|-----------|----------------|----------|
| CC5.1 | Control selection | SOC 2 TSC mapping; Annex A SoA; HIPAA matrix | This doc + [iso27001-soa-v1.md](./iso27001-soa-v1.md) |
| CC5.2 | Technology controls | Infrastructure-as-Code; GitOps; code signing (cosign) | CI pipeline |
| CC5.3 | Policies & procedures | ISMS policy stack; documented runbooks | `docs/operations/runbooks/` |

### CC6 — Logical and Physical Access

| Ref | Criterion | DAEMON control | Evidence |
|-----|-----------|----------------|----------|
| CC6.1 | **Access provisioning** | JWT via Supabase Auth; roles (`admin` / `operator` / `viewer`); least-privilege for DB runtime users | Supabase dashboard + Postgres grants |
| CC6.2 | **User access review** | Quarterly export from Supabase + GitHub; review by GRC | Access review records |
| CC6.3 | **Terminated user removal** | Immediate via Supabase admin + offboard tenant procedure | Runbook `RB-TENANT-03.md` |
| CC6.4 | **External access** | Vendors via named sub-processor DPA; no direct DB access to production data | Sub-processor register |
| CC6.5 | **Physical access** | Cloud provider responsibility (Supabase, AWS/GCP); DAEMON has no on-prem infra | Provider SOC 2 reports |
| CC6.6 | **Encryption at rest** | Supabase Cloud (TDE on Postgres), ClickHouse Cloud (KMS), Neo4j Aura, S3 with KMS | Provider attestations |
| CC6.7 | **Encryption in transit** | TLS 1.3 north-south; mTLS service-to-service (K8s mesh) | Cert-manager + trustPolicy |
| CC6.8 | **Vulnerability management** | Weekly `govulncheck` + `pnpm audit` + Snyk scans; dependency review | CI `supply-chain` job; `pnpm audit` |

### CC7 — System Operations

| Ref | Criterion | DAEMON control | Evidence |
|-----|-----------|----------------|----------|
| CC7.1 | **System monitoring** | OTel tracing + Prometheus metrics + LTEM logs; alert routing to PagerDuty | Dashboards |
| CC7.2 | **Security event monitoring** | SIEM — Loki alert rules + Grafana Alerting (or managed SIEM per Phase 3.1 ADR-`siem-v1`) | SIEM config |
| CC7.3 | **Incident response** | IR plan with severity matrix; post-incident template; annual tabletop drill | `post-incident-template.md` |
| CC7.4 | **Change management** | GitHub ruleset, PR review, CI gates, ArgoCD deploy approvals | CI + GitOps pipeline |
| CC7.5 | **Backup and recovery** | Daily PG WAL + cross-region replication; quarterly DR drill | DR drill log; RTO attestation |

### CC8 — Change Management

| Ref | Criterion | DAEMON control | Evidence |
|-----|-----------|----------------|----------|
| CC8.1 | **Change authorization** | PR required on `main` (ruleset); CI gates mandatory; ArgoCD manual prod approval | GitHub ruleset; CI config |
| CC8.2 | **Change testing** | Integration + e2e-full CI jobs; staging auto-deploy; canary promotion | CI matrix |
| CC8.3 | **Emergency changes** | Admin bypass with documented exception; post-hoc review | Runbook `RB-DEPLOY-01.md` |
| CC8.4 | **Production data** | SQL migrations tested on staging first; no manual production writes outside runbook | Runbook `RB-DR-02.md` |

### CC9 — Risk Mitigation

| Ref | Criterion | DAEMON control | Evidence |
|-----|-----------|----------------|----------|
| CC9.1 | **Risk management program** | ISMS risk register with annual review; quarterly mgmt review | Risk register |
| CC9.2 | **Vendor risk** | Sub-processor register with DPAs; annual vendor security review | Sub-processor register |

## Trust Services Criteria — Supplementary

### A1 — Availability

| Ref | Criterion | DAEMON control | Evidence |
|-----|-----------|----------------|----------|
| A1.1 | Availability commitments | SLI/SLO program (6 J-targets); 99.9% target platform availability | `slo-spec-v1.md` |
| A1.2 | Recovery objectives | RTO 4h / RPO 1h platform tier; RTO 24h / RPO 24h analytics | DR runbooks |
| A1.3 | Capacity management | Auto-scaling (HPA) + capacity plan; load-test baseline | `capacity-plan-v1.md` |

### C1 — Confidentiality

| Ref | Criterion | DAEMON control | Evidence |
|-----|-----------|----------------|----------|
| C1.1 | Confidential information identification | Data classification scheme (public / internal / confidential / restricted) | `data-classification-v1.md` |
| C1.2 | Confidentiality protection | Encryption at transit and rest; access control via RLS + JWT | RLS policies + TLS config |

### P1 — Processing Integrity

| Ref | Criterion | DAEMON control | Evidence |
|-----|-----------|----------------|----------|
| P1.1 | Processing integrity | Idempotent actions; validation before mutation; `WithRLSTx` everywhere | `packages/go-common/db/claims.go` |
| P1.2 | Data quality | Checks pipeline; `express_cargo_sim_test.go` verifies signal → case linkage | Integration test suite |

## Evidence collection cadence

| Evidence type | Frequency | Owner | Tool |
|---------------|-----------|-------|------|
| Access review | Quarterly | GRC | Supabase export + GitHub audit log |
| Backup verification | Monthly (automated) + quarterly (manual drill) | Platform | DR drill script |
| Vulnerability scan logs | Weekly (CI) + monthly (full scan) | Security | CI + Snyk |
| Change management evidence | Continuous (CI) | Platform | GitHub ruleset audit log |
| Security incident log | Always-on | Security | Incident tracker |
| Vendor DPAs | Annually | GRC | Contracts register |
| Management review | Quarterly | CISO + GRC | Meeting minutes |

## Auditor workpaper index

Per Phase 7 fieldwork, auditor will receive:

1. This control matrix with evidence links (digital)
2. Access review exports (XLSX)
3. Change management log (GitHub API export)
4. Backup / DR drill logs (`docs/operations/dr-drill-log.md`)
5. Vulnerability scan history (CI artifacts)
6. Incident log (tracker export)
7. Vendor assessment files (DPA library)
8. Policy documents (Confluence / repo docs)
