# Release tagging v1

## Preconditions (all green on `main`)

- CI: `validate`, `integration`, `aip-eval`, `policy`
- L3: `./scripts/prove-operational-loop.sh` documented in [operational-proof-l3-v1.md](../traceability/operational-proof-l3-v1.md)
- `./scripts/prove-aip-eval.sh`
- GitHub ruleset **Active** on `main`

## `v0.1.0` — P1 staging pilot (Phase 0 exit)

Tag **only** when every Phase 0 gate in [production-readiness-v1.md](./production-readiness-v1.md) is green (or explicitly waived with admin note).

| Gate | Required for `v0.1.0` |
|------|------------------------|
| Last 5 PRs to `main` | All four CI jobs green on each |
| Staging prove | `./scripts/prove-operational-loop.sh`, `prove-aip-eval.sh`, `smoke-agent-bridge.sh` against **non-localhost** URLs |
| Stop-the-line | Zero open items per [stop-the-line-policy-v1.md](./stop-the-line-policy-v1.md) |
| Audit retention | [audit-retention-v1.md](../governance/audit-retention-v1.md) draft published (no TBD) |
| Ruleset | **Active** on `main` ([github-rulesets-v1.md](../governance/github-rulesets-v1.md)) |
| OIDC staging rows | Hostname table filled in [oidc-rls-verification-v1.md](./oidc-rls-verification-v1.md) |
| P3 eval window | D0–D2 green; D3–D7 tracked (7-day minimum before agent marketing) |

**Not required for `v0.1.0`:** P2 `OIDC_REQUIRED=true` on production, K8s deploy, external audits, or 30-day P3 window (Phase 4).

## Tag format

`vYYYY.MM.DD` or semver `v0.x.y` for platform releases. Agent P3 tags only after [agent-maturation-p3-v1.md](../governance/agent-maturation-p3-v1.md) criteria.

## Steps

```bash
git checkout main && git pull
make ontology-sync && make ontology-validate
./scripts/check-no-stub-handlers.sh
git tag -a v0.1.0 -m "Platform P1 staging pilot"
git push origin v0.1.0
```

## Post-tag

- Deploy staging per [staging-deploy-v1.md](./staging-deploy-v1.md)
- Record eval baseline if AIP surface changed: `EVAL_RECORD_BASELINE=true make aip-eval`
- Post-incident template: [post-incident-template.md](./post-incident-template.md)
