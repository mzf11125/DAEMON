.PHONY: up down up-legacy up-apps down-apps up-merge-track down-merge-track up-gateway down-gateway docker-build docker-build-platform-api docker-build-ontology-service docker-build-ingestion-service docker-build-rules-engine docker-build-case-service docker-build-control-plane docker-push migrate migrate-legacy seed seed-sandbox seed-express-cargo test test-integration bootstrap-integration-local validate-ontology ontology-validate ontology-compile pipeline-all pipeline-raw run-platform-api run-ontology-service run-rules-engine run-case-service run-ingestion-service pnpm-workspace aip-build aip-eval aip-llm-build aip-orchestrator prove-aip-eval prove-operational-loop prove-p3-geo prove-sandbox-sectors prove-traffic-engineering prove-logistics-nvocc prove-express-cargo-sim prove-staging-smoke train-propensity-express backtest-propensity-express prove-market-intel prove-market-intel-social prove-market-intel-rag prove-market-intel-hybrid prove-market-intel-research prove-market-intel-shodan prove-market-intel-security check-vendor-neutral check-sandbox-registry check-express-cargo-catalog ontology-sync platform-check check-data demo supabase-up supabase-down supabase-status verify-auth-migration seed-control-plane agent-bridge-smoke market-intel-install dev dev-run console watch-platform-api watch-ontology-service watch-ingestion-service watch-rules-engine watch-case-service watch-all watch-test githooks hooks ci-local

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

# ── Container build ──────────────────────────────────────────
DOCKER_REGISTRY ?= ghcr.io/daemon-blockint-tech/daemon
DOCKER_TAG      ?= latest
DOCKER_PLATFORM ?= linux/amd64,linux/arm64

docker-build:
	@for svc in platform-api ontology-service ingestion-service rules-engine case-service; do \
		echo ":: building daemon/$$svc:$(DOCKER_TAG)"; \
		docker build -f "services/$$svc/Dockerfile" -t "daemon/$$svc:$(DOCKER_TAG)" .; \
	done
	@echo ":: docker-build done (5 images)"

docker-build-platform-api:
	docker build --platform $(DOCKER_PLATFORM) -f services/platform-api/Dockerfile -t daemon/platform-api:$(DOCKER_TAG) .
docker-build-ontology-service:
	docker build --platform $(DOCKER_PLATFORM) -f services/ontology-service/Dockerfile -t daemon/ontology-service:$(DOCKER_TAG) .
docker-build-ingestion-service:
	docker build --platform $(DOCKER_PLATFORM) -f services/ingestion-service/Dockerfile -t daemon/ingestion-service:$(DOCKER_TAG) .
docker-build-rules-engine:
	docker build --platform $(DOCKER_PLATFORM) -f services/rules-engine/Dockerfile -t daemon/rules-engine:$(DOCKER_TAG) .
docker-build-case-service:
	docker build --platform $(DOCKER_PLATFORM) -f services/case-service/Dockerfile -t daemon/case-service:$(DOCKER_TAG) .
docker-build-control-plane:
	docker build --platform $(DOCKER_PLATFORM) -f apps/control-plane/Dockerfile -t daemon/control-plane:$(DOCKER_TAG) .

docker-push: docker-build
	@for svc in platform-api ontology-service ingestion-service rules-engine case-service; do \
		docker tag "daemon/$$svc:$(DOCKER_TAG)" "$(DOCKER_REGISTRY)/$$svc:$(DOCKER_TAG)"; \
		docker push "$(DOCKER_REGISTRY)/$$svc:$(DOCKER_TAG)"; \
	done
	@echo ":: docker-push done"

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

# Apply all Postgres DDL as superuser (Supabase local :54332). Use SEED_DATABASE_URL, not daemon_runtime.
SEED_DATABASE_URL ?= postgresql://postgres:postgres@127.0.0.1:54332/postgres?sslmode=disable

