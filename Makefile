.PHONY: up down up-legacy up-apps down-apps up-merge-track down-merge-track up-gateway down-gateway migrate migrate-legacy seed seed-sandbox test test-integration validate-ontology ontology-validate ontology-compile pipeline-all pipeline-raw run-platform-api run-ontology-service run-rules-engine run-case-service run-ingestion-service pnpm-workspace aip-build aip-eval aip-llm-build aip-orchestrator prove-aip-eval prove-operational-loop prove-p3-geo prove-sandbox-sectors ontology-sync platform-check check-data demo supabase-up supabase-down supabase-status verify-auth-migration seed-control-plane agent-bridge-smoke

COMPOSE := docker compose -f infra/docker/docker-compose.yml

# Analytics only — Postgres/Auth via Supabase CLI (:54332/:54331), not legacy docker postgres/keycloak.
up:
	$(COMPOSE) up -d clickhouse neo4j

# All profiles so legacy postgres/keycloak and default clickhouse/neo4j are removed together.
down:
	$(COMPOSE) --profile legacy-keycloak --profile apps down --remove-orphans

up-legacy:
	$(COMPOSE) --profile legacy-keycloak up -d

supabase-up:
	supabase start

supabase-down:
	supabase stop

supabase-status:
	@supabase status 2>/dev/null || (echo "Run: supabase start" >&2; exit 1)

verify-auth-migration:
	./scripts/verify-auth-migration.sh

up-apps:
	docker compose -f infra/docker/docker-compose.yml --profile apps up -d --build

down-apps:
	docker compose -f infra/docker/docker-compose.yml --profile apps down

up-merge-track:
	$(COMPOSE) --profile merge-track up -d

down-merge-track:
	$(COMPOSE) --profile merge-track down

up-gateway:
	$(COMPOSE) --profile gateway up -d

down-gateway:
	$(COMPOSE) --profile gateway down

seed-control-plane:
	./scripts/seed-control-plane-demo-tenant.sh

prove-operational-loop:
	./scripts/prove-operational-loop.sh

migrate:
	@if command -v supabase >/dev/null 2>&1 && [ -f supabase/config.toml ]; then \
		supabase db reset || { \
			echo "migrate: db reset exited non-zero (often 502 after migrations); verifying Supabase..." >&2; \
			sleep 3; \
			curl -sf "http://127.0.0.1:54331/auth/v1/health" >/dev/null \
				|| { supabase stop; supabase start; }; \
		}; \
	else \
		$(MAKE) migrate-legacy; \
	fi
	@./scripts/apply-clickhouse-migrations.sh || echo "migrate: skip ClickHouse SQL (start clickhouse: make up)"

migrate-legacy:
	psql "$(DATABASE_URL)" -f infra/migrations/postgres/001_init.sql
	psql "$(DATABASE_URL)" -f infra/migrations/postgres/002_indexes_fk.sql || true
	psql "$(DATABASE_URL)" -f infra/migrations/postgres/003_ingestion_params.sql || true
	psql "$(DATABASE_URL)" -f infra/migrations/postgres/004_supabase_compat_roles.sql
	psql "$(DATABASE_URL)" -f infra/migrations/postgres/005_authenticated_grants.sql

seed:
	cd infra/seed && go run .

seed-sandbox: seed

prove-p3-geo:
	./scripts/prove-p3-geo.sh

prove-sandbox-sectors:
	./scripts/prove-sandbox-sectors.sh

pipeline-raw:
	cd pipelines/raw-ingest && go run ./cmd

pipeline-transforms:
	cd pipelines/transforms && go run ./cmd

pipeline-features:
	cd pipelines/features && go run ./cmd

pipeline-quality:
	cd pipelines/quality && go run ./cmd

pipeline-all: pipeline-raw pipeline-transforms pipeline-features pipeline-quality

test-integration:
	cd tests/integration && go test -tags=integration -count=1 -timeout=15m ./...

test:
	@for dir in packages/go-common packages/dune-ingest packages/pipeline-runner \
	  services/platform-api services/ontology-service services/ingestion-service \
	  services/rules-engine services/case-service \
	  pipelines/raw-ingest pipelines/transforms pipelines/features pipelines/quality \
	  infra/seed; do \
	  (cd $$dir && go test ./...) || exit 1; \
	done
	pnpm -r typecheck

