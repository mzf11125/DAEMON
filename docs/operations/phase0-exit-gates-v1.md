# Phase 0 exit gates (automation + operator)

Maps to master plan Phase 0 and [production-readiness-v1.md](./production-readiness-v1.md) P0.x.

## Repo-automated (agent)

| Gate | Command | Status |
|------|---------|--------|
| Wave 0 audit archival | `make test-audit-archival-integration` + `make audit-archival-dry-run` | ✅ 2026-05-25 |
| Express + propensity on branch | `go test ./tests/integration/... -run ExpressCargo` | ✅ in repo |
| CI validate loop | `pipelines/audit-archival`, `propensity-train` in `.github/workflows/ci.yml` | ✅ |
| 7d eval D0–D3 | [agent-maturation-p3-v1.md](../governance/agent-maturation-p3-v1.md) | 🟡 D4–D7 pending |
| Stop-the-line | [p1-staging-pilot-closeout-v1.md](./p1-staging-pilot-closeout-v1.md) | ✅ |

## Operator (human / infra)

| Gate | Action | Script / doc |
|------|--------|--------------|
| P0.2 Ruleset Active | `make phase0-ruleset-apply` (idempotent PUT) | [github-rulesets-v1.md](../governance/github-rulesets-v1.md) — ✅ Active 2026-05-25 (`main-production-gates` id 16781434) |
| P0.3 Staging URLs | VM compose or wait K8s; TLS + DNS — **provisional:** [`phase0-staging-tunnel-env.sh`](../../scripts/phase0-staging-tunnel-env.sh) (2026-05-25) | [staging-vm-compose-v1.md](./staging-vm-compose-v1.md) |
| P0.4 OIDC + RLS staging | ✅ `make phase0-staging-proof` green 2026-05-25 | [oidc-rls-verification-v1.md](./oidc-rls-verification-v1.md) |
| P0.7 Tag `v0.1.0` | After P0.2–P0.4 green | [release-tagging-v1.md](./release-tagging-v1.md) |

## Staging proof bundle

```bash
# Option A — production staging VM: cp .env.staging.example .env.staging and edit HTTPS URLs
# Option B — local proof (2026-05-25): ./scripts/phase0-staging-tunnel-env.sh  # writes .env.staging
set -a && source .env.staging && set +a
make phase0-staging-proof   # sets PHASE0_STRICT=1
```

## Phase 0 close criteria

- [x] Code on `main` (express rules, audit-archival, propensity rule, CI jobs).
- [x] Repo automation: `.env.staging.example`, `run-phase0-staging-proof.sh`, `PHASE0_STRICT`, operator runbook.
- [x] GitHub ruleset **Active** on `main` — `make phase0-ruleset-apply` (verified 2026-05-25; ruleset id 16781434).
- [x] Staging hostname table filled in OIDC doc (2026-05-25; tunnel URLs — see caveat in doc).
- [x] `./scripts/run-phase0-staging-proof.sh` green (`PHASE0_STRICT=1`, 2026-05-25).
- [ ] `v0.1.0` tag published — after operator gates above.
- [ ] Eval baseline D4–D7 green ([agent-maturation-p3-v1.md](../governance/agent-maturation-p3-v1.md)) — track `aip-eval` on `main`.

**Repo phase deliverable:** complete. **Production exit:** operator checklist above.
