variable "provider" {
  description = "Cloud provider for the network module — gke | eks | aks | onprem."
  type        = string
  validation {
    condition     = contains(["gke", "eks", "aks", "onprem"], lower(var.provider))
    error_message = "provider must be one of: gke, eks, aks, onprem."
  }
}

variable "region" {
  description = "Cloud region (e.g. us-east1 / us-east-1 / eastus)."
  type        = string
}

variable "network_name" {
  description = "Logical name of the VPC / VNet."
  type        = string
}

# GCP-specific
variable "project_id" {
  description = "GCP project id (required when provider=gke)."
  type        = string
  default     = ""
}

variable "pod_cidr" {
  description = "GKE pod CIDR (provider=gke)."
  type        = string
  default     = "10.0.0.0/14"
}

variable "service_cidr" {
  description = "GKE service CIDR (provider=gke)."
  type        = string
  default     = "10.4.0.0/19"
}

# AWS-specific
variable "vpc_cidr" {
  description = "VPC / VNet CIDR (provider=eks|aks)."
  type        = string
  default     = "10.0.0.0/16"
}

# Azure-specific
variable "resource_group" {
  description = "Azure resource group name (provider=aks)."
  type        = string
  default     = ""
}

variable "enable_flow_logs" {
  description = "Enable VPC / VNet flow logs for SOC 2 CC7.2 evidence."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags / labels applied to every resource."
  type        = map(string)
  default     = {}
}
