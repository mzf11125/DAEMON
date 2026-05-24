# Sandbox gate — intelligence-ops v1

| Check | Command / artifact | Expected |
|-------|-------------------|----------|
| Pack manifest | `ontology/v2/examples/packs/intelligence-ops/manifest.json` | valid JSON |
| Synthetic connector | `connectors/synthetic/intelligence-ops/manifest.json` | present |
| Seed objects | `make seed-sandbox` then query `ontology_objects` where properties->>'vertical' = 'intelligence-ops' | ≥1 Site |
| Integration | `go test -tags=integration ./tests/integration/ -run TestSandboxSector_intelligence-ops` | PASS |
| Traceability | `docs/traceability/matrix-v1.md` row for intelligence-ops | linked |

Stop-the-line: seed drift without updating this gate packet and integration test.
