variable "provider" {
  type        = string
  description = "Cluster provider: gke | eks | aks"
}

variable "region" {
  type = string
}

variable "cluster_name" {
  type = string
}

variable "network_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "oidc_issuer_audience" {
  type    = string
  default = "supabase-cloud"
}

variable "tags" {
  type    = map(string)
  default = {}
}
