output "name" {
  description = "Cluster name (stub until provider submodule applied)."
  value       = var.cluster_name
}

output "endpoint" {
  description = "API server endpoint."
  value       = "https://stub.${var.cluster_name}.local"
}

output "oidc_issuer_url" {
  description = "Workload identity OIDC issuer for IRSA/GKE WI."
  value       = "https://stub.${var.cluster_name}.local/oidc"
}
