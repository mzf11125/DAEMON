# GitOps (Phase 1.1 — pending implementation)

ArgoCD / FluxCD configuration for the production K8s deployment. Created as a stub during Phase 0; populated during Phase 1.1 of the [end-to-end production plan](../../.cursor/plans/daemon-production-end-to-end-50d4a9.md).

## Status

🟡 **Empty stub by design.** P1 runs on Docker Compose; Phase 1.1 wires real GitOps.

> **Tool choice (ArgoCD vs FluxCD)** is part of Phase 1.1 — defaulting to **ArgoCD** for its UI / RBAC maturity. FluxCD remains an option if the team prefers a more declarative-first / lighter-weight tool.

## App-of-apps pattern

```
infra/gitops/
├── bootstrap/
│   └── root-app.yaml            # the single Application that ArgoCD imports
├── apps/
│   ├── platform/                # platform Go services
│   │   ├── platform-api.yaml
│   │   ├── ontology-service.yaml
│   │   ├── ingestion-service.yaml
│   │   ├── rules-engine.yaml
│   │   ├── case-service.yaml
│   │   ├── console-web.yaml
│   │   ├── control-plane.yaml
│   │   └── audit-archival.yaml
│   ├── aip/                     # agent surface
│   │   ├── agent-bridge.yaml
│   │   └── agent-service.yaml
│   ├── observability/
│   │   ├── otel-collector.yaml
│   │   ├── prometheus.yaml
│   │   └── grafana.yaml
│   └── platform-shared/
│       ├── cert-manager.yaml
│       ├── external-secrets.yaml
│       ├── ingress.yaml
│       └── argocd-image-updater.yaml
├── projects/
│   ├── platform.yaml            # ArgoCD AppProject — RBAC + source allowlist
│   ├── aip.yaml
│   └── observability.yaml
└── README.md
```

## Sync policy

| Environment | Auto-sync | Pruning | Manual approval |
|-------------|-----------|---------|-----------------|
| Staging | enabled | enabled | none |
| Production | **disabled** | disabled | required |

Production never auto-syncs. A human reviews the diff before clicking Sync. ArgoCD `syncWindows` enforce business-hours-only deploys for prod (configurable per app).

## Source repos

GitOps repo can be:

- **Same monorepo** — `infra/gitops/` here, ArgoCD watches the `main` branch and a path filter.
- **Separate repo** — recommended at GA scale; this folder becomes a generated mirror.

For Phase 1.1, **start in-monorepo** for speed; split into a dedicated GitOps repo at Phase 6 / GA RC if access controls demand it.

## Image promotion flow

1. Engineer merges feature PR → CI builds image with digest + SBOM + cosign signature, pushes to registry.
2. CI updates `infra/gitops/apps/platform/<service>.yaml` `targetRevision` (or values file image digest) for **staging** automatically.
3. ArgoCD on staging cluster auto-syncs → service rolls.
4. On green staging smoke (`./scripts/e2e-smoke.sh` against staging), the engineer opens a follow-up PR or runs `./scripts/promote-to-prod.sh` (Phase 1.5) to update the prod GitOps file.
5. ArgoCD on prod cluster shows pending sync; on-call approves; rolls.

## RBAC

- ArgoCD admin: small set of platform engineers.
- Per-project sync access: workload owner + on-call.
- Audit log forwarded to SIEM (Phase 3.1).

## Drift handling

- Auto-heal: enabled in staging, disabled in prod.
- Out-of-band changes in prod are flagged in ArgoCD UI and alerted; the playbook is to revert via Git, not via cluster-side fix.

## Disaster recovery

- ArgoCD config + Apps live in Git → re-applying to a fresh cluster is one `kubectl apply -f infra/gitops/bootstrap/root-app.yaml` on a freshly bootstrapped ArgoCD.
- Combined with Terraform-driven cluster provisioning, full-stack rebuild from Git is RTO ≤ 4h.

## Reference

- Plan: [`/Users/macbook/.windsurf/plans/daemon-production-end-to-end-50d4a9.md`](../../.cursor/plans/daemon-production-end-to-end-50d4a9.md)
- Cluster ADR: [`docs/architecture/adr-cluster-provider-v1.md`](../../docs/architecture/adr-cluster-provider-v1.md)
- Helm: [`infra/helm/README.md`](../helm/README.md)
- Terraform: [`infra/terraform/README.md`](../terraform/README.md)
- K8s overview: [`infra/kubernetes/README.md`](../kubernetes/README.md)
