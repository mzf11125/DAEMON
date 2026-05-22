# Platform lifecycle v1

| Phase | Activities |
|-------|------------|
| Develop | `make demo`, `platform-check`, ontology validate |
| Verify | `make test`, `test-integration`, optional `aip-eval` |
| Release | PR checklist prompt/eval; no stub handlers |
| Operate | `data-health-check`, runbooks RB-* |
| Retire | Document ontology version deprecation in CHANGELOG |

Stop-the-line: see `docs/operations/stop-the-line-policy-v1.md`.
