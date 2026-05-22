# Eval release policy v1

## Semver surfaces

| Artifact | Versioning | Breaking examples |
|----------|------------|-------------------|
| System prompt | `aip/prompts/{agent}/v{major}/` | Remove guardrails, change tool order |
| MCP tools | package + `MCP_TOOL_SCHEMA_VERSION` env | Rename tool, new required field |
| Eval cases | `caseId` + `version` field | Change assertions without version bump |

## Pre-merge gate

If a PR touches `aip/prompts/**`, `aip/mcp-ontology/**`, `packages/aip-agent/**`, or `aip/evals/cases/**`:

1. Run `make aip-eval` (or CI `aip-eval` job).
2. Record baseline vs candidate in the PR description.
3. Update `aip/evals/CHANGELOG.md`.
4. Do not merge if golden `triage-list-signals` fails without a waiver.

## Waiver policy

Use `docs/aip/eval-waiver-template.md`. Waivers expire next sprint or on date. Log in `CHANGELOG.md` § Waivers.

## Rollback

- Revert prompt folder or pin `PROMPT_VERSION` env.
- Revert MCP package; re-run eval.
