# RB-RULES-01 — Evaluate returns no signals

1. Confirm `daemon.dataset_observations` has rows and `tenant_id` matches request tenant.
2. `POST /v1/evaluate` with correct `X-Tenant-Id` or JWT tenant.
3. Inspect `rule_runs` per `rule_id` (not global count).
4. Run `tests/integration/rules_test.go`.
5. Express vertical: `go test -tags=integration ./tests/integration/ -run TestExpressCargoRulesEvaluate` (requires `make ontology-sync` and express observations in seed).
