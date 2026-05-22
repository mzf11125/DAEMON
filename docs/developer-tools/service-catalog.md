# Service catalog (local dev)

| Service | Port | Health | Tier | Depends on | Path |
|---------|------|--------|------|------------|------|
| platform-api | 8080 | GET /health | T1 | Postgres | services/platform-api |
| ontology-service | 8081 | GET /health | T0 | PG, Neo4j | services/ontology-service |
| ingestion-service | 8082 | GET /health | T0 | PG, CH | services/ingestion-service |
| rules-engine | 8083 | GET /health | T0 | PG, CH | services/rules-engine |
| case-service | 8084 | GET /health | T1 | Postgres | services/case-service |
| console-web | 3000 | — | T1 UI | APIs | apps/console-web |
| MCP ontology | 8090 | SSE | T2 AIP | ontology | aip/mcp-ontology |
| Keycloak | 8180 | — | T1 auth | — | infra/keycloak |

Runbooks: `docs/operations/runbooks/`. SLIs: `docs/operations/slo-spec-v1.md`.
