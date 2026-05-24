# Document intake pipeline (express-cargo A1)

Synthetic document extraction for the logistics-express-cargo sandbox. Production paths may call vision APIs; CI uses deterministic fixtures under `aip/evals/fixtures/intake/`.

## Usage

```bash
python3 pipelines/document-intake/extract.py --fixture bast-sim-001
```

Output is JSON matching the intake schema consumed by MCP tool `extract_express_cargo_intake`.
