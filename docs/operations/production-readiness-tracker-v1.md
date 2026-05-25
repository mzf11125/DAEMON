# Production readiness tracker v1

Extended index (risks, ADRs, workstream owners). **Canonical phase gate tracker:** [production-readiness-v1.md](./production-readiness-v1.md). Phase 0 detail: [p1-staging-pilot-closeout-v1.md](./p1-staging-pilot-closeout-v1.md).

Status legend: ✅ done · 🟡 in progress · 🔴 not started · ⛔ blocked.

## Locked decisions (do not relitigate without ADR)

| # | Topic | Decision | Reference |
|---|-------|----------|-----------|
| 1 | Cloud + orchestration | Self-managed K8s + Supabase Cloud + ClickHouse Cloud + Neo4j Aura | Plan §1 |
| 2 | GA scope | Platform-only (no default vertical pack) | Plan §2 |
| 3 | Compliance | SOC 2 Type II + GDPR + HIPAA + ISO 27001 | Plan §3 |
| 4 | Agents at GA | P3 included (full maturation criteria) | Plan §4 |
| 5 | Sequencing | Sequential, quality-first | Plan §5 |

## Phase status

| Phase | Window | Status | Gate evidence |
|-------|--------|--------|---------------|
| **P0** Close P1 staging pilot | M1 | 🟡 repo done / operator pending | [`phase0-exit-gates-v1.md`](./phase0-exit-gates-v1.md), [`phase0-operator-runbook-v1.md`](./phase0-operator-runbook-v1.md) |
| **P1** Production foundations | M2–M4 | 🟡 scaffold in repo | [`phase1-closeout-v1.md`](./phase1-closeout-v1.md), [`infra/helm/README.md`](../../infra/helm/README.md) |
| **P2** Production hardening | M5–M6 | 🟡 scaffold in repo | [`phase2-closeout-v1.md`](./phase2-closeout-v1.md), [supply-chain.yml](../../.github/workflows/supply-chain.yml) |
| **P3** Compliance controls implementation | M7–M9 | 🟡 matrices + ADR | [`phase3-closeout-v1.md`](./phase3-closeout-v1.md), [adr-siem-v1.md](../architecture/adr-siem-v1.md) |
| **P4** Observation period + P3 agent finalization | M10–M12 | 🟡 program docs | [`phase4-closeout-v1.md`](./phase4-closeout-v1.md), [agent-red-team-v1.md](../governance/agent-red-team-v1.md) |
| **P5** External assurance | M13 | 🟡 schedule | [`phase5-closeout-v1.md`](./phase5-closeout-v1.md), [pen-test-schedule-v1.md](./pen-test-schedule-v1.md) |
| **P6** GA dress rehearsal | M14 | 🟡 drill docs | [`phase6-closeout-v1.md`](./phase6-closeout-v1.md), [staging-failover-drill-v1.md](./staging-failover-drill-v1.md) |
| **P7** Audits + GA launch | M15–M16 | 🟡 checklists | [`phase7-closeout-v1.md`](./phase7-closeout-v1.md), [ga-cutover-checklist-v1.md](./ga-cutover-checklist-v1.md) |
| **P8** Post-GA sustaining | M17+ | 🔴 not started | TBD |

## Phase 0 deliverables

