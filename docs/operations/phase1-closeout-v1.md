# Phase 1 closeout (foundations)

**Target tag:** `v0.2.0` (operator publishes after cluster apply).

## Delivered in repo

| P1 item | Location |
|---------|----------|
| ADR cluster | [adr-cluster-provider-v1.md](../architecture/adr-cluster-provider-v1.md) |
| ADR secrets | [adr-secrets-store-v1.md](../architecture/adr-secrets-store-v1.md) |
| ADR AI (3) | `adr-ai-inference-plane-v1`, `adr-llm-routing-v1`, `adr-mcp-tool-governance-v1` |
| Terraform staging | [infra/terraform/envs/staging/](../../infra/terraform/envs/staging/) + modules |
| Helm charts (8) | [infra/helm/](../../infra/helm/) |
| GitOps apps | [infra/gitops/apps/](../../infra/gitops/apps/) |
| Managed data doc | [managed-data-services-v1.md](./managed-data-services-v1.md) |
| SBOM workflow | [.github/workflows/supply-chain.yml](../../.github/workflows/supply-chain.yml) |
| K8s index | [infra/kubernetes/README.md](../../infra/kubernetes/README.md) |

## Operator apply (post-repo)

- Terraform Cloud workspace `staging`
- ArgoCD bootstrap + first sync
- Supabase/CH/Neo4j project provisioning + allowlist NAT IP
