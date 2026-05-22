# DAEMON maturation gates (post Phase 2)

## Integration CI

- `make test` — Go unit tests across services
- `.github/workflows/aip-eval.yml` — golden MCP eval with Postgres seed
- Adopt upstream `test-compose` pattern when `external/daemon-system-ontology` is pinned

## Production agent claims

Do **not** claim production-grade autonomous agents until:

1. `aip/agent-service` deployed with ontology-sdk → `:8081`
2. Merge Phase 2 plugin mapping (analytics → ClickHouse, monitoring → rules-engine) verified
3. Eval baseline green 7d with flake &lt; 10%

## Phase 2 proof

```bash
make aip-build && ./scripts/prove-aip-eval.sh
```
