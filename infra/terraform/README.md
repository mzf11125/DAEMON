# Terraform (Phase 1.1 — pending implementation)

IaC modules for the DAEMON production runtime. Created as a stub during Phase 0; populated during Phase 1.1 of the [end-to-end production plan](../../.cursor/plans/daemon-production-end-to-end-50d4a9.md).

## Status

🟡 **Empty stub by design.** P1 runs on Docker Compose; Phase 1.1 introduces real IaC.

> **Choice of tool (Terraform vs Pulumi)** is part of Phase 1.1 — defaulting to **Terraform** because of broader operator familiarity and ecosystem maturity. Pulumi remains an option if the team prefers TypeScript-native infra code.

## Module structure

```
infra/terraform/
├── modules/
│   ├── cluster/                 # K8s cluster (provider-specific submodules)
│   │   ├── eks/
│   │   ├── gke/
│   │   └── aks/
│   ├── network/                 # VPC / VNet, subnets, NAT, peering
│   ├── dns/                     # Route53 / Cloud DNS / Azure DNS
│   ├── secrets-bootstrap/       # initial secrets store provisioning
│   ├── object-store/            # S3-compatible bucket + Object Lock + KMS
│   ├── observability/           # OTel + Prometheus + Grafana namespace prep
│   ├── argocd/                  # ArgoCD bootstrap (chart values only)
│   ├── external-secrets/        # ESO + ClusterSecretStore wiring
│   ├── cert-manager/            # cert-manager + Let's Encrypt issuer
│   ├── ingress/                 # Ingress controller (NGINX / Caddy / cloud LB)
│   └── waf/                     # Cloudflare or provider-native
├── envs/
│   ├── staging/                 # one workspace per env
│   │   ├── main.tf
│   │   ├── backend.tf           # remote state (Terraform Cloud or S3 + DynamoDB lock)
│   │   ├── variables.tf
│   │   └── terraform.tfvars     # NON-SECRET values; secrets via env / Vault
│   └── prod/
│       ├── main.tf
│       ├── backend.tf
│       ├── variables.tf
│       └── terraform.tfvars
└── README.md
```

## Provider abstraction

A single `provider` variable in each `envs/<env>/variables.tf` selects which cluster sub-module to instantiate:

```hcl
variable "provider" {
  description = "Cloud provider for the K8s cluster — gke | eks | aks | onprem"
  type        = string
}
```

The `modules/cluster/` umbrella picks the right sub-module via `count`/`for_each` based on `var.provider`. Modules outside `cluster/` and `network/` are provider-neutral.

## Standards

- **State**: remote backend (Terraform Cloud or S3 + DynamoDB lock); never local state.
- **Workspaces**: one per env (`staging`, `prod`). Multi-region uses one workspace per (env, region).
- **Module versioning**: pin every external module to a tag (`?ref=v1.2.3`); pin providers to minor version in `versions.tf`.
- **Outputs**: minimal; ARNs / IDs needed by Helm charts or GitOps.
- **Secrets**: never in `.tfvars`. Inject via `TF_VAR_*` from the chosen secrets store (Phase 1.3 ADR).
- **Plan + apply via CI**: a separate IaC pipeline (`.github/workflows/iac-*.yml`) runs `terraform plan` on PRs and `terraform apply` on merge with manual approval for `prod`.
- **Drift detection**: nightly `terraform plan` job that alerts on drift.

## Cross-cloud strategy

For Phase 1 GA, only one provider is wired (decision in [`adr-cluster-provider-v1.md`](../../docs/architecture/adr-cluster-provider-v1.md)). The module abstraction is in place so Phase 8 can stand up an EU region on the same provider, or a second region on a different provider, without rewriting Helm charts or GitOps.

## What lives outside Terraform

- **Helm chart bodies** → [`infra/helm/`](../helm/README.md) (synced via ArgoCD).
- **GitOps app definitions** → [`infra/gitops/`](../gitops/README.md).
- **K8s overlays per env** → [`infra/kubernetes/`](../kubernetes/README.md) (Kustomize / Helm values overrides).
- **Application secrets** → Vault / cloud secrets manager (per [`adr-secrets-store-v1.md`](../../docs/architecture/adr-secrets-store-v1.md)).
- **Supabase Cloud projects** → managed via Supabase dashboard / Supabase CLI; project IDs ingested as Terraform `data` sources, not provisioned.
- **ClickHouse Cloud / Neo4j Aura** → managed via vendor APIs; can be provisioned via their Terraform providers in Phase 1.2.

## CI integration

```yaml
# .github/workflows/iac-plan.yml (Phase 1.1)
on:
  pull_request:
    paths: ["infra/terraform/**"]
jobs:
  plan:
    steps:
      - terraform fmt -check
      - terraform init
      - terraform validate
      - terraform plan -out plan.tfplan
      - tfsec scan
      - upload plan.tfplan as PR artifact
```

```yaml
# .github/workflows/iac-apply.yml (Phase 1.1, manual approval gate)
on:
  workflow_dispatch:
  push:
    branches: [main]
    paths: ["infra/terraform/envs/staging/**"]
jobs:
  apply-staging:
    environment: staging   # GH Environment with required reviewers
    steps:
      - terraform init
      - terraform apply -auto-approve
  apply-prod:
    environment: prod      # GH Environment with manual approval
    needs: apply-staging
    steps:
      - terraform init
      - terraform plan
      - manual approval
      - terraform apply -auto-approve
```

## Reference

- Plan: [`/Users/macbook/.windsurf/plans/daemon-production-end-to-end-50d4a9.md`](../../.cursor/plans/daemon-production-end-to-end-50d4a9.md)
- Cluster ADR: [`docs/architecture/adr-cluster-provider-v1.md`](../../docs/architecture/adr-cluster-provider-v1.md)
- Secrets ADR: [`docs/architecture/adr-secrets-store-v1.md`](../../docs/architecture/adr-secrets-store-v1.md)
- K8s overview: [`infra/kubernetes/README.md`](../kubernetes/README.md)
