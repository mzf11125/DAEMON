# Platform SLOs and alerting (Phase 2)

## Service level objectives (draft)

| Service | SLI | SLO (30d) | Error budget |
|---------|-----|-----------|--------------|
| `platform-api` | Availability `/health` | 99.9% | 43m |
| `ontology-service` | Availability `/health` | 99.9% | 43m |
| `case-service` | Availability `/health` | 99.9% | 43m |
| `rules-engine` | Job success rate | 99.5% | — |
| `audit-archival` | CronJob success | 99% per run window | — |
| `agent-bridge` | Chat completion success | 99% (excl. budget stops) | Phase 4 tune |

## Alerting

- Prometheus rules: `infra/observability/prometheus/slo-burn-rules.yaml` (stub — wire in Phase 2.2 cluster apply).
- Paging: P1 burn rate > 14.4× over 1h → on-call; see `docs/operations/runbook-oncall-v1.md`.

## Evidence

- Grafana dashboard UID TBD after observability module apply.
- Quarterly SLO review in production readiness tracker P2.x.
