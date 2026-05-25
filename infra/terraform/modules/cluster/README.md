# cluster module (Phase 1.1 skeleton)

Creates the production Kubernetes control plane. Provider implementation is selected per [adr-cluster-provider-v1](../../../docs/architecture/adr-cluster-provider-v1.md).

**Outputs consumed by:** `external-secrets`, `cert-manager`, `argocd`, `ingress`, `observability`.

**Apply:** only after network module and remote Terraform workspace are configured.
