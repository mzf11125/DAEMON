# Sandbox gate — traffic-engineering v1

| Check | Command / artifact | Expected |
|-------|-------------------|----------|
| Pack manifest | `ontology/v2/examples/packs/traffic-engineering/manifest.json` | valid JSON |
| Synthetic connector | `connectors/synthetic/traffic-engineering/manifest.json` | present |
| Seed objects | `make seed-sandbox` then query `ontology_objects` where properties->>'vertical' = 'traffic-engineering' | ≥1 Site |
| Integration | `go test -tags=integration ./tests/integration/ -run TestSandboxSector_traffic-engineering` | PASS |
| Traceability | `docs/traceability/matrix-v1.md` row for traffic-engineering | linked |

Stop-the-line: seed drift without updating this gate packet and integration test.
