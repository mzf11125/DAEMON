terraform {
  required_version = ">= 1.6.0"

  # Remote state with locking. Real values land in Phase 1.1.
  backend "remote" {
    organization = "daemon-platform"
    workspaces {
      name = "staging"
    }
  }
}

locals {
  env  = "staging"
  tags = {
    Env        = local.env
    Owner      = "platform"
    Project    = "daemon"
    Compliance = "soc2 hipaa gdpr iso27001"
    ManagedBy  = "terraform"
  }
}

module "network" {
  source       = "../../modules/network"
  provider     = var.cluster_provider
  region       = var.region
  network_name = "daemon-${local.env}"
  project_id   = var.gcp_project_id
  vpc_cidr     = var.vpc_cidr
  pod_cidr     = var.pod_cidr
  service_cidr = var.service_cidr
  resource_group = var.azure_resource_group
  tags         = local.tags
}

module "cluster" {
  source                = "../../modules/cluster"
  provider              = var.cluster_provider
  region                = var.region
  cluster_name          = "daemon-${local.env}"
  network_id            = module.network.network_id
  subnet_ids            = module.network.subnet_ids
  oidc_issuer_audience  = "supabase-cloud"   # for workload identity federation
  tags                  = local.tags
}

module "external_secrets" {
  source       = "../../modules/external-secrets"
  cluster_name = module.cluster.name
  vault_addr   = var.vault_addr
  vault_role   = "daemon-${local.env}-eso"
  depends_on   = [module.cluster]
}

module "cert_manager" {
  source       = "../../modules/cert-manager"
  cluster_name = module.cluster.name
  acme_email   = var.acme_email
  depends_on   = [module.cluster]
}

module "argocd" {
  source       = "../../modules/argocd"
  cluster_name = module.cluster.name
  gitops_repo  = "https://github.com/daemon-blockint-tech/DAEMON.git"
  gitops_path  = "infra/gitops"
  gitops_revision = "main"
  depends_on   = [module.external_secrets, module.cert_manager]
}

module "ingress" {
  source       = "../../modules/ingress"
  cluster_name = module.cluster.name
  ingress_class = "nginx"
  depends_on   = [module.cluster]
}

module "observability" {
  source       = "../../modules/observability"
  cluster_name = module.cluster.name
  grafana_admin_secret_path = "daemon/${local.env}/observability/grafana"
  depends_on   = [module.argocd]
}
