# Sandbox gate — finance-risk v1

| Check | Command / artifact | Expected |
|-------|-------------------|----------|
| Pack manifest | `ontology/v2/examples/packs/finance-risk/manifest.json` | valid JSON |
| Synthetic connector | `connectors/synthetic/finance-risk/manifest.json` | present |
| Seed objects | `make seed-sandbox` then query `ontology_objects` where properties->>'vertical' = 'finance-risk' | ≥1 Site |
| Integration | `go test -tags=integration ./tests/integration/ -run TestSandboxSector_finance-risk` | PASS |
| Traceability | `docs/traceability/matrix-v1.md` row for finance-risk | linked |

Stop-the-line: seed drift without updating this gate packet and integration test.