ontology-compile: pnpm-workspace
	pnpm --filter @daemon/ontology-language build
	pnpm ontology:compile

ontology-validate:
	ONTOLOGY_ROOT=ontology/v2-compiled ./scripts/validate-ontology.sh

validate-ontology: ontology-sync

check-stubs:
	./scripts/check-no-stub-handlers.sh

run-platform-api:
	cd services/platform-api && go run ./cmd

run-ontology-service:
	cd services/ontology-service && go run ./cmd

run-ingestion-service:
	cd services/ingestion-service && go run ./cmd

run-rules-engine:
	cd services/rules-engine && go run ./cmd

run-case-service:
	cd services/case-service && go run ./cmd

pnpm-workspace:
	pnpm install

aip-build: pnpm-workspace
	pnpm --filter @daemon/mcp-ontology build
	pnpm --filter @daemon/aip-agent build

aip-llm-build: pnpm-workspace
	pnpm --filter @daemon/llm-gateway build

aip-eval: aip-build
	pnpm --filter @daemon/aip-agent eval

# Override: make aip-orchestrator CASE=investigate-case-readonly
CASE ?= triage-list-signals
aip-orchestrator: aip-build
	pnpm --filter @daemon/aip-agent orchestrator -- --case $(CASE)

prove-aip-eval: aip-build
	./scripts/prove-aip-eval.sh

cli-test: pnpm-workspace ontology-engine-build
	pnpm --filter @daemon/cli test

ontology-engine-build: pnpm-workspace
	pnpm --filter @daemon/ontology-language build
	pnpm --filter @daemon/ontology-engine build

cli-build: ontology-engine-build
	pnpm --filter @daemon/cli build

agent-bridge-smoke:
	./scripts/smoke-agent-bridge.sh

cp-test: pnpm-workspace
	pnpm --filter @daemon/control-plane test

maturation-policy:
	./scripts/check-maturation-policy.sh

ontology-sync:
	./scripts/ontology-sync.sh

platform-check:
	./scripts/platform-check.sh

check-data:
	./scripts/data-health-check.sh

demo: up supabase-up migrate seed pipeline-all ontology-sync
	@echo "Data ready (ontology v2-compiled synced). Run: ./scripts/supabase-seed-auth.sh && make run-platform-api (etc.)"

dune-dev-setup:
	@echo "Layer A (developer machine, not CI) — see docs/integrations/dune-agent-tooling-v1.md"
	@echo "  curl -sSfL https://dune.com/cli/install.sh | sh"
	@echo "  export DUNE_API_KEY=...  # or: dune auth"
	@echo "  npx skills add duneanalytics/skills   # skills: dune + sim"
	@echo "  Optional MCP: merge docs/integrations/cursor-mcp-dune.example.json into .cursor/mcp.json"
	@echo "  Docs index: https://docs.dune.com/llms.txt"

ingest-sim-demo:
	@test -n "$$SIM_API_KEY" || (echo "SIM_API_KEY required" >&2; exit 1)
	curl -sf -X POST "http://localhost:8082/v1/jobs" \
		-H "Content-Type: application/json" \
		-H "X-Tenant-Id: tenant-demo" \
		-d '{"connector":"sim-dune","params":{"addresses":["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"],"chain_ids":[1],"sources":["balances"],"limit_per_address":10}}'

ingest-dune-demo:
	@test -n "$$DUNE_API_KEY" || (echo "DUNE_API_KEY required" >&2; exit 1)
	@test -n "$$DUNE_DEMO_QUERY_ID" || (echo "DUNE_DEMO_QUERY_ID required (saved query id)" >&2; exit 1)
	curl -sf -X POST "http://localhost:8082/v1/jobs" \
		-H "Content-Type: application/json" \
		-H "X-Tenant-Id: tenant-demo" \
		-d "$$(printf '%s' '{"connector":"dune-sql","params":{"mode":"query_id","query_id":%s,"column_map":{"observation_id":"id","asset_id":"wallet","label":"metric","value":"amount_usd","observed_at":"block_time"}}}' "$$DUNE_DEMO_QUERY_ID")"
