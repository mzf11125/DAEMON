# DAEMON CLI (`@daemon/cli`)

Vendored from upstream `external/daemon-system-ontology/apps/cli` (Merge Phase 1).

## Commands

- `daemon-cli init` — tenant DB migrate + schema upload
- `daemon-cli migrate` — run ontology-engine SQL migrations
- `daemon-cli schema-upload` — upload YAML schemas to registry
- `daemon-cli token` — mint dev JWT

## Development

```bash
pnpm install
pnpm --filter @daemon/cli test
pnpm --filter @daemon/cli run dev -- --help
```

Set `DATABASE_URL` or `DB_*` env vars per `.env.example` in repo root. Uses `@daemon/ontology-engine` and `@daemon/ontology-language` workspace packages.

Not wired into `make demo` / `make up` — run explicitly during ontology tenant bootstrap.
