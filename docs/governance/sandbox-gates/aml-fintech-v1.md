# Sandbox gate — aml-fintech v1

| Check | Command / artifact | Expected |
|-------|-------------------|----------|
| Pack manifest | `ontology/v2/examples/packs/aml-fintech/manifest.json` | valid JSON |
| Synthetic connector | `connectors/synthetic/aml-fintech/manifest.json` | present |
| Seed objects | `make seed-sandbox` then query `ontology_objects` where properties->>'vertical' = 'aml-fintech' | ≥1 Site |
| Integration | `go test -tags=integration ./tests/integration/ -run TestSandboxSector_aml-fintech` | PASS |
| Traceability | `docs/traceability/matrix-v1.md` row for aml-fintech | linked |

Stop-the-line: seed drift without updating this gate packet and integration test.
