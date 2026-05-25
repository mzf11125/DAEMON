# Phase 2 closeout (hardening)

**Target tag:** `v0.3.0`

## Delivered in repo

| Item | Location |
|------|----------|
| OIDC_REQUIRED prod values | `infra/helm/*/values.prod.yaml` |
| SLO spec | [slo-platform-v1.md](./slo-platform-v1.md) |
| Burn alerts stub | [infra/observability/prometheus/slo-burn-rules.yaml](../../infra/observability/prometheus/slo-burn-rules.yaml) |
| Supply chain CI | [supply-chain.yml](../../.github/workflows/supply-chain.yml), [cosign-image-policy-v1.md](./cosign-image-policy-v1.md) |
| Audit CronJob chart | [infra/helm/audit-archival/](../../infra/helm/audit-archival/) |
| Runbook exercise log | [runbook-exercise-log-v1.md](./runbook-exercise-log-v1.md) |

## Operator

- Deploy Prometheus rules to cluster
- Tabletop oncall exercise (log in runbook-exercise-log)
