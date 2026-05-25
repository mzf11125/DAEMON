# ADR: Kubernetes cluster provider (Phase 1.1)

## Status

**Proposed — DRAFT.** Decision required at start of Phase 1.1 of the [end-to-end production plan](../../.cursor/plans/daemon-production-end-to-end-50d4a9.md). Supersedes [`adr-aws-deployment-v1.md`](./adr-aws-deployment-v1.md).

## Context

Locked production runtime (per the plan): **self-managed Kubernetes + Supabase Cloud + ClickHouse Cloud + Neo4j Aura.** This ADR picks the actual K8s flavor.

The cluster hosts:

- 5 Go services (`platform-api`, `ontology-service`, `ingestion-service`, `rules-engine`, `case-service`)
- Console (Next.js — may also deploy to Vercel)
- Control plane + agent bridge + agent service (P3)
- OTel collector + observability sidecars
- Audit-archival CronJob (Phase 2.5)
- Ingress controller / API gateway

Cluster does **not** host Postgres, ClickHouse, Neo4j (managed externally).

## Decision criteria

| Criterion | Weight | Notes |
|-----------|--------|-------|
| Compliance fit (SOC 2 + HIPAA + ISO 27001 + GDPR) | High | All major managed K8s services support BAA + DPA |
| Workload identity to Supabase Cloud / CH Cloud / Neo4j Aura | High | All accept JWT-based federation |
| GitOps maturity (ArgoCD / Flux ecosystem) | High | All support ArgoCD; some have native GitOps |
| External-secrets-operator + KMS integration | High | All support; Vault works on any |
| Multi-region path (post-GA) | Medium | Cross-region differs significantly |
| Operational tooling (kubectl, logs, metrics) | High | All similar; managed differences |
| Cost (control plane + node + LB + egress) | Medium | EKS / GKE charge for control plane; on-prem trades capex for ops |
| Time-to-bootstrap | Medium | GKE Autopilot fastest; on-prem slowest |
| Sovereignty / data residency knobs | Medium | EU regions available on all |
| Vendor lock-in risk | Medium | Vendor-neutral K8s mitigates; managed addons differ |

## Options considered

### Option A — AWS EKS

**Pros**
- Mature ecosystem; most third-party charts test against EKS
- Strong BAA + SOC 2 + HIPAA + ISO 27001 coverage (AWS Artifact)
- IRSA (IAM Roles for Service Accounts) maps cleanly to workload identity to Supabase via OIDC

**Cons**
- Control plane cost ($73/mo per cluster), no auto-mode without Karpenter wiring
- EKS networking (VPC CNI) more complex than GKE Autopilot
- Requires more node-side management (compared to managed-mode)

### Option B — GCP GKE Autopilot

**Pros**
- Hands-off node management; pay-per-pod
- Workload Identity to GCP services native; OIDC tokens to Supabase Cloud straightforward
- Strong compliance posture (SOC 2 + HIPAA BAA + ISO 27001 + GDPR + CSA STAR)
- Generally fastest to a working cluster

**Cons**
- Autopilot enforces some pod restrictions (privileged containers, host paths)
- Some upstream charts assume root / hostNetwork — potential incompatibility
- Slightly more expensive per pod-hour at low scale

### Option C — Azure AKS

**Pros**
- Strong enterprise compliance (HIPAA + ISO + SOC 2 + GDPR + plus regional sovereign options)
- Azure AD workload identity maps to OIDC providers including Supabase
- Free control plane on Standard tier

**Cons**
- Smaller ArgoCD / Flux community presence than AWS/GCP (still supported)
- Networking model (Azure CNI vs kubenet) requires care for IP planning

### Option D — On-prem / hybrid (vendor-supplied K8s)

**Pros**
- Full control over compliance boundary; customer can be the cluster operator
- Strong fit for customers requiring sovereign / air-gapped deployments

**Cons**
- Largest operational burden (cluster lifecycle, upgrades, certs, networking)
- Slower path to GA — adds ~3 months
- Compliance attestations cover the platform but not customer-managed cluster

## Recommendation (to be ratified)

**Tentative: Option B (GCP GKE Autopilot)** for the first GA cluster.

Rationale:
- Fastest path to a compliance-ready cluster.
- Native Workload Identity reduces secret sprawl.
- Pod-level pricing aligns with quality-first sequencing (start small, scale on real traffic).
- Mitigation for the Autopilot pod-restriction concern: every Daemon Go service runs as non-root with read-only root filesystem already; review chart values pre-Phase-1.1.

**Fallback: Option A (AWS EKS)** if customer pipeline at GA includes contracts that require AWS-only deployment, or if the team's existing operational expertise is heavily AWS.

**Not recommended for first GA: Options C and D.**
- Azure AKS is fully viable; defer to second region or tenant if customer demand drives it.
- On-prem adds runway and is better delivered after a GA managed-cluster reference.

## Consequences

- Terraform / Pulumi modules under `infra/terraform/` parameterize on `provider` so the abstraction holds; ~80% of modules are provider-neutral (cert-manager, external-secrets, OTel, ArgoCD), ~20% provider-specific (cluster, IAM/IRSA, networking).
- Helm charts under `infra/helm/` stay provider-agnostic.
- Workload-identity wiring to Supabase Cloud uses OIDC federation regardless of cluster provider.
- Secrets store ADR ([`adr-secrets-store-v1.md`](./adr-secrets-store-v1.md)) is independent — Vault works on any K8s; cloud-native secrets manager choice is coupled to this decision.

## Open items (resolve before merge)

- [ ] Confirm chart compatibility with chosen provider (esp. Autopilot pod-security restrictions if Option B).
- [ ] Validate workload identity → Supabase Cloud OIDC federation in a spike before locking the choice.
- [ ] Review enterprise contract / customer-pipeline constraints (Phase 1 kickoff).
- [ ] Pick first GA region (decoupled from provider; tracked in `adr-region-strategy-v1.md` Phase 3).

## References

- Production plan §Phase 1: [`/Users/macbook/.windsurf/plans/daemon-production-end-to-end-50d4a9.md`](../../.cursor/plans/daemon-production-end-to-end-50d4a9.md)
- K8s manifest plan: [`infra/kubernetes/README.md`](../../infra/kubernetes/README.md)
- Production readiness tracker: [`docs/operations/production-readiness-tracker-v1.md`](../operations/production-readiness-tracker-v1.md)
