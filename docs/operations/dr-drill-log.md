# DR drill log

Quarterly DR drill record. Phase 2.1 deliverable; first drill at end of Phase 2.

## Schedule

| Quarter | Drill | Owner | Date | Status |
|---------|-------|-------|------|--------|
| Q1-2026 (Phase 2 first drill) | RB-DR-01 region failover | Platform on-call | TBD | 🔴 not scheduled |
| Q2-2026 (Phase 4) | RB-DR-02 PG PITR + RB-DR-03 CH restore | Data on-call | TBD | 🔴 not scheduled |
| Q3-2026 (Phase 5) | RB-DR-04 Neo4j restore + audit hash chain verification | Data on-call | TBD | 🔴 not scheduled |
| Q4-2026 (Phase 6 dress rehearsal) | RB-DR-05 total tenant data loss tabletop | IC + Compliance + Legal | TBD | 🔴 not scheduled |
| Q1-2027 (Post-GA hypercare) | RB-DR-01 with real GA cluster + customer notice template | All | TBD | 🔴 not scheduled |

## Drill template (per drill)

### Q? — Drill ID

- **Date / time:** YYYY-MM-DD HH:MM TZ
- **Scope:** which runbook(s)
- **Pre-conditions verified:** snapshots ≤ N minutes; secrets accessible; DR cluster reachable
- **Customer impact (if any):** none (drill on staging) / scheduled (notify status page)

#### Timeline

| T+ | Event |
|----|-------|
| 0m | Drill kickoff; primary marked unavailable in monitoring |
| Xm | Failover initiated |
| Xm | DR cluster operational |
| Xm | Smoke chain green on DR URLs |
| Xm | Roll back to primary |
| Xm | Drill closed |

#### Measured RTO / RPO

| Target | Achieved | Pass |
|--------|----------|------|
| RTO ≤ 4h | ?h ?m | ✅ / ❌ |
| RPO ≤ 1h | ?m | ✅ / ❌ |

#### Findings

| ID | Finding | Severity | Owner | Due |
|----|---------|----------|-------|-----|
| F-1 | | | | |

#### Action items

- [ ] Update runbook(s) with discovered gaps.
- [ ] Re-run subset within 30 days if material findings.

## Compliance evidence

- SOC 2 A1.2 (availability) + CC7.5 (recovery)
- ISO 27001 A.5.30 (ICT readiness for business continuity) — annual test required
- HIPAA 45 CFR 164.308(a)(7)(ii)(D) (testing and revision procedures)
- GDPR Art. 32(1)(d) (regular testing)

## Stop-the-line conditions

A failed drill (RTO or RPO miss) triggers:

1. Phase advance freeze per [`stop-the-line-policy-v1.md`](./stop-the-line-policy-v1.md).
2. Postmortem in [`post-incident-template.md`](./post-incident-template.md) format.
3. Re-drill within 30 days; only after re-drill passes does the freeze lift.

## Related

- [`runbooks/RB-DR-01.md`](./runbooks/RB-DR-01.md) through [`RB-DR-05.md`](./runbooks/RB-DR-05.md)
- [`production-readiness-v1.md`](./production-readiness-v1.md)
- [`p2-ga-checklist-v1.md`](./p2-ga-checklist-v1.md) — A9 gate
