# ADR: AWS deployment (future)

## Status

Proposed — local compose is source of truth for sprint.

## Direction

- ECS/Fargate or EKS for Go services.
- RDS Postgres, ClickHouse Cloud or self-managed, Neo4j Aura optional.
- Keycloak → Cognito or managed IdP (evaluate separately).
- Secrets Manager for OIDC and LLM keys.

## Non-goals v1

No Terraform in sprint; no multi-region. See `aws-development` skill when starting landing zone.
