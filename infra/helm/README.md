# Helm charts (Phase 1.1)

Daemon-authored charts for production Kubernetes. Deployed only via GitOps ([`infra/gitops/`](../gitops/README.md)).

## Status

🟢 **Charts present** — digest pinning + cosign at deploy time per [cosign-image-policy-v1.md](../../docs/operations/cosign-image-policy-v1.md).

## Charts

| Chart | Type | Port |
|-------|------|------|
| `platform-api` | Deployment | 8080 |
| `ontology-service` | Deployment | 8081 |
| `ingestion-service` | Deployment | 8082 |
| `rules-engine` | Deployment | 8083 |
| `case-service` | Deployment | 8084 |
| `console-web` | Deployment | 3000 |
| `audit-archival` | CronJob | — |
| `agent-bridge` | Deployment | 3001 |

Scaffold new service charts:

```bash
./scripts/scaffold-helm-service-chart.sh <name> <http-port>
```

## Per-chart files

- `values.yaml`, `values.staging.yaml`, `values.prod.yaml`
- `templates/deployment.yaml` (or `cronjob.yaml`), `service.yaml`, `_helpers.tpl`
- Production charts (`platform-api`, `console-web`, `audit-archival`) include ExternalSecrets, PDB, HPA where applicable.

## Standards

- Digest-pinned images in prod (`image.digest`)
- `runAsNonRoot`, read-only root FS, dropped capabilities
- OIDC via env (`OIDC_REQUIRED=true` in prod values)
- Secrets only via External Secrets Operator

## References

- [infra/kubernetes/README.md](../kubernetes/README.md)
- [managed-data-services-v1.md](../../docs/operations/managed-data-services-v1.md)
- [supply-chain.yml](../../.github/workflows/supply-chain.yml)
