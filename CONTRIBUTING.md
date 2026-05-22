# Contributing to DAEMON

Thank you for helping improve the platform. This document covers expectations for code, layout, and verification. Setup lives in [README.md](README.md); deeper layout notes are in [docs/developer-tools/repo-layout.md](docs/developer-tools/repo-layout.md).

## Quality charter

1. **No mocks in runtime paths** — HTTP handlers read and write real stores (Postgres via Supabase, ClickHouse, Neo4j when enabled). Tests may use `internal/testutil` or integration harnesses only.
2. **No stubs on shipped routes** — implement the behavior or return `501 Not Implemented`; do not return hardcoded fake payloads. Enforced by `./scripts/check-no-stub-handlers.sh`.
3. **Production quality** — validated inputs, structured errors (`packages/go-common/http`), versioned migrations, `GET /health` on every service.
4. **Directory discipline** — one concern per top-level folder; no Go under `ontology/`; no deployable apps under `packages/`.
5. **No AI slop** — minimal abstractions; match existing patterns; every file belongs in its owner folder.
6. **Traceability** — user-visible behavior changes should update [docs/traceability/foundry-parity-v1.md](docs/traceability/foundry-parity-v1.md) or the relevant UX/governance doc when they affect the operational loop or public API.

## Folder rules

| Path | Allowed |
|------|---------|
| `apps/` | UI and thin API clients only |
| `services/` | Go HTTP servers and orchestration |
| `packages/` | Shared libraries (Go, TS); not standalone deployables |
| `ontology/` | JSON manifests and pack definitions only |
| `api/` | OpenAPI and contract artifacts |
| `pipelines/` | Batch/stream CLIs |
| `aip/` | MCP servers, agent evals, tool schemas |
| `infra/` | Docker Compose, SQL migrations, seed |
| `supabase/` | Local Supabase project config |
| `scripts/` | CI, smoke, validation helpers |
| `tests/` | Integration and cross-service tests |
| `observability/` | Check and lineage schemas |
| `interfaces/` | Interface and API boundary specs |
| `docs/` | Architecture, operations, developer guides |

Do not commit `.env`, API keys, or `.cursor/plans/`. Use [.env.example](.env.example) as the template.

## Local development

Run **all** `make` and `./scripts/*` commands from the **repository root**.

```bash
cp .env.example .env
make demo
./scripts/supabase-seed-auth.sh
```

Then start the services you need (see README). Optional sanity check after services are up:

```bash
./scripts/platform-check.sh
```

## HTTP API changes

When adding or changing routes:

- Use the shared envelope in `packages/go-common/http` (`WriteJSON`, `WriteErrorRequest`, list pagination via `ParseListPagination`).
- Propagate `requestId` from context; errors should include `requestId` and `timestamp` where possible.
- Use `422` (`StatusUnprocessable`) for validation failures, not generic `400`, unless the codebase already uses a specific code for that route.
- Update [api/openapi-v1.yaml](api/openapi-v1.yaml) and [docs/api-contracts/README.md](docs/api-contracts/README.md).
- Extend [packages/sdk-ts](packages/sdk-ts) when console or external clients need the surface.
- Ontology **actions** stay on `POST /v1/actions/{actionType}`; read-only helpers use `POST /v1/functions/{name}`.

See [docs/developer-tools/api.md](docs/developer-tools/api.md).

## Ontology and packs

- Edit manifests under `ontology/v2/`; run `make validate-ontology` before opening a PR.
- Sector packs: `ontology/v2/examples/packs/*/manifest.json` — follow [docs/lifecycle/pack-framework-v1.md](docs/lifecycle/pack-framework-v1.md).
- Role gates for actions are defined in the manifest; do not bypass them in handlers.

## Checks before PR

Minimum (matches CI `validate` job):

```bash
make test
make validate-ontology
./scripts/check-no-stub-handlers.sh
```

With Docker and Supabase CLI available, also run:

```bash
make test-integration
./scripts/e2e-smoke.sh
```

For operational-loop regressions (same as CI `e2e-full`):

```bash
E2E_FULL=1 ./scripts/e2e-smoke.sh
# or
./scripts/prove-operational-loop.sh
```

Go services are separate modules — build or test from each `services/*/`, `packages/*`, or `pipelines/*` directory if you are not using `make test`.

TypeScript:

```bash
pnpm install
pnpm -r typecheck
```

## New Go service

Follow [docs/developer-tools/new-go-service-checklist.md](docs/developer-tools/new-go-service-checklist.md): auth stack, health, Makefile targets, `platform-check.sh`, service catalog, and e2e-smoke if the route is on the critical path.

## Commits and pull requests

Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, …). Explain *why* in the body when the change is not obvious.

PR descriptions should note:

- Which services or apps changed
- Whether migrations or `make seed` / auth seed scripts are required
- Whether OpenAPI or console behavior changed
- How you verified (commands run)

CI runs on push/PR to `main`/`master`: unit tests, ontology validation, stub check, TypeScript typecheck, integration tests, and `E2E_FULL` smoke (see [.github/workflows/ci.yml](.github/workflows/ci.yml)).

## Security and confidentiality

- Do not paste production credentials, tenant payloads, or partner-specific data into issues, commits, or public docs.
- Prefer env vars and local `.env` for secrets.
- Public README and docs should stay generic (no NDA counterparty names or private URLs unless explicitly approved).

## Questions

- Docs index: [docs/README.md](docs/README.md)
- Stop-the-line: [docs/operations/stop-the-line-policy-v1.md](docs/operations/stop-the-line-policy-v1.md)
