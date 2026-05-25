# P2 Customer GA checklist v1

All items required before semantic release tag and customer-facing environment.

> **Aligned with the locked [end-to-end production plan](../../.cursor/plans/daemon-production-end-to-end-50d4a9.md):** GA scope is **platform-only**; vertical packs (including `logistics-express-cargo`) remain opt-in via `ONTOLOGY_PACK=` and are promoted post-GA. **Compliance baseline:** SOC 2 Type II + GDPR + HIPAA + ISO 27001. **Agents:** P3 included in same release (mutating MCP review + listen-as-agent runtime are GA gates). **Sequencing:** sequential, quality-first.
>
> Pair with [`production-readiness-tracker-v1.md`](./production-readiness-tracker-v1.md) for cross-phase status and [`p1-staging-pilot-closeout-v1.md`](./p1-staging-pilot-closeout-v1.md) for current Phase 0 evidence.

## Platform (Track A) — required at GA

| # | Requirement | Proof |
|---|-------------|-------|
| A1 | `main` CI green: validate, integration, e2e-full, aip-eval, policy, supply-chain | GitHub ruleset + latest run URLs in [matrix-v1.md](../traceability/matrix-v1.md) |
| A2 | Proof ladder L0–L4 documented with commit SHA | [matrix-v1.md](../traceability/matrix-v1.md) |
| A3 | Staging bootstrap + smoke chain on K8s + managed services | [staging-deploy-v1.md](./staging-deploy-v1.md); `./scripts/prove-staging-smoke.sh` |
| A4 | `OIDC_REQUIRED=true` on all Go APIs in prod | [oidc-rls-verification-v1.md](./oidc-rls-verification-v1.md) |
| A5 | No prod `X-Tenant-Id` bypass | `rls_tenant_isolation_test.go`; tenant ID validation in `rules.RenderSQL` |
| A6 | Managed Postgres + ClickHouse + Neo4j Aura; pinned + cosign-signed image digests | Env matrix in [staging-deploy-v1.md](./staging-deploy-v1.md); SBOM published per release |
| A7 | Security: ai-surface-review + supply-chain gates + external pen test closed | CI jobs + Phase 5 pen test report |
| A8 | Release tag only when preconditions pass | [release-tagging-v1.md](./release-tagging-v1.md) |
| A9 | DR drill green within last 90d (RTO ≤ 4h / RPO ≤ 1h) | [DR drill log](./dr-drill-log.md) (Phase 2.1) |
| A10 | Audit retention archival job green for ≥ 30d | [`audit-retention-v1.md`](../governance/audit-retention-v1.md) + Phase 2.5 pipeline |
| A11 | Production SLO program live for ≥ 30d on prod traffic | [`slo-spec-v1.md`](./slo-spec-v1.md) (Phase 2.2 update) |
| A12 | 24/7 on-call rotation live; ≥ 1 P1 drill response inside SLA | [`p1-staging-pilot-closeout-v1.md`](./p1-staging-pilot-closeout-v1.md) → Phase 6 |
| A13 | Status page public; support tier handling cases inside SLA | Phase 6.1 |
| A14 | Customer pilot graduated to production tenant | Phase 6.3 |

## Compliance (Track C) — required at GA

| # | Requirement | Proof |
|---|-------------|-------|
| C1 | SOC 2 Type II report **issued** with clean opinion | Phase 7.1 |
| C2 | ISO 27001 certificate **issued** | Phase 7.2 |
| C3 | HIPAA technical safeguards self-attestation signed; BAA template legally reviewed | Phase 3.3 + 7 |
| C4 | GDPR DPA + DPIA + ROPA + SCCs published; EU region option live | Phase 3.4 + 7 |
| C5 | All sub-processor DPAs / BAAs signed (Supabase, ClickHouse Cloud, Neo4j Aura, LLM provider, LangSmith, Vault) | Phase 3.5 |
| C6 | ABAC / markings model implemented on ontology objects | Phase 3.5 |

## AI surface (Track D) — required at GA per locked decision (P3 in GA)

| # | Requirement | Proof |
|---|-------------|-------|
| D1 | Eval baseline 30-day clean window with flake < 5% | [`agent-maturation-p3-v1.md`](../governance/agent-maturation-p3-v1.md) |
| D2 | `aip/agent-service` deployable on K8s with NetworkPolicy egress restrictions | Phase 4.3 |
| D3 | Plugin remap runtime proven for all configured slots | `./scripts/prove-plugin-remap.sh` integrated into staging smoke |
| D4 | Mutating MCP tools reviewed + risk-tier sign-off | [`risk-tier-v1.md`](../aip/risk-tier-v1.md) + ARB checklist |
| D5 | Listen-as-agent runtime live with HITL gate before execute | Phase 4.3 |
| D6 | Agent adversarial test suite green | `docs/security/agent-redteam-v1.md` (Phase 4.3) |
| D7 | Model card per production agent role | `docs/aip/model-card-*.md` |
| D8 | LangSmith mandatory in prod; trace redaction tested | [`langsmith-observability-v1.md`](../aip/langsmith-observability-v1.md) |

## Explicitly not at first GA (post-GA roadmap)

- Vertical pack defaults — packs (incl. `logistics-express-cargo`) remain opt-in. First pack promotion is Phase 8.
- Multi-region — single GA region; EU pin lives in Phase 3 infrastructure but is enabled post-GA on customer demand.
- Self-service tenant signup UX — enterprise sales-led; control-plane provisioning APIs only.
- BYO-cloud / on-prem customer deployments — possible architecturally, not productized at GA.
- Federal authorizations (FedRAMP, IL4/5).
- Streaming ingestion (Kafka / Flink) per [`mmdp-roadmap.md`](../data-integration/mmdp-roadmap.md).

## Sign-off command block

```bash
# Phase 0 readiness (all verified clean — see p1-staging-pilot-closeout-v1.md)
./scripts/check-no-stub-handlers.sh
./scripts/check-maturation-policy.sh
./scripts/check-vendor-neutral-language.sh
make pre-push-gate   # before push; see pr-split-checklist-v1.md

# Functional verification (require staging stack up)
make ontology-sync && make test
make audit-archival-dry-run   # Phase 2.5; CI includes pipelines/audit-archival
./scripts/prove-operational-loop.sh
make aip-build && ./scripts/prove-aip-eval.sh
./scripts/smoke-agent-bridge.sh

# Staging URLs set (P1.1+):
./scripts/prove-staging-smoke.sh

# GA gate (Phase 7):
# - SOC 2 Type II report received
# - ISO 27001 certificate issued
# - HIPAA self-attestation signed
# - GDPR DPA/DPIA/ROPA published
# - All A1–A14, C1–C6, D1–D8 above marked done
git tag -a v1.0.0 -m "Platform GA"
```
