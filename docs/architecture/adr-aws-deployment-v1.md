# ADR: AWS deployment (superseded)

## Status

**Superseded** — by `adr-cluster-provider-v1.md` (to be drafted in Phase 1.1 of the [end-to-end production plan](../../.cursor/plans/daemon-production-end-to-end-50d4a9.md)).

The locked production decision is **self-managed Kubernetes + Supabase Cloud + ClickHouse Cloud + Neo4j Aura** — vendor-neutral. The actual cloud provider (EKS / GKE / AKS / on-prem K8s) is left as a Phase 1.1 ADR; AWS is no longer the single assumed target.

## Why superseded

| Original assumption | Production plan reality |
|---------------------|-------------------------|
| AWS-only direction (ECS/Fargate or EKS) | Vendor-neutral K8s; cloud chosen in Phase 1.1 |
| Keycloak → Cognito | Supabase Cloud (Auth + RLS preserved) |
| Secrets Manager (AWS-specific) | Vault vs cloud-native — `adr-secrets-store-v1.md` (Phase 1.3) |
| RDS Postgres | Supabase Cloud Postgres |
| Neo4j Aura optional | Neo4j Aura **required** at GA |
| ClickHouse Cloud or self-managed | ClickHouse Cloud at GA |

## Original direction (retained for context)

- ECS/Fargate or EKS for Go services.
- RDS Postgres, ClickHouse Cloud or self-managed, Neo4j Aura optional.
- Keycloak → Cognito or managed IdP (evaluate separately).
- Secrets Manager for OIDC and LLM keys.

## Non-goals at the time

No Terraform in sprint; no multi-region. See `aws-development` skill when starting landing zone.

## Successor ADRs (Phase 1)

- `adr-cluster-provider-v1.md` — pick K8s flavor (EKS / GKE / AKS / on-prem) per the vendor-neutral decision.
- `adr-secrets-store-v1.md` — Vault vs cloud-native secrets manager.
- `adr-region-strategy-v1.md` (Phase 3) — first GA region(s) and EU pin.