| # | Item | Owner | State | Reference |
|---|------|-------|-------|-----------|
| P0.1 | Finish 7-day eval baseline observation (D3–D7) | AI/ML | 🟡 D0–D3 green | [`agent-maturation-p3-v1.md`](../governance/agent-maturation-p3-v1.md) |
| P0.2 | Set GitHub ruleset to **Active** on `main` | Platform admin | 🟡 ready to apply | [`github-rulesets-v1.md`](../governance/github-rulesets-v1.md) |
| P0.3 | Provision staging environment with non-localhost URLs | Platform | 🟡 provisional | Tunnel proof 2026-05-25 — [`phase0-staging-tunnel-env.sh`](../../scripts/phase0-staging-tunnel-env.sh); VM/K8s TBD — [`staging-deploy-v1.md`](./staging-deploy-v1.md) |
| P0.4 | Fill OIDC + RLS verification staging hostname rows | Security + Platform | ✅ 2026-05-25 | [`oidc-rls-verification-v1.md`](./oidc-rls-verification-v1.md) |
| P0.5 | Resolve every stop-the-line item (G3, G4a, G4b, G5) | Multi | ✅ verified clean | [`p1-staging-pilot-closeout-v1.md`](./p1-staging-pilot-closeout-v1.md) |
| P0.6 | Replace audit retention "TBD" with draft policy (7y / 90d) | Compliance + Platform | ✅ done | [`audit-retention-v1.md`](../governance/audit-retention-v1.md) |
| P0.7 | Tag `v0.1.0` (P1 staging pilot) | Platform | 🔴 not started | [`release-tagging-v1.md`](./release-tagging-v1.md) |
| P0.8 | Mark `adr-aws-deployment-v1.md` superseded | Platform | ✅ done | ADR file reads "Superseded" pointing to P1.1 |
| P0.9 | Update `staging-deploy-v1.md` with locked GA decisions | Platform | ✅ done | K8s + Supabase Cloud + CH Cloud + Neo4j Aura refs present |

## Phase 0 exit gates

- [ ] Last 5 PRs to `main` have all four required CI jobs (`validate`, `aip-eval`, `integration`, `policy`) green.
- [ ] `./scripts/prove-operational-loop.sh` passes against **staging** URLs (not localhost).
- [ ] `./scripts/prove-aip-eval.sh` passes against staging.
- [ ] `./scripts/smoke-agent-bridge.sh` passes against staging.
- [ ] Stop-the-line dashboard empty (zero open items).
- [ ] `audit-retention-v1.md` no longer contains "TBD".
- [ ] Tag `v0.1.0` published.

## Phase 1 deliverables (preview, locked once Phase 0 closes)

| # | Item | Workstream | Repo state |
|---|------|------------|------------|
| P1.1 | ADR `adr-cluster-provider-v1.md` (EKS / GKE / AKS / on-prem decision) | Platform | ✅ draft |
| P1.2 | ADR `adr-secrets-store-v1.md` (Vault vs cloud-native) | Security + Platform | ✅ draft |
| P1.3 | Terraform modules under `infra/terraform/` | Platform | ✅ skeleton |
| P1.4 | Helm charts under `infra/helm/` for Go services + apps | Platform | ✅ 8 charts |
| P1.5 | GitOps `infra/gitops/` (ArgoCD) | Platform | ✅ apps |
| P1.6 | Supabase Cloud projects (staging + prod) with migrations | Data + Security | operator |
| P1.7 | ClickHouse Cloud orgs (staging + prod) with KMS | Data | operator |
| P1.8 | Neo4j Aura instances (staging + prod) | Data | operator |
| P1.9 | Object storage migration off MinIO (S3-compatible) | Data + Platform | operator |
| P1.10 | Secrets store + external-secrets-operator wiring | Security + Platform | TF stub |
| P1.11 | OTel + Prometheus + Grafana + Loki + Tempo deployed | Platform | stub rules |
| P1.12 | LangSmith mandatory in staging + prod | AI/ML | doc + ADR |
| P1.13 | Image build with SBOM + cosign + digest-pin GitOps | Platform + Security | ✅ workflow |
| P1.14 | `infra/kubernetes/README.md` manifest index | Platform | ✅ |
| P1.15 | Tag `v0.2.0` (production foundations) | Platform | operator |
| P1.16 | ADR AI inference + LLM routing + MCP governance | AI + Security | ✅ |

## Cross-cutting workstream owners

| Workstream | Lead | Phases |
|------------|------|--------|
| Security program | CISO | 1–8 |
| Compliance program | GRC owner | 0–8 |
| Platform engineering | Platform lead | 1–8 |
| Data engineering | Data lead | 1–8 |
| Application engineering | App lead | 0–8 |
| AI/ML engineering | AI lead | 0–8 |
| Customer ops | CS lead | 6–8 |
| Documentation | Tech writer | 0–8 |

## Open ADRs to draft (Phase 1 work, listed here for visibility)

