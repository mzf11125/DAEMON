# Phase 1.1 skeleton — provider submodules (gke/eks/aks) filled after adr-cluster-provider-v1 is Accepted.
terraform {
  required_version = ">= 1.6.0"
}

locals {
  provider_normalized = lower(var.provider)
}

# Placeholder: wire module.gke | module.eks | module.aks when ADR is accepted.
