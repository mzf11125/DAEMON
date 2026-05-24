# Developer sandbox v1

Local **developer sandbox** for simulating all 23 sector packs without cloud credentials or vendor SDKs. Data is synthetic only (`syn.demo.*` / `ri.demo.*` IDs, fictional names).

## Quick start

```bash
make up                    # ClickHouse + Neo4j
make supabase-up           # Postgres + Auth (:54332 / :54331)
make migrate
make seed-sandbox          # Full tenant-demo seed (all sectors)
make up-apps               # platform-api, ontology-service, case-service, …
```

Console: `http://localhost:3000` (after `cd apps/console-web && npm run dev`).

| Credential | Value |
|------------|-------|
| Tenant | `tenant-demo` |
| Demo user | `analyst@demo.local` (see `supabase status` for JWT) |
| Tenant header (dev) | `X-Tenant-Id: tenant-demo` when `OIDC_REQUIRED=false` |

## Environment flags

| Variable / flag | Effect |
|----------|--------|
| `SEED_ALL_SECTORS=1` (default) | Load P3 verticals + all 23 sector synthetic blocks |
| `SEED_ALL_SECTORS=0` | Base demo tenant only (skip sector sandbox seeds) |
| `go run ./infra/seed --sandbox` | Force full sector registry (same as default) |
| `SKIP_NEO4J_SEED=1` | Skip graph links during seed (Postgres-only) |
| `DATABASE_URL` | Postgres DSN (default local Supabase `:54332`) |
| `INTEGRATION_USE_LOCAL=1` | Integration tests use local Supabase + compose ClickHouse instead of testcontainers. **Docker Desktop must be running** — bootstrap with `./scripts/bootstrap-integration-local.sh` (or `make up`, `make supabase-up`, `make migrate`). Preflight: `./scripts/check-integration-local-stack.sh`. |
| `OIDC_REQUIRED` | `true` for console-web (Supabase JWT). `false` for `make aip-eval` and integration harness — see [aip/developer-sandbox-v1.md](../aip/developer-sandbox-v1.md). |
| `EVAL_SKIP_STACK_BOOTSTRAP=1` | Skip `ensure-aip-eval-stack.sh` when CI already started Neo4j + ontology with eval env overrides. |

## Sector packs (23)

Each `packId` has:

- Ontology pack under `ontology/v2/examples/packs/{packId}/`
- Fixture connector under `connectors/synthetic/{packId}/`
- Gate packet under `docs/governance/sandbox-gates/{packId}-v1.md`
- Assume-case narrative under `docs/ontology/{packId}-assume-case-v1.md` (where applicable)

Geo-enabled sectors appear on `/live` via `GET /v1/geo/map`. Non-geo sectors still seed `Site` rows for sandbox smoke tests; map pins may use region centroids only.

## Smoke commands

**Docker Desktop must be running** for integration proofs (testcontainers or local stack).

```bash
# Default: ephemeral Postgres/ClickHouse via testcontainers (Docker required)
./scripts/prove-p3-geo.sh
./scripts/prove-sandbox-sectors.sh

# Optional: reuse long-lived local stack (also requires Docker for compose + Supabase)
./scripts/bootstrap-integration-local.sh
INTEGRATION_USE_LOCAL=1 ./scripts/prove-p3-geo.sh
INTEGRATION_USE_LOCAL=1 ./scripts/prove-sandbox-sectors.sh

./scripts/prove-express-cargo-sim.sh   # express-cargo G-EC prove (catalog + integration)
./scripts/prove-plugin-remap.sh        # P3: CH observations → rules-engine evaluate
make test-integration                  # attachments, geo, RLS, operational loop
./scripts/check-vendor-neutral-language.sh
./scripts/check-sandbox-registry-drift.sh
```

## Stop-the-line policy (Tier 1)

Merge is blocked when any of the following fail:

1. **Vendor-neutral grep** — `./scripts/check-vendor-neutral-language.sh` (forbidden trademarks in `docs/`, `README`, agents, services, apps, `packages/`).
2. **Registry drift** — `./scripts/check-sandbox-registry-drift.sh` (23 connector manifests, gate packets, integration test table must align).
3. **Fixture change without version bump** — editing `connectors/synthetic/{packId}/*` requires bumping `fixtureVersion` in that pack's manifest and updating the matching gate packet + matrix row.
4. **Sector removal** — removing a `packId` requires deleting its gate packet, integration subtest, seed function, and matrix row in the same change.
5. **Integration smoke** — `./scripts/prove-sandbox-sectors.sh` must exit 0 before release promotion.

## Per-sector manual check

After seed:

```sql
SELECT COUNT(*) FROM ontology_objects
WHERE tenant_id = 'tenant-demo' AND object_type = 'Site'
  AND properties->>'vertical' = 'mission-tasking';
```

Expect ≥ 1.

## Related

- [capability-pattern-index-v1.md](../research/capability-pattern-index-v1.md)
- [operational-sample-patterns-v1.md](../research/operational-sample-patterns-v1.md)
- [developer-sandbox-v1.md (AIP)](../aip/developer-sandbox-v1.md)
- [vendor-neutral-content-v1.md](../governance/vendor-neutral-content-v1.md)
- [cursor-operational-parity.md](./cursor-operational-parity.md)
