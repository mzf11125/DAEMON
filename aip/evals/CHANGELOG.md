# Eval changelog

## 0.2.0

- Multi-case runner (`aip/evals/cases/*.json`), baseline compare/record, `EVAL_DETERMINISTIC` for CI.
- Cases: `ontology-manifest`, `investigate-case-readonly`, `triage-list-signals-agent` (`mode: agent`).
- Rubrics per case under `aip/evals/rubrics/`.
- MCP schema version `0.2.0`; forbidden mutating tools enforced in eval.

## 0.1.0

- Added `triage-list-signals` — expects `ontology_list_objects` with `Signal`.
