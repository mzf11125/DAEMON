# Production readiness v1 (16-month plan tracker)

Living tracker for **P1 staging pilot → P2 GA** keyed to the locked 16-month production sequencing. Update this file when a gate flips; do not use Notion as source of truth.

**Companion docs:** [p1-staging-pilot-closeout-v1.md](./p1-staging-pilot-closeout-v1.md) (Phase 0 detail), [production-readiness-tracker-v1.md](./production-readiness-tracker-v1.md) (extended risk/ADR index).

Status: ✅ done · 🟡 in progress · 🔴 not started · ⛔ blocked (human ops / external).

## Locked decisions

| # | Topic | Decision |
|---|-------|----------|
| 1 | Cloud + orchestration | Self-managed K8s + Supabase Cloud + ClickHouse Cloud + Neo4j Aura |
| 2 | GA scope | Platform-only (no default vertical pack) |
| 3 | Compliance | SOC 2 Type II + GDPR + HIPAA + ISO 27001 |
| 4 | Agents at GA | P3 tier included (maturation criteria) |
| 5 | Sequencing | Sequential, quality-first |

---

## Phase overview and exit gates

### Phase 0 — Close P1 staging pilot (M1)

| Exit gate | State | Evidence |
|-----------|-------|----------|
| Last 5 PRs: `validate`, `integration`, `aip-eval`, `policy` green | 🟡 | Refresh `gh run list` before tag |
| `./scripts/prove-operational-loop.sh` on **staging** URLs | ✅ | In `make phase0-staging-proof` 2026-05-25 (HTTPS health + local eval after restarts) |
| `./scripts/prove-aip-eval.sh` on staging | ✅ | 8/8 eval cases in proof 2026-05-25 |
| `./scripts/smoke-agent-bridge.sh` on staging | 🟡 skip | merge-track `agent-bridge` not running; optional for Phase 0 |
| Stop-the-line dashboard empty | ✅ | [p1-staging-pilot-closeout-v1.md](./p1-staging-pilot-closeout-v1.md) |
| [audit-retention-v1.md](../governance/audit-retention-v1.md) no TBD | ✅ | Draft tiers published |
| Tag `v0.1.0` published | 🔴 | [release-tagging-v1.md](./release-tagging-v1.md) |

| Deliverable | Owner | State | Reference |
|-------------|-------|-------|-----------|
| P0.1 7-day eval D3–D7 | AI/ML | 🟡 | [agent-maturation-p3-v1.md](../governance/agent-maturation-p3-v1.md) |
| P0.2 GitHub ruleset **Active** | Platform admin | ✅ 2026-05-25 | [github-rulesets-v1.md](../governance/github-rulesets-v1.md) — `main-production-gates` enforcement active |
| P0.3 Staging env (non-localhost) | Platform | 🟡 provisional | Tunnel proof 2026-05-25; VM/K8s URLs TBD — [staging-deploy-v1.md](./staging-deploy-v1.md) |
| P0.4 OIDC staging hostname rows | Security + Platform | ✅ 2026-05-25 | [oidc-rls-verification-v1.md](./oidc-rls-verification-v1.md) |
| P0.5 Stop-the-line G3/G4a/G4b/G5 | Multi | ✅ | [stop-the-line-policy-v1.md](./stop-the-line-policy-v1.md) |
| P0.6 Audit retention draft | Compliance | ✅ | [audit-retention-v1.md](../governance/audit-retention-v1.md) |
| P0.7 Tag `v0.1.0` | Platform | 🔴 | Gated on rows above |
| P0.8 Supersede `adr-aws-deployment-v1` | Platform | 🔴 | Phase 1.1 ADR |
| P0.9 Staging doc GA decisions | Platform | ✅ | [staging-deploy-v1.md](./staging-deploy-v1.md) |

**Local CI proof (in-repo, not push):** `make ontology-sync`, `go test ./packages/go-common/rules/...`, `go test -tags=integration -run TestExpressCargoRulesEvaluate`, `make prove-staging-smoke` (localhost).

---

### Phase 1 — Production foundations (M2–M4)

| Exit gate | State |
|-----------|-------|
| ADR cluster provider + secrets store approved | 🔴 |
| Terraform/Pulumi modules + Helm charts in repo | 🔴 |
| GitOps repo wired (Argo/Flux) | 🔴 |
| Supabase Cloud + CH Cloud + Neo4j Aura (staging + prod) | 🔴 |
| OTel + Prometheus + Grafana + Loki deployed | 🔴 |
| Images: SBOM + cosign + digest-pinned GitOps | 🔴 |
| `infra/kubernetes/README.md` → real manifest index | 🔴 |
| Tag `v0.2.0` | 🔴 |

See [production-readiness-tracker-v1.md](./production-readiness-tracker-v1.md) § Phase 1 deliverables for P1.1–P1.15 checklist.

---

### Phase 2 — Production hardening (M5–M6)

| Exit gate | State |
|-----------|-------|
| `OIDC_REQUIRED=true` on all Go services in prod-like env | 🟡 local proof |
| RLS negative tests in CI + staging | ✅ in repo |
| Supply-chain CI job green | 🟡 |
| SLOs + paging wired ([slo-spec-v1.md](./slo-spec-v1.md)) | 🔴 |
| Runbooks exercised once | 🔴 |
| `pipelines/audit-archival/` skeleton + dry-run | ✅ template | [pipelines/audit-archival/README.md](../../pipelines/audit-archival/README.md) |
| Migration `009_audit_event_class_*` applied | ✅ in repo | [009_audit_event_class_and_archive_batches.sql](../../infra/migrations/postgres/009_audit_event_class_and_archive_batches.sql) |
| Tag `v0.3.0` | 🔴 |

