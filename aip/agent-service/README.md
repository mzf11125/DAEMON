# Agent service (Merge Phase 2)

Vendored from upstream `external/daemon-system-ontology/apps/agent-service`.

## Modes

| Mode | Env | Use |
|------|-----|-----|
| **daemon-http-bridge** (default for DAEMON stack) | `AGENT_DAEMON_BRIDGE=true`, `ONTOLOGY_SERVICE_URL=http://localhost:8081` | Health + read-only proxy to Go ontology/platform/case — no separate Postgres engine |
| **full engine** | unset `AGENT_DAEMON_BRIDGE`, configure `DB_*`, `REDIS_*`, `SCHEMA_DIR` | Upstream in-process `@daemon/ontology-engine` |

Production-agent claims require green `make aip-eval` and stable bridge/full mode per [daemon-maturation-gates-v1.md](../../docs/governance/daemon-maturation-gates-v1.md). Mutating MCP tools remain deferred ([mutating-mcp-defer-v1.md](../../docs/aip/mutating-mcp-defer-v1.md)).

**Plugin remap (DAEMON):** upstream `analytics` → ClickHouse pipelines / `pipelines/`; `monitoring` → `services/rules-engine` and platform signals. Full in-process plugins require `lint:upstream` + Postgres/Redis (upstream engine path).

**MCP:** read tools live in `@daemon/mcp-ontology`; propose/audit actions stay on Go `POST /v1/actions/*` until mutating MCP checklist passes.

## Smoke

```bash
export AGENT_DAEMON_BRIDGE=true ONTOLOGY_SERVICE_URL=http://localhost:8081 TENANT_ID=tenant-demo
pnpm --filter @daemon/agent-service run dev
curl -s http://localhost:3001/health
curl -s http://localhost:3001/v1/bridge/manifest
```
