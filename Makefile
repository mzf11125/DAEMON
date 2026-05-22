.PHONY: up down up-legacy up-apps down-apps migrate migrate-legacy seed test test-integration validate-ontology pipeline-all pipeline-raw run-platform-api run-ontology-service run-rules-engine run-case-service run-ingestion-service aip-build aip-eval platform-check check-data demo supabase-up supabase-down supabase-status verify-auth-migration

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
	@if command -v clickhouse-client >/dev/null 2>&1; then \
		clickhouse-client --host localhost --user daemon --password daemon --multiquery < infra/migrations/clickhouse/001_init.sql || true; \
		clickhouse-client --host localhost --user daemon --password daemon --multiquery < infra/migrations/clickhouse/002_tenant_observations.sql || true; \
	else \
		echo "migrate: skip ClickHouse SQL (clickhouse-client not installed; run make up first if you need CH)"; \
	fi

migrate-legacy:
	psql "$(DATABASE_URL)" -f infra/migrations/postgres/001_init.sql
	psql "$(DATABASE_URL)" -f infra/migrations/postgres/002_indexes_fk.sql || true
	psql "$(DATABASE_URL)" -f infra/migrations/postgres/003_ingestion_params.sql || true

seed:
	cd infra/seed && go run .

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

validate-ontology:
	./scripts/validate-ontology.sh

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

aip-build:
	pnpm --filter @daemon/mcp-ontology build
	pnpm --filter @daemon/aip-agent build

aip-eval: aip-build
	pnpm --filter @daemon/aip-agent eval

platform-check:
	./scripts/platform-check.sh

check-data:
	./scripts/data-health-check.sh

demo: up supabase-up migrate seed pipeline-all
	@echo "Data ready. Run: ./scripts/supabase-seed-auth.sh && make run-platform-api (etc.)"

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
