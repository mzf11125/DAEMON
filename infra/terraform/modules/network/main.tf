# Provider-neutral network module facade.
# Selects backend module based on var.provider; sub-modules under modules/network/<provider>/.
#
# This is a Phase 1.1 skeleton — sub-modules will be filled per cluster ADR.

locals {
  provider_normalized = lower(var.provider)
}

module "gke" {
  count  = local.provider_normalized == "gke" ? 1 : 0
  source = "./gke"

  project_id        = var.project_id
  region            = var.region
  network_name      = var.network_name
  pod_cidr          = var.pod_cidr
  service_cidr      = var.service_cidr
  enable_flow_logs  = var.enable_flow_logs
  tags              = var.tags
}

module "eks" {
  count  = local.provider_normalized == "eks" ? 1 : 0
  source = "./eks"

  vpc_cidr          = var.vpc_cidr
  region            = var.region
  network_name      = var.network_name
  enable_flow_logs  = var.enable_flow_logs
  tags              = var.tags
}

module "aks" {
  count  = local.provider_normalized == "aks" ? 1 : 0
  source = "./aks"

  resource_group    = var.resource_group
  region            = var.region
  network_name      = var.network_name
  vnet_cidr         = var.vpc_cidr
  enable_flow_logs  = var.enable_flow_logs
  tags              = var.tags
}
