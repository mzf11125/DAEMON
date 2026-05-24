# Sandbox gate — web3-intel v1

| Check | Command / artifact | Expected |
|-------|-------------------|----------|
| Pack manifest | `ontology/v2/examples/packs/web3-intel/manifest.json` | valid JSON |
| Synthetic connector | `connectors/synthetic/web3-intel/manifest.json` | present |
| Seed objects | `make seed-sandbox` then query `ontology_objects` where properties->>'vertical' = 'web3-intel' | ≥1 Site |
| Integration | `go test -tags=integration ./tests/integration/ -run TestSandboxSector_web3-intel` | PASS |
| Traceability | `docs/traceability/matrix-v1.md` row for web3-intel | linked |

Stop-the-line: seed drift without updating this gate packet and integration test.