| ADR | Decision needed | Phase |
|-----|-----------------|-------|
| `adr-cluster-provider-v1.md` | EKS vs GKE vs AKS vs on-prem | P1 |
| `adr-secrets-store-v1.md` | Vault vs cloud-native | P1 |
| `adr-siem-v1.md` | Loki + alerting vs hosted SIEM | P3 |
| `adr-status-page-v1.md` | Statuspage vs cstate self-hosted | P6 |
| `adr-billing-v1.md` | Stripe / Paddle / Maxio | P6 |
| `adr-region-strategy-v1.md` | First GA region(s) and EU pin | P3 / P6 |

## Risk register snapshot

Mirrors plan §"Risk register" — full register lives in the plan file.

| Risk | Severity | Owner |
|------|----------|-------|
| SOC 2 observation period regression forces 90d restart | High | Compliance |
| Pen test surfaces critical AI surface vulns | High | Security |
| Supabase Cloud / CH Cloud / Neo4j Aura outage during observation | High | Platform |
| P3 eval flake > target, blocks GA | Medium | AI/ML |
| HIPAA scope creep from a vertical pack | Medium | Legal + GRC |
| Audit retention legal review changes the policy mid-implementation | Medium | Legal + GRC |
| Multi-region demand pre-GA | Low | Platform |

## Phase deliverable artifact index (templates complete)

| Phase | Artifact | Path |
|-------|----------|------|
| 2.5 | Audit archival pipeline | [pipelines/audit-archival/README.md](../../pipelines/audit-archival/README.md) |
| 2.5 | Postgres migration 009 | [infra/migrations/postgres/009_audit_event_class_and_archive_batches.sql](../../infra/migrations/postgres/009_audit_event_class_and_archive_batches.sql) |
| 3 | Compliance index | [compliance/README.md](../compliance/README.md) |
| 3 | SOC 2 control matrix | [compliance/soc2-control-matrix-v1.md](../compliance/soc2-control-matrix-v1.md) |
| 3 | ISO 27001 SoA | [compliance/iso27001-soa-v1.md](../compliance/iso27001-soa-v1.md) |
| 3 | HIPAA safeguards | [compliance/hipaa-safeguards-matrix-v1.md](../compliance/hipaa-safeguards-matrix-v1.md) |
| 3 | GDPR DPIA | [compliance/gdpr-dpia-platform-v1.md](../compliance/gdpr-dpia-platform-v1.md) |
| 3 | GDPR ROPA | [compliance/gdpr-ropa-v1.md](../compliance/gdpr-ropa-v1.md) |
| 3 | DPA / BAA / sub-processors | [compliance/dpa-baa-subprocessors-v1.md](../compliance/dpa-baa-subprocessors-v1.md) |
| 3 | Privacy review log | [compliance/privacy-review-log-v1.md](../compliance/privacy-review-log-v1.md) |
| 4 | Agent red-team plan | [security/agent-redteam-v1.md](../security/agent-redteam-v1.md) |
| 5 | Pen test ROE | [security/penetration-test-roe-v1.md](../security/penetration-test-roe-v1.md) |
| 6 | Status page templates | [operations/status-page-templates-v1.md](./status-page-templates-v1.md) |
| 6 | Customer onboarding | [operations/customer-onboarding-playbook-v1.md](./customer-onboarding-playbook-v1.md) |
| 6 | Support severity matrix | [operations/support-severity-matrix-v1.md](./support-severity-matrix-v1.md) |
| 7 | GA launch + cutover | [operations/ga-launch-playbook-v1.md](./ga-launch-playbook-v1.md) |

All compliance/ops templates marked **draft** pending legal/GRC review — see [production-readiness-v1.md](./production-readiness-v1.md).

## Cadence

- **Weekly**: phase status standup; tracker reviewed; gate-blockers escalated.
- **Bi-weekly**: ADR review board for any open `adr-*-v1.md` drafts.
- **Monthly**: phase exit gate review; update tracker phase column; refresh risk severity.
- **Quarterly**: DR drill (from P2 onward); tabletop incident response (from P3 onward).

## Update protocol

Whenever a deliverable changes state:

1. Update the `State` column in this tracker.
2. Link the evidence (PR, run URL, doc, ticket).
3. If a phase exit gate flips green, update the phase status row.
4. If a stop-the-line condition triggers, update [`stop-the-line-policy-v1.md`](./stop-the-line-policy-v1.md) and freeze the phase advance.