**Phase 2.5 artifacts:** [audit-retention-v1.md](../governance/audit-retention-v1.md) (implementation table updated).  
**Verification (2026-05-25):** [phase-2.5-7-verification-v1.md](./phase-2.5-7-verification-v1.md) — ontology/maturation/stub gates PASS; CI includes `audit-archival`; `make test-audit-archival-integration` + `make audit-archival-dry-run` PASS on Supabase local (`:54332`); `make migrate-superuser` for DDL.

---

### Phase 3 — Compliance controls (M7–M9)

| Exit gate | State |
|-----------|-------|
| SOC 2 / ISO control matrix mapped to code | 🟡 draft template | [soc2-control-matrix-v1.md](../compliance/soc2-control-matrix-v1.md) |
| ISO 27001 SoA drafted | 🟡 draft template | [iso27001-soa-v1.md](../compliance/iso27001-soa-v1.md) |
| HIPAA safeguards matrix (platform) | 🟡 draft template | [hipaa-safeguards-matrix-v1.md](../compliance/hipaa-safeguards-matrix-v1.md) |
| GDPR DPIA + ROPA templates | 🟡 draft template | [gdpr-dpia-platform-v1.md](../compliance/gdpr-dpia-platform-v1.md), [gdpr-ropa-v1.md](../compliance/gdpr-ropa-v1.md) |
| DPA + BAA + sub-processor register | 🟡 draft template | [dpa-baa-subprocessors-v1.md](../compliance/dpa-baa-subprocessors-v1.md) |
| Privacy review log | 🟡 draft template | [privacy-review-log-v1.md](../compliance/privacy-review-log-v1.md) |
| SIEM / log retention wired | 🔴 | |
| Pen test scheduled | 🔴 | ROE template: [penetration-test-roe-v1.md](../security/penetration-test-roe-v1.md) |

**Index:** [compliance/README.md](../compliance/README.md)

---

### Phase 4 — Observation + P3 agent finalization (M10–M12)

| Exit gate | State |
|-----------|-------|
| **30 consecutive days** `aip-eval` green on `main`, flake &lt; 5% | 🔴 |
| Plugin remap weekly on staging | 🟡 |
| Mutating MCP still deferred | ✅ policy |
| P3 criteria in [agent-maturation-p3-v1.md](../governance/agent-maturation-p3-v1.md) | 🟡 7d in progress |
| Agent red-team adversarial test plan | 🟡 draft template | [agent-redteam-v1.md](../security/agent-redteam-v1.md) |

---

### Phase 5 — External assurance (M13)

| Exit gate | State |
|-----------|-------|
| SOC 2 Type II observation period started | 🔴 |
| External pen test report received | 🔴 |
| Critical/high findings remediated or accepted | 🔴 |
| Pen test ROE signed with vendor | 🟡 draft template | [penetration-test-roe-v1.md](../security/penetration-test-roe-v1.md) |

---

### Phase 6 — GA dress rehearsal (M14)

| Exit gate | State |
|-----------|-------|
| Full staging dress rehearsal (failover drill) | 🔴 |
| Customer ops runbook dry-run | 🟡 draft template | [customer-onboarding-playbook-v1.md](./customer-onboarding-playbook-v1.md) |
| Status page / comms templates ready | 🟡 draft template | [status-page-templates-v1.md](./status-page-templates-v1.md) |
| Support severity matrix | 🟡 draft template | [support-severity-matrix-v1.md](./support-severity-matrix-v1.md) |

---

### Phase 7 — Audits + GA launch (M15–M16)

| Exit gate | State |
|-----------|-------|
| SOC 2 report / ISO stage 2 (as scoped) | 🔴 |
| Production cutover checklist signed | 🟡 draft template | [ga-launch-playbook-v1.md](./ga-launch-playbook-v1.md) |
| **P2 platform GA** declared | 🔴 |
| Post-GA hypercare window staffed | 🔴 |

---

## Express / predictive (P2 plan — in-repo)

| Item | State | Proof |
|------|-------|-------|
| Express rules in `ontology/v3` → `v2-compiled` | ✅ | `make ontology-sync` |
| `TestExpressCargoRulesEvaluate` (6 rules) | ✅ | integration test |
| Propensity ML pipeline in CI `validate` | ✅ | `pipelines/propensity-train` in [ci.yml](../../.github/workflows/ci.yml) |
| `make train-propensity-express` / `backtest-propensity-express` | ✅ | Makefile |

---

## Update protocol

1. Change **State** in the relevant table when evidence exists (PR, CI run URL, doc).
2. Link evidence inline or in [p1-staging-pilot-closeout-v1.md](./p1-staging-pilot-closeout-v1.md).
3. On stop-the-line trigger, freeze phase advance per [stop-the-line-policy-v1.md](./stop-the-line-policy-v1.md).
4. Weekly: review Phase 0 rows until `v0.1.0` ships.

## Cadence

- **Weekly:** phase standup; refresh Phase 0 CI matrix.
- **Bi-weekly:** ADR review for open `adr-*-v1.md` drafts.
- **Monthly:** phase exit review; update this file.
