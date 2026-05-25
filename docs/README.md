# Daemon documentation

Operational intelligence platform scaffold aligned with data-plane architecture.

## Production roadmap (P1 → P2 GA)

- [End-to-end production plan](../.cursor/plans/daemon-production-end-to-end-50d4a9.md) — sequential, quality-first, ~16 months
- [Production readiness tracker](operations/production-readiness-tracker-v1.md) — phase status + open items
- [P1 staging pilot closeout (Phase 0)](operations/p1-staging-pilot-closeout-v1.md) — current phase status
- [Stop-the-line policy](operations/stop-the-line-policy-v1.md) — gate-violation conditions
- [Audit retention policy](governance/audit-retention-v1.md) — production retention tiers

## Sections

- [Getting started](getting-started/overview.md)
- [Architecture](architecture/enterprise-os.md)
- [Data integration](data-integration/overview.md)
- [Ontology](ontology/overview.md)
- [Applications](applications/overview.md)
- [AIP](aip/overview.md)
- [Automation](automation/overview.md)
- [API contracts](api-contracts/README.md)
- [Developer tools](developer-tools/overview.md)
- [Observability](observability/overview.md)
- [Security](security/overview.md)
- [Operations](operations/staging-deploy-v1.md)
- [Governance](governance/daemon-maturation-gates-v1.md)
- [Glossary](operational-glossary.md)

## Repo map

| Folder | Role |
|--------|------|
| `ontology/v2/` | Ontology language (manifests) |
| `services/` | Go microservices |
| `pipelines/` | South-of-Ontology batch jobs |
| `apps/console-web/` | Operational cockpit UI |
| `aip/` | AI platform assets (Phase 2 runtime) |
| `infra/kubernetes/` | K8s overlays (Phase 1.1+, currently stub) |
| `infra/helm/` | Helm charts (Phase 1.1+, currently stub) |
| `infra/gitops/` | ArgoCD / Flux app-of-apps (Phase 1.1+, currently stub) |
| `infra/terraform/` | IaC modules (Phase 1.1+, currently stub) |
