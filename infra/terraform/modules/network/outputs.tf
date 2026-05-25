output "network_id" {
  description = "Provider-specific identifier of the created network."
  value = (
    length(module.gke) > 0 ? module.gke[0].network_id :
    length(module.eks) > 0 ? module.eks[0].vpc_id :
    length(module.aks) > 0 ? module.aks[0].vnet_id :
    null
  )
}

output "subnet_ids" {
  description = "List of subnet IDs."
  value = (
    length(module.gke) > 0 ? module.gke[0].subnet_ids :
    length(module.eks) > 0 ? module.eks[0].private_subnet_ids :
    length(module.aks) > 0 ? module.aks[0].subnet_ids :
    []
  )
}

output "egress_nat_ip" {
  description = "Static egress NAT IP for allowlisting on managed services."
  value = (
    length(module.gke) > 0 ? module.gke[0].nat_ip :
    length(module.eks) > 0 ? module.eks[0].nat_ip :
    length(module.aks) > 0 ? module.aks[0].nat_ip :
    null
  )
}
