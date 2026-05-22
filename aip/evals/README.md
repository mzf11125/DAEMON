# AIP evals (v1)

Golden cases live in `cases/`. Rubrics in `rubrics/`. Policy: `docs/aip/eval-release-policy-v1.md`.

## Run locally

```bash
make aip-build
# ontology-service on :8081
make aip-eval
```

Environment:

- `ONTOLOGY_SERVICE_URL` (default `http://localhost:8081`)
- `TENANT_ID` (default `tenant-demo`)

## CI

Optional workflow `.github/workflows/aip-eval.yml` (continue-on-error until stack available in CI).

## Waivers

Use `docs/aip/eval-waiver-template.md` and log in `CHANGELOG.md`.

## Baseline

After first green run, update `baseline.json` with timestamp, model, and pass rate.
