# Agent service (Merge Phase 2)

Production agent runtime will be vendored from `daemon-system-ontology` (`apps/agent-service`) per [ADR MERGE-STRATEGY-01](../../docs/architecture/adr-merge-strategy-01.md).

**Phase 2:** Eval and smoke use `packages/aip-agent` + `aip/mcp-ontology` against Go APIs on `:8081`.

**Configure ontology-sdk** to use `ONTOLOGY_SERVICE_URL=http://localhost:8081` (not upstream Fastify API).

```bash
# Future
make agent-service-dev
```
