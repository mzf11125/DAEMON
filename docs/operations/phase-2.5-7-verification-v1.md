# Phase 2.5–7 verification log (local)

**Date:** 2026-05-25  
**Scope:** Policy gates, `pipelines/audit-archival`, compliance doc hygiene, optional Postgres integration tests.

## Policy gates

| Check | Result | Notes |
|-------|--------|-------|
| `make ontology-sync` | PASS | `ontology/v2-compiled` validated |
| `./scripts/check-maturation-policy.sh` | PASS | |
| `./scripts/check-no-stub-handlers.sh` | PASS | |
| `make platform-check` | PASS (WARN) | Supabase Auth and `:8080`–`:8084` not up locally; rules + ontology validate OK |
| `go vet ./pipelines/audit-archival/...` | PASS | |
| `go test ./pipelines/audit-archival/...` | PASS | Unit tests |
| `make test-audit-archival-integration` | PASS | `SEED_DATABASE_URL` → Supabase `:54332`; dry-run + live archival rows |
| `go test -tags=integration ./pipelines/audit-archival/internal/archiver/...` | PASS | Same as `make test-audit-archival-integration` when stack up |
| `make audit-archival-dry-run` | PASS | `DATABASE_URL` / `LOCAL_DATABASE_URL` on `:54332`; "no unarchived rows" OK |
| `make migrate-superuser` | PASS | Applies `infra/migrations/postgres/*.sql` via `SEED_DATABASE_URL` (re-run safe) |

## CI

| Item | Result |
|------|--------|
| `pipelines/audit-archival` in `.github/workflows/ci.yml` validate loop | Present (`go build`, `go test`, `go vet`) |

## Docs

| Item | Result |
|------|--------|
| Canonical ISO SoA | [iso27001-soa-v1.md](../compliance/iso27001-soa-v1.md) |
| Redirect stub | [iso-27001-soa-v1.md](../compliance/iso-27001-soa-v1.md) |
| SOC 2 matrix link to SoA | Fixed to `iso27001-soa-v1.md` |

## Runtime / tests

| Item | Result |
|------|--------|
| Migration `009_audit_event_class_*` | In repo; applied in [testutil migrate](../../packages/go-common/testutil/migrate.go) for container tests |
| `event_class` on audit INSERT paths | `packages/go-common/audit` + platform-api / ontology-service |
| Integration archival test | [postgres_integration_test.go](../../pipelines/audit-archival/internal/archiver/postgres_integration_test.go) (`//go:build integration`) |

## Out of scope (operator)

- Staging hostnames, S3 Object Lock bucket, pen test vendor, SOC 2 observation, GA cutover.
