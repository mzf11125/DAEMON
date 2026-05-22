# AI surface review v1 (ARB checklist)

## Trust boundaries

| Zone | Components | Trust level |
|------|------------|-------------|
| Human | Analyst browser | Trusted actor |
| Edge | console-web, MCP SSE | Authenticated |
| API | Go services 8080–8084 | JWT + tenant |
| Data | Postgres, ClickHouse, Neo4j | Tenant-scoped queries |

## Checklist

- [ ] JWT required in production (`OIDC_REQUIRED=true`)
- [ ] `X-Tenant-Id` not trusted when OIDC required
- [ ] Rules engine SQL validated SELECT-only
- [ ] MCP tools read-only in v1 eval path
- [ ] Agent cannot call `OpenCase` in golden eval
- [ ] Secrets only in env / secret store
- [ ] LangSmith traces redact Bearer tokens

## Review cadence

Re-run when adding MCP mutating tools, new agent prompts, or cross-tenant data paths.
