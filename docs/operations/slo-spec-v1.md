# SLO spec v1 (user journeys)

Production SLI/SLO targets for the **P2 GA** platform — supersedes the prior P1 demo targets. Status: targets locked at start of Phase 2; instrumentation lands during Phase 1 OTel rollout. Pairs with [`production-readiness-v1.md`](./production-readiness-v1.md).

## Journeys and targets

| ID | Journey | SLI | P1 demo | **P2 prod (GA)** | Compliance hook |
|----|---------|-----|---------|------------------|-----------------|
| J-01 | List signals | `ontology-service` p95 GET latency | p95 < 500ms local | **p95 < 300ms; availability 99.9%** | SOC 2 A1.1; ISO A.5.30 |
| J-02 | Run rules | `rules-engine` `POST /v1/evaluate` success rate | 99% when CH seeded | **99.5% success; p95 < 5s** | SOC 2 A1.1 |
| J-03 | Open case | `ontology-service` `POST /v1/actions/OpenCase` 2xx | 100% authorized | **99.95% success when authorized** | SOC 2 A1.1; HIPAA 164.312(b) |
| J-04 | Ingestion job | `ingestion-service` job pending → completed | < 5 min seed-csv | **p95 < 5 min for default connector** | SOC 2 PI1 |
| J-05 | Console TTI | `console-web` server-rendered TTI | manual | **p95 < 2.5s; LCP < 2.5s; INP < 200ms** | UX target |
| J-06 | MCP list objects | `mcp-ontology` tool success | eval pass | **99.9% tool-call success; p95 < 1s** | SOC 2 A1.1 |
| J-07 | Authentication | JWT validation success | n/a | **99.99% success; p95 < 50ms** | SOC 2 CC6.1 |
| J-08 | Audit ingest | `POST /v1/audit/events` 2xx | n/a | **99.95% success; p95 < 200ms** | SOC 2 CC7.2; HIPAA 164.312(b) |
| J-09 | Audit archival | hourly batch completes | n/a | **99% within 60 min; backlog ≤ 4h** | SOC 2 CC7.2; ISO A.8.15 |

## Error budgets

Targets above translate to monthly error budgets:

| SLO | Monthly budget | Alert at |
|-----|----------------|----------|
| 99.9% (J-01) | 43m 12s downtime | 50% burn |
| 99.5% (J-02) | 3h 36m | 50% burn |
| 99.95% (J-03, J-08) | 21m 36s | 50% burn |
| 99.99% (J-07) | 4m 19s | 25% burn |

## Burn-rate alerting (multi-window, multi-burn-rate)

For each SLO, two alerts: a fast-burn page and a slow-burn ticket.

| Alert | Lookback | Burn rate | Action |
|-------|----------|-----------|--------|
| `<service>:fast-burn` | 5m AND 1h | 14.4 | page on-call (P2) |
| `<service>:slow-burn` | 30m AND 6h | 6 | ticket (P3) |
| `<service>:availability-warn` | 24h | 3 | dashboard amber |

Fast-burn formula (5m window over 99.9% target):
```
sum(rate(http_requests_total{status=~"5..", route="/v1/objects"}[5m]))
/
sum(rate(http_requests_total{route="/v1/objects"}[5m]))
> (1 - 0.999) * 14.4
```

Same expression at 1h must also trigger to suppress flaps.

## Paging policy

| Severity | Trigger | Response time | Routes to |
|----------|---------|---------------|-----------|
| P1 | J-01/J-03/J-07 down OR fast-burn on multiple SLOs | 15 min ack | platform on-call + IC |
| P2 | Fast-burn on a single SLO | 30 min ack | platform on-call |
| P3 | Slow-burn ticket | next business day | platform queue |
| P4 | Latency degradation < SLO | weekly review | platform queue |

## Instrumentation

- All Go services emit OTel metrics for HTTP route + status + duration (Phase 1.4 delivery).
- Console-web emits Core Web Vitals (LCP / INP / CLS) via `web-vitals` library.
- Audit archival emits `audit_archival_batch_duration_seconds` + `audit_archival_backlog_rows` to OTel.
- Recording rules in Prometheus pre-compute SLO ratios per service per route.

## Cadence

- **Weekly:** SLO scorecard reviewed in platform standup.
- **Monthly:** error-budget summary in [`production-readiness-v1.md`](./production-readiness-v1.md).
- **On exhaustion:** error-budget burndown triggers freeze on non-essential changes per [`stop-the-line-policy-v1.md`](./stop-the-line-policy-v1.md).

## Phase tie-in

| Phase | SLO action |
|-------|-----------|
| P1 | Implement OTel + Prometheus rules; targets above set as **goals**, not gates. |
| P2 | Production SLO program live; first month of measurement on staging. |
| P4 | SLOs measured for ≥ 30d on prod-shaped traffic — Track A11 in [`p2-ga-checklist-v1.md`](./p2-ga-checklist-v1.md). |
| P6 | All SLOs green ≥ 30d on real customer pilot traffic. |
| P7 | GA gate A11 satisfied. |

## Related

- [`data-platform-sla-v1.md`](./data-platform-sla-v1.md) — data-tier targets
- [`production-readiness-v1.md`](./production-readiness-v1.md) — phase tracker
- [`stop-the-line-policy-v1.md`](./stop-the-line-policy-v1.md) — burn-rate exhaustion freeze
- [`runbooks/`](./runbooks/) — paging response runbooks (RB-DR-01..05, RB-DUNE-*, RB-RULES-*)
