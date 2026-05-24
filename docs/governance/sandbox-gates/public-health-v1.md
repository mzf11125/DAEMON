# Sandbox gate — public-health v1

| Check | Command / artifact | Expected |
|-------|-------------------|----------|
| Pack manifest | `ontology/v2/examples/packs/public-health/manifest.json` | valid JSON |
| Synthetic connector | `connectors/synthetic/public-health/manifest.json` | present |
| Seed objects | `make seed-sandbox` then query `ontology_objects` where properties->>'vertical' = 'public-health' | ≥1 Site |
| Integration | `go test -tags=integration ./tests/integration/ -run TestSandboxSector_public-health` | PASS |
| Traceability | `docs/traceability/matrix-v1.md` row for public-health | linked |

Stop-the-line: seed drift without updating this gate packet and integration test.
