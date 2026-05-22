# Solutions architecture: consumer SaaS pattern v1

DAEMON demo maps to B2B multi-tenant SaaS:

| Pattern | DAEMON component |
|---------|------------------|
| Identity | Keycloak / OIDC |
| Tenant isolation | JWT `tenant_id` + CH column |
| Product API | platform-api, ontology, cases |
| Analytics plane | ClickHouse + rules |
| AI copilot | MCP + agent (read-only v1) |

Extension for enterprise: SSO federation, RLS on Postgres, private LLM VPC — document in customer ADRs per deal.
