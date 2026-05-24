# Sandbox gate — banking-core v1

| Check | Command / artifact | Expected |
|-------|-------------------|----------|
| Pack manifest | `ontology/v2/examples/packs/banking-core/manifest.json` | valid JSON |
| Synthetic connector | `connectors/synthetic/banking-core/manifest.json` | present |
| Seed objects | `make seed-sandbox` then query `ontology_objects` where properties->>'vertical' = 'banking-core' | ≥1 Site |
| Integration | `go test -tags=integration ./tests/integration/ -run TestSandboxSector_banking-core` | PASS |
| Traceability | `docs/traceability/matrix-v1.md` row for banking-core | linked |

Stop-the-line: seed drift without updating this gate packet and integration test.
