output "cluster_endpoint" {
  description = "K8s cluster API endpoint."
  value       = module.cluster.endpoint
  sensitive   = true
}

output "cluster_name" {
  description = "K8s cluster name."
  value       = module.cluster.name
}

output "egress_nat_ip" {
  description = "Static egress IP — allowlist this on Supabase Cloud / ClickHouse Cloud / Neo4j Aura."
  value       = module.network.egress_nat_ip
}

output "argocd_url" {
  description = "ArgoCD URL (internal)."
  value       = module.argocd.url
}

output "grafana_url" {
  description = "Grafana URL (internal)."
  value       = module.observability.grafana_url
}
