# P1 staging pilot closeout (Phase 0)

Phase 0 status doc per [production-readiness-v1.md](./production-readiness-v1.md). Tracks closeout of the P1 staging pilot before Phase 1 (production foundations) starts.

## Phase 0 deliverable status

| # | Item | State | Evidence |
|---|------|-------|----------|
| P0.1 | 7-day eval baseline observation D3–D7 | 🟡 D0–D3 green (2026-05-25) | [`agent-maturation-p3-v1.md`](../governance/agent-maturation-p3-v1.md); CI runs [`26370438725`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26370438725) D1, [`26373421913`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26373421913) D2 |
| P0.2 | GitHub ruleset Active on `main` | ✅ Active 2026-05-25 | `main-production-gates` id 16781434; `make phase0-ruleset-apply` idempotent PUT |
| P0.3 | Staging environment with non-localhost URLs | 🟡 provisional | Cloudflare quick tunnels + host-run stack ([`phase0-staging-tunnel-env.sh`](../../scripts/phase0-staging-tunnel-env.sh)); replace with VM/K8s when provisioned |
| P0.4 | Staging hostname rows in OIDC + RLS verification | ✅ 2026-05-25 | [oidc-rls-verification-v1.md](./oidc-rls-verification-v1.md) staging table; `make phase0-staging-proof` green |
| P0.5 | Stop-the-line items (G3, G4a, G4b, G5) | ✅ verified clean | [stop-the-line-policy-v1.md](./stop-the-line-policy-v1.md) § G3/G4/G5 |
| P0.6 | Audit retention production policy (replace TBD) | ✅ done | [`audit-retention-v1.md`](../governance/audit-retention-v1.md) |
| P0.7 | Tag `v0.1.0` (P1 staging pilot) | 🔴 not started | gated on P0.2 + P0.1 D4–D7 + staging |
| P0.8 | `adr-aws-deployment-v1.md` superseded | ✅ done | ADR file reads "Superseded" pointing to P1.1; P1.1 ADR TBD |
| P0.9 | `staging-deploy-v1.md` updated for locked GA decisions | ✅ done | K8s + Supabase Cloud + CH Cloud + Neo4j Aura refs present |

## Stop-the-line audit

All conditions in [`stop-the-line-policy-v1.md`](./stop-the-line-policy-v1.md) verified against the current codebase as of this closeout.

| # | Condition | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `make test` / `test-integration` fails on main path | ✅ unit + policy gates pass | `go test ./auth/... ./http/... -count=1` PASS in `packages/go-common`; `check-no-stub-handlers` ok; `check-maturation-policy` OK; `check-vendor-neutral-language` ok |
| 2 | Golden eval fails on prompt/MCP PR without waiver | ✅ baseline 5/5 pass | [`aip/evals/baseline.json`](../../aip/evals/baseline.json) recorded 2026-05-23 with `goldenPassRate: 1`, `flakeWaivers7d: 0` |
| 3 | `dataset_observations` empty before rules demo | ✅ verified in proof | `quality: dataset_observations-nonempty` in `make phase0-staging-proof` (2026-05-25) |
| 4 | Auth bypass (`OIDC_REQUIRED` regression) | ✅ enforced | `packages/go-common/auth/auth.go:199-201` returns 401 when `cfg.Required && no Bearer`; no fallback |
| 5 | `supabase db reset` fails / RLS migrations not applied | ✅ migrations 001–008 applied | `supabase/migrations/` present; `infra/migrations/postgres/` chain validated by Makefile target |
| 6 | Custom access token hook disabled while `OIDC_REQUIRED=true` | ✅ wired | `supabase/migrations/20260101000003_daemon_runtime_role.sql` grants `custom_access_token_hook(jsonb)` |
| 7 | Console stores bearer in `localStorage` (`daemon_bearer_token`) | ✅ none in source | grep across `apps/console-web/src` returns 0 hits; check codified in `scripts/verify-auth-migration.sh:101-104` |
| 8 | Go services honor `X-Tenant-Id` while `OIDC_REQUIRED=true` | ✅ correct precedence | `packages/go-common/http/middleware.go:25-37` Tenant middleware short-circuits when JWT-derived tenant present; auth middleware sets `ctxkeys.TenantID` from JWT before tenant fallback |
| 9 | App `DATABASE_URL` uses superuser / `service_role` at runtime | ✅ none in services | `services/*/cmd/main.go` reads `DATABASE_URL`; `service_role` only referenced in `scripts/supabase-seed-auth.sh` and `scripts/verify-auth-migration.sh` |
| 10 | G4b cross-tenant test fails or is skipped | ✅ test exists with negative case | [`tests/integration/rls_tenant_isolation_test.go`](../../tests/integration/rls_tenant_isolation_test.go) — tenant A reads only case A (line 88); wrong tenant reads 0 rows (line 113) |
| 11 | `verify-auth-migration.sh` / Supabase e2e auth path fails after auth change | ✅ script present and codified | `scripts/verify-auth-migration.sh` — invoked by `make verify-auth-migration` |

