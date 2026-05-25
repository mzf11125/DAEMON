variable "cluster_provider" {
  description = "K8s cluster provider — gke | eks | aks. Locked in adr-cluster-provider-v1."
  type        = string
}

variable "region" {
  description = "Cloud region for staging."
  type        = string
}

variable "vpc_cidr" {
  description = "VPC / VNet CIDR for AWS/Azure."
  type        = string
  default     = "10.10.0.0/16"
}

variable "pod_cidr" {
  description = "GKE pod CIDR."
  type        = string
  default     = "10.10.0.0/14"
}

variable "service_cidr" {
  description = "GKE service CIDR."
  type        = string
  default     = "10.14.0.0/19"
}

variable "gcp_project_id" {
  description = "GCP project id (used when cluster_provider=gke)."
  type        = string
  default     = ""
}

variable "azure_resource_group" {
  description = "Azure resource group (used when cluster_provider=aks)."
  type        = string
  default     = ""
}

variable "vault_addr" {
  description = "Vault address (HCP Vault per adr-secrets-store-v1)."
  type        = string
  sensitive   = true
}

variable "acme_email" {
  description = "Email for Let's Encrypt account / ACME orders."
  type        = string
}
