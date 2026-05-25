# GA launch playbook and production cutover checklist v1

Platform GA (P2) cutover per locked [production-readiness-v1.md](./production-readiness-v1.md) Phase 7. **Platform-only** scope; vertical packs opt-in.

**Owner:** Platform lead + GRC  
**Status:** Draft

## Preconditions (no-go if any fail)

| # | Gate | Evidence |
|---|------|----------|
| G1 | Phase 5 pen test Critical/High closed or accepted | [penetration-test-roe-v1.md](../security/penetration-test-roe-v1.md) report |
| G2 | SOC 2 Type II report issued (per plan) | Compliance folder |
| G3 | 30-day `aip-eval` green, flake &lt; 5% | [agent-maturation-p3-v1.md](../governance/agent-maturation-p3-v1.md) |
| G4 | Audit archival job green 30d | `pipelines/audit-archival` metrics |
| G5 | DR drill within 90d | [dr-drill-log.md](./dr-drill-log.md) |
| G6 | [p2-ga-checklist-v1.md](./p2-ga-checklist-v1.md) all required rows ✅ | Signed checklist |
| G7 | Legal: DPA, privacy policy, sub-processor list published | [compliance/README.md](../compliance/README.md) |

## Roles (cutover command)

| Role | Name TBD | Duty |
|------|----------|------|
| Cutover commander | | Go/no-go |
| Platform | | Infra, deploy |
| SRE | | Monitoring, rollback |
| AI/ML | | Agent freeze window |
| GRC | | Compliance hold points |
| Comms | | Status page, customers |

## Timeline (T-7 to T+7)

### Pre-cutover (T-7 to T-1)

| Day | Activity |
|-----|----------|
| T-7 | Freeze feature scope; tag release candidate `v1.0.0-rc.*` |
| T-5 | Full staging dress rehearsal ([Phase 6](./production-readiness-v1.md)) |
| T-3 | Customer comms draft (existing pilots) |
| T-2 | Backup verification; DR snapshot |
| T-1 | Go/no-go meeting; rollback drill verbalized |

#### Pre-cutover checklist

- [ ] `main` CI: validate, integration, aip-eval, policy, supply-chain green
- [ ] Image digests pinned in GitOps
- [ ] `OIDC_REQUIRED=true` all Go services prod
- [ ] Secrets rotated since last pen test
- [ ] Oncall schedule staffed T+0 through T+7
- [ ] Status page component list matches prod architecture
- [ ] Rollback images tagged and tested

### Cutover (T-0)

| Step | Owner | Action | Rollback trigger |
|------|-------|--------|------------------|
| C1 | Platform | Enable maintenance window (optional) | — |
| C2 | Platform | Apply DB migrations (if any) | Migration failure |
| C3 | Platform | Promote GitOps revision to prod | Error budget burn |
| C4 | SRE | Smoke: health + OIDC + RLS spot check | Smoke fail |
| C5 | AI/ML | Enable agent bridge traffic | Eval regression |
| C6 | Comms | Status: monitoring | P1 incident |
| C7 | Commander | Declare GA live | — |

```bash
# Example smoke (prod) — use service URLs from runbook
make prove-staging-smoke  # adapt script env to PROD_* vars when available
```

### Post-cutover (T+1 to T+7)

| Day | Activity |
|-----|----------|
| T+1 | Hypercare standup; review SLO dashboards |
| T+3 | First customer onboarding on prod playbook |
| T+7 | Retrospective; update readiness tracker to GA |
| T+14 | Close hypercare; handoff to sustaining |

#### Post-cutover checklist

- [ ] SLO error budget not exhausted
- [ ] No open P1/P2 > 24h old
- [ ] Audit archival job succeeded nightly
- [ ] Tag `v1.0.0` on `main`
- [ ] Post-incident process confirmed for any cutover issues
- [ ] Update [production-readiness-v1.md](./production-readiness-v1.md) Phase 7 → ✅

## Rollback procedure

1. Revert GitOps to `N-1` digest set (documented in cutover runbook).
2. If migration irreversible: execute DR restore playbook (RB-DR-*).
3. Disable agent bridge feature flag if agent-related regression.
4. Status page: Identified → Resolved with rollback notice.
5. Customer notification within 2h for P1-impacting rollback.

## Communication templates

- Customer: use [status-page-templates-v1.md](./status-page-templates-v1.md)
- Internal: `#ga-cutover` channel + decision log

## Sign-off

| Function | Name | Date | Go / No-go |
|----------|------|------|------------|
| Engineering | | | |
| Security | | | |
| GRC | | | |
| Legal | | | |
| Executive sponsor | | | |