migrate-superuser:
	@set -e; \
	for f in infra/migrations/postgres/*.sql; do \
		echo "==> $$f"; \
		psql "$(SEED_DATABASE_URL)" -v ON_ERROR_STOP=0 -f "$$f" || true; \
	done; \
	echo "migrate-superuser: OK (re-run safe; inspect psql output for unexpected errors)"

migrate-legacy:
	psql "$(DATABASE_URL)" -f infra/migrations/postgres/001_init.sql
	psql "$(DATABASE_URL)" -f infra/migrations/postgres/002_indexes_fk.sql || true
	psql "$(DATABASE_URL)" -f infra/migrations/postgres/003_ingestion_params.sql || true
	psql "$(DATABASE_URL)" -f infra/migrations/postgres/004_supabase_compat_roles.sql
	psql "$(DATABASE_URL)" -f infra/migrations/postgres/005_authenticated_grants.sql
	psql "$(DATABASE_URL)" -f infra/migrations/postgres/006_p3_geo_attachments.sql
	psql "$(DATABASE_URL)" -f infra/migrations/postgres/007_market_intel_pgvector.sql
	psql "$(DATABASE_URL)" -f infra/migrations/postgres/008_action_proposals.sql
	psql "$(DATABASE_URL)" -f infra/migrations/postgres/009_audit_event_class_and_archive_batches.sql || true

market-intel-install:
	@ROOT="$(CURDIR)"; \
	PY=$$(for c in python3.12 python3.11 python3.10 python3; do \
	  command -v $$c >/dev/null 2>&1 && $$c -c 'import sys; raise SystemExit(0 if sys.version_info >= (3,10) else 1)' && echo $$c && break; \
	done); \
	test -n "$$PY" || (echo "Python 3.10+ required" && exit 1); \
	$$PY -m venv pipelines/market-intel/.venv; \
	pipelines/market-intel/.venv/bin/pip install -e pipelines/market-intel

prove-market-intel:
	./scripts/prove-market-intel.sh

prove-market-intel-social:
	./scripts/prove-market-intel-social.sh

prove-market-intel-rag:
	./scripts/prove-market-intel-rag.sh

prove-market-intel-hybrid:
	./scripts/prove-market-intel-hybrid.sh

prove-market-intel-research:
	./scripts/prove-market-intel-research.sh

prove-market-intel-shodan:
	./scripts/prove-market-intel-shodan.sh

prove-market-intel-security:
	./scripts/prove-market-intel-security.sh

seed:
	cd infra/seed && go run .

seed-sandbox: seed

seed-express-cargo: seed

prove-p3-geo:
	./scripts/prove-p3-geo.sh

prove-sandbox-sectors:
	./scripts/prove-sandbox-sectors.sh

prove-traffic-engineering:
	./scripts/prove-traffic-engineering.sh

prove-logistics-nvocc:
	./scripts/prove-logistics-nvocc.sh

prove-express-cargo-sim:
	./scripts/prove-express-cargo-sim.sh

prove-staging-smoke:
	./scripts/prove-staging-smoke.sh

train-propensity-express:
	cd pipelines/propensity-train && go run ./cmd

# Supabase local default when DATABASE_URL unset (see .env.example)
LOCAL_DATABASE_URL ?= postgresql://daemon_runtime:daemon_runtime_local@127.0.0.1:54332/postgres?sslmode=disable

audit-archival-dry-run:
	cd pipelines/audit-archival && DATABASE_URL="$(or $(DATABASE_URL),$(LOCAL_DATABASE_URL))" go run ./cmd --dry-run

test-audit-archival-integration:
	@SEED=$${SEED_DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54332/postgres?sslmode=disable}; \
	cd pipelines/audit-archival && SEED_DATABASE_URL="$$SEED" go test -tags=integration -count=1 -timeout=120s ./internal/archiver/...

phase0-ruleset-apply:
	ENFORCEMENT=active ./scripts/apply-github-ruleset.sh

phase0-staging-proof:
	@test -f .env.staging || (echo "cp .env.staging.example .env.staging and set HTTPS URLs" >&2; exit 1)
	@set -a && . ./.env.staging && set +a && PHASE0_STRICT=1 ./scripts/run-phase0-staging-proof.sh

backtest-propensity-express:
	./scripts/backtest-propensity-express.sh

bootstrap-integration-local:
	./scripts/bootstrap-integration-local.sh

check-vendor-neutral:
	./scripts/check-vendor-neutral-language.sh

check-sandbox-registry:
	./scripts/check-sandbox-registry-drift.sh

check-express-cargo-catalog:
	./scripts/check-express-cargo-catalog.sh

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
	@if docker info >/dev/null 2>&1; then \
		unset INTEGRATION_USE_LOCAL; \
	fi; \
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
	./scripts/ensure-aip-eval-stack.sh
	OIDC_REQUIRED=false TENANT_ID=tenant-demo pnpm --filter @daemon/aip-agent eval

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

pre-push-gate:
	./scripts/pre-push-gate.sh

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

# ══════════════════════════════════════════════════════════════
# Development automation
# ══════════════════════════════════════════════════════════════

# One-command dev environment: infra + migrate + seed + all pipelines.
dev: up supabase-up migrate seed pipeline-all ontology-sync
	@echo ""
	@echo "═══ Dev environment ready ═══"
	@echo "  make dev-run          — start all 5 Go services"
	@echo "  make dev-watch        — start all services with auto-reload"
	@echo "  make console          — start console-web UI"
	@echo "  make platform-check   — verify endpoints"
	@echo ""

# Start all 5 Go services in background.
dev-run:
	@$(MAKE) run-platform-api &
	@sleep 0.5
	@$(MAKE) run-ontology-service &
	@sleep 0.5
	@$(MAKE) run-ingestion-service &
	@sleep 0.5
	@$(MAKE) run-rules-engine &
	@sleep 0.5
	@$(MAKE) run-case-service &
	@echo "All 5 services starting (ports 8080–8084)"
	@echo "  platform-api    → http://localhost:8080/health"
	@echo "  ontology-svc    → http://localhost:8081/health"
	@echo "  ingestion-svc   → http://localhost:8082/health"
	@echo "  rules-engine    → http://localhost:8083/health"
	@echo "  case-service    → http://localhost:8084/health"

# Start console-web UI.
console:
	pnpm --filter @daemon/console-web dev

# ── File watchers (auto-reload on save) ─────────────────────

WATCHER = cd scripts/watcher && GOWORK=off go run . --repo=$(CURDIR)

watch-platform-api:
	$(WATCHER) --dir=services/platform-api -- make run-platform-api

watch-ontology-service:
	$(WATCHER) --dir=services/ontology-service -- make run-ontology-service

watch-ingestion-service:
	$(WATCHER) --dir=services/ingestion-service -- make run-ingestion-service

watch-rules-engine:
	$(WATCHER) --dir=services/rules-engine -- make run-rules-engine

watch-case-service:
	$(WATCHER) --dir=services/case-service -- make run-case-service

# Watch a single package's tests on change.
watch-test:
	$(WATCHER) --dir=packages/go-common -- go test ./... -count=1

# ── Git hooks ────────────────────────────────────────────────

githooks:
	./scripts/git-hooks/install.sh

hooks: githooks

# ── Full CI gate (what GitHub Actions runs, locally) ────────

ci-local: ontology-sync
	@echo "=== CI: go vet + test all modules ==="
	@for dir in packages/go-common packages/pipeline-runner infra/seed \
	  services/platform-api services/ontology-service services/ingestion-service \
	  services/rules-engine services/case-service \
	  pipelines/raw-ingest pipelines/transforms pipelines/features pipelines/quality \
	  pipelines/propensity-train pipelines/audit-archival; do \
	  echo "--- $$dir ---"; \
	  (cd $$dir && go mod tidy && go vet ./... && go test ./... -count=1) || exit 1; \
	done
	pnpm install --frozen-lockfile || pnpm install
	pnpm -r typecheck
	./scripts/check-no-stub-handlers.sh
	./scripts/check-maturation-policy.sh
	./scripts/check-vendor-neutral-language.sh
	./scripts/check-sandbox-registry-drift.sh
	./scripts/check-express-cargo-catalog.sh
	@echo "=== ci-local PASSED ==="
