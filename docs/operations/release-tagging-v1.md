# Release tagging v1

## Preconditions (all green on `main`)

- CI: `validate`, `integration`, `aip-eval`, `policy`
- L3: `./scripts/prove-operational-loop.sh` documented in [operational-proof-l3-v1.md](../traceability/operational-proof-l3-v1.md)
- `./scripts/prove-aip-eval.sh`
- GitHub ruleset **Active** on `main`

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
