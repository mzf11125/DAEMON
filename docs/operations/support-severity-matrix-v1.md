# Support tier severity matrix v1

Defines **P1–P4** severity, response targets, escalation, and communication for DAEMON platform support.

**Owner:** Customer ops  
**Status:** Draft — align SLAs to MSA at contract time

## Severity definitions

| Tier | Name | Definition | Examples |
|------|------|------------|----------|
| **P1** | Critical | Production down or widespread data integrity risk | API 5xx &gt; 50% for 15m; confirmed cross-tenant leak |
| **P2** | High | Major feature degraded; no workaround | Auth failure; ingestion stopped; agent bridge down |
| **P3** | Medium | Partial degradation; workaround exists | Single connector failing; UI bug on non-critical path |
| **P4** | Low | Question, cosmetic, feature request | Docs typo; how-to |

## Response targets (draft — enterprise tier)

| Tier | Acknowledge | Update cadence | Mitigation target | Resolution target |
|------|-------------|----------------|-------------------|-------------------|
| P1 | 15 min | 30 min | 4 h | 24 h (or workaround) |
| P2 | 1 h | 2 h | 8 h | 3 business days |
| P3 | 4 h | Daily | 5 business days | Best effort |
| P4 | 1 business day | Weekly | N/A | Backlog |

*Clock: business hours [TZ] for P2–P4; P1 24×7 on-call.*

## Escalation path

```text
Customer ticket → Tier 1 Support (CSM portal/email)
       ↓ P2+ or no progress within SLA
  Support engineer (repro + logs)
       ↓ P1 or security/data issue
  On-call SRE (PagerDuty) — see Phase 2.2
       ↓ P1 sustained or legal/compliance
  Incident commander + Legal/GRC
       ↓ Customer executive escalation
  VP Customer Success + CTO delegate
```

| Role | Contact channel | When |
|------|-----------------|------|
| Tier 1 | support@[domain] | All tickets |
| On-call | PagerDuty | P1 auto-page; P2 by engineer discretion |
| Security | security@[domain] | Data breach suspicion |
| Legal | legal@[domain] | Regulatory notice, BAA breach |

## Communication

| Tier | Status page | Customer email | Internal |
|------|-------------|----------------|----------|
| P1 | Investigating → … → Resolved | Dedicated thread + exec optional | War room |
| P2 | Major component if customer-wide | Daily updates | Slack #incidents |
| P3 | Only if multi-tenant | Per ticket | Ticket only |
| P4 | No | Per ticket | Ticket only |

Templates: [status-page-templates-v1.md](./status-page-templates-v1.md)

## Ticket required fields

- `tenant_id`
- Environment (staging / production)
- Severity (customer proposed → support validated)
- Reproduction steps
- Time first observed (UTC)
- Business impact (1–2 sentences)

## Mapping to engineering

| Symptom | Likely owner | Runbook |
|---------|--------------|---------|
| Ingestion backlog | Data | RB-ING-01 |
| Rules engine errors | App | RB-RULES-01 |
| Dune connector | Data | RB-DUNE-* |
| Agent eval failure | AI/ML | agent-maturation doc |

## Review

- Quarterly: adjust SLAs vs actual on-call load
- After each P1: update matrix if miscategorized