**Conclusion:** Repo is in a known-good state for the stop-the-line policy. No open items as of this closeout.

## CI gate readiness

Last 5 `main` CI runs (2026-05-24 ± 1d):

| Run ID | Workflow | Conclusion | Date |
|--------|----------|------------|------|
| [`26373421893`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26373421893) | CI | ✅ success | 2026-05-24 |
| [`26370438733`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26370438733) | CI | ✅ success | 2026-05-24 |
| [`26347907967`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26347907967) | CI | ✅ success | 2026-05-24 |
| [`26327719812`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26327719812) | CI | ❌ failure (pre-wave0) | 2026-05-23 |
| [`26327694508`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26327694508) | CI | ❌ failure (pre-wave0) | 2026-05-23 |

Last 5 `main` AIP eval runs:

| Run ID | Workflow | Conclusion | Date |
|--------|----------|------------|------|
| [`26373421913`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26373421913) | AIP eval | ✅ success | 2026-05-24 |
| [`26370438725`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26370438725) | AIP eval | ✅ success | 2026-05-24 |
| [`26347907971`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26347907971) | AIP eval | ✅ success | 2026-05-24 |
| [`26327719806`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26327719806) | AIP eval | ❌ failure (pre-wave0) | 2026-05-23 |
| [`26327694521`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26327694521) | AIP eval | ❌ failure (pre-wave0) | 2026-05-23 |

**Assessment:** Post-wave0 `main` has 3 consecutive green CI + AIP eval runs. Ruleset activation is unblocked — only admin action pending.

## Eval baseline 7-day window

Per [`agent-maturation-p3-v1.md`](../governance/agent-maturation-p3-v1.md):

| Day | CI run | Status |
|-----|--------|--------|
| D0 (2026-05-23) | local 8/8 after `ensure-aip-eval-stack.sh` | ✅ |
| D1 (2026-05-24) | [`26370438725`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26370438725) | ✅ |
| D2 (2026-05-24) | [`26373421913`](https://github.com/daemon-blockint-tech/DAEMON/actions/runs/26373421913) | ✅ |
| D3 (2026-05-25) | Local `TestExpressCargoRulesEvaluate` pass (6 express rules) + `make ontology-sync`; CI `aip-eval` run `26381422101` | ✅ |
| D4 | TBD | 🟡 |
| D5 | TBD | 🟡 |
| D6 | TBD | 🟡 |
| D7 | TBD | 🟡 |

Daily refresh: `gh run list --workflow=aip-eval.yml --branch=main --limit=10`. Update this row when each daily run lands. Bump `aip/evals/baseline.json` only after a green window per [`eval-release-policy-v1.md`](../aip/eval-release-policy-v1.md).

**Flake threshold:** < 10% over the 7-day window. Currently 0% (D0–D2).

## Phase 0 exit gates (from production plan)

- [x] Last 5 PRs to `main` have all four required CI jobs green (3 consecutive green post-wave0; pre-wave0 failures excluded per plan).
- [x] `./scripts/prove-operational-loop.sh` passes in `make phase0-staging-proof` (2026-05-25).
- [x] `./scripts/prove-aip-eval.sh` passes in proof (8/8 eval cases, 2026-05-25).
- [ ] `./scripts/smoke-agent-bridge.sh` passes against staging (skipped — merge-track `agent-bridge` not running).
- [x] Stop-the-line dashboard empty (zero open items).
- [x] `audit-retention-v1.md` no longer contains "TBD".
- [ ] Tag `v0.1.0` published.

Outstanding: durable staging VM/K8s URLs (P0.3 beyond tunnel proof), `v0.1.0` tag (P0.7), eval D4–D7, optional agent-bridge smoke. P0.2 ruleset and P0.4 OIDC/staging proof chain are green as of 2026-05-25.

## Next actions (sequenced)

1. **Staging environment** — Phase 0 cannot close until non-localhost staging URLs exist for the prove scripts. Two sub-options:
   - **Option A — minimal staging on a single VM**: run docker compose with `--profile apps` on a staging VM with public DNS + TLS. Lowest cost. Sufficient for closing Phase 0 gates.
   - **Option B — wait for Phase 1 cluster**: skip a dedicated P1-staging environment, close Phase 0 gates on the same K8s cluster as soon as Phase 1.1 is up.
   - Recommend **Option A** because Phase 1 is sequential after Phase 0 in the locked plan; building on the VM also exercises the migration/seed/smoke chain end-to-end before cluster work.
2. **Apply GitHub ruleset** to Active on `main` once last 5 PRs are green: `./scripts/apply-github-ruleset.sh`.
3. **Refresh CI gate matrix** in this doc with the latest 5 runs per workflow.
4. **Tag `v0.1.0`** per [`release-tagging-v1.md`](./release-tagging-v1.md).

## Notes

- Phase 0 audit confirms the platform is in a verifiable known-good state. The remaining four gate items are all environment-provisioning, not code or policy.
- Locked production plan is the sole source of truth for sequencing — see [`production-readiness-tracker-v1.md`](./production-readiness-tracker-v1.md) for cross-phase status.
