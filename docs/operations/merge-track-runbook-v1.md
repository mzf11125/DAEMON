# Merge-track runbook v1

Vendored apps wired for P1 staging. Canonical HTTP remains Go (`:8080`–`:8084`) per [ADR MERGE-STRATEGY-01](../architecture/adr-merge-strategy-01.md).

## Daemon CLI

```bash
pnpm install
make cli-build
make cli-test          # requires Postgres for migrate tests
pnpm --filter @daemon/cli run dev -- --help
```

Optional: run SQL migrations from `packages/ontology-engine` against dev Postgres (do not replace Go ontology HTTP writes).

## Agent HTTP bridge

```bash
export AGENT_DAEMON_BRIDGE=true
export ONTOLOGY_SERVICE_URL=http://localhost:8081
export PLATFORM_API_URL=http://localhost:8080
pnpm --filter @daemon/agent-service exec tsx src/bridge-main.ts
# or: make agent-bridge-smoke (starts bridge if needed)
```

Docker Compose profile:

```bash
make up-apps              # Go services in containers
make up-merge-track       # + control-plane + agent-bridge
```

## Control plane + D-TENANT-01

```bash
docker compose -f infra/docker/docker-compose.yml --profile merge-track up -d cp-postgres control-plane
./scripts/seed-control-plane-demo-tenant.sh
curl -sf http://localhost:4000/health
```

Maps `tenant-demo` slug to `api_url` / `agent_url` for health polling (`/internal/health` on platform).

## Plugin remap (runtime targets)

| Upstream plugin slot | DAEMON runtime |
|----------------------|----------------|
| Analytics / CH queries | `pipelines/*`, ClickHouse `dataset_*` |
| Monitoring / alerts | `services/rules-engine` `:8083` |

P3 requires runtime verification — see [agent-maturation-p3-v1.md](../governance/agent-maturation-p3-v1.md).

## CI smoke

- `aip-eval` workflow: agent bridge smoke after golden eval
- `./scripts/smoke-agent-bridge.sh` locally when Go stack is up
