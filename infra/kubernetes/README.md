# Kubernetes (Phase 1.1)

Production K8s overlays and vendored charts. Application workloads deploy via **Helm + GitOps** (not raw manifests in this tree).

## Status

🟢 **Scaffold complete in repo** — cluster apply is operator-owned (Terraform + ArgoCD).

## Layout

```
infra/kubernetes/
├── base/           # Kustomize bases (namespaces, RBAC templates, NetworkPolicy stubs)
├── overlays/
│   ├── staging/
│   └── prod/
└── charts/         # Vendored upstream (otel-collector, etc.)
```

## Workloads (Helm → GitOps)

| Workload | Namespace | Chart | GitOps app |
|----------|-----------|-------|------------|
| `platform-api` | `daemon-platform` | `infra/helm/platform-api/` | `apps/platform/platform-api.yaml` |
| `ontology-service` | `daemon-platform` | `infra/helm/ontology-service/` | `apps/platform/ontology-service.yaml` |
| `ingestion-service` | `daemon-platform` | `infra/helm/ingestion-service/` | `apps/platform/ingestion-service.yaml` |
| `rules-engine` | `daemon-platform` | `infra/helm/rules-engine/` | `apps/platform/rules-engine.yaml` |
| `case-service` | `daemon-platform` | `infra/helm/case-service/` | `apps/platform/case-service.yaml` |
| `console-web` | `daemon-platform` | `infra/helm/console-web/` | `apps/platform/console-web.yaml` |
| `audit-archival` | `daemon-platform` | `infra/helm/audit-archival/` | `apps/platform/audit-archival.yaml` |
| `agent-bridge` | `daemon-aip` | `infra/helm/agent-bridge/` | `apps/aip/agent-bridge.yaml` |

## Managed services (not in cluster)

See [managed-data-services-v1.md](../../docs/operations/managed-data-services-v1.md).

## References

- [infra/helm/README.md](../helm/README.md)
- [infra/gitops/README.md](../gitops/README.md)
- [adr-cluster-provider-v1.md](../../docs/architecture/adr-cluster-provider-v1.md)
- [production-readiness-tracker-v1.md](../../docs/operations/production-readiness-tracker-v1.md)
