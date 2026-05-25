# Network module (provider-neutral facade)

Phase 1.1 skeleton — selects a provider-specific sub-module by `var.provider`.

## Usage

```hcl
module "network" {
  source       = "../../modules/network"
  provider     = "gke"
  region       = "us-east1"
  network_name = "daemon-staging"
  project_id   = "daemon-staging-12345"
  pod_cidr     = "10.0.0.0/14"
  service_cidr = "10.4.0.0/19"
  tags = {
    Env       = "staging"
    Owner     = "platform"
    Compliance = "soc2 hipaa"
  }
}
```

## Sub-modules

- `gke/` — GCP GKE VPC + subnets + Cloud NAT (Phase 1.1)
- `eks/` — AWS VPC + private/public subnets + NAT GW + flow logs (Phase 1.1)
- `aks/` — Azure VNet + subnets + NAT (Phase 1.1)

The facade's `outputs.tf` returns provider-specific IDs through a normalized interface so downstream modules (`cluster`, `external-secrets`, etc.) don't care which cloud they're on.

## Compliance evidence

- VPC flow logs enabled by default → SOC 2 CC7.2, ISO 27001 A.8.15, HIPAA 45 CFR 164.312(b).
- Static egress NAT IP exposed for allowlisting on managed Postgres / ClickHouse / Neo4j endpoints (least-privilege egress).
- Subnets are private by default (no public IPs on workloads).

## To-do (Phase 1.1)

- [ ] Implement `gke/` sub-module (defaults to recommended pod/service CIDR, secondary ranges).
- [ ] Implement `eks/` sub-module (3 AZs, public/private split, dedicated egress).
- [ ] Implement `aks/` sub-module (Azure CNI w/ overlay, NAT GW).
- [ ] Document `onprem` requirements (BYO VPC; this module returns no-op).
