# Control plane (Merge Phase 3)

Vendored from upstream `external/daemon-system-ontology/apps/control-plane`.

Tenant registry, health polling (`/internal/health` on registered service URLs), WebSocket log stream, internal agent routes.

## Development

```bash
cp apps/control-plane/.env.example apps/control-plane/.env   # if present
pnpm --filter @daemon/control-plane run dev
```

Register tenant rows with `apiUrl` / `agentUrl` pointing at DAEMON Go services (`:8080`, `:8081`, `:3001` bridge). See [ADR D-TENANT-01](../../docs/architecture/adr-d-tenant-01.md).

## Proof

```bash
curl -s http://localhost:4000/health
# Dashboard routes depend on CP_PORT — see package scripts
```
