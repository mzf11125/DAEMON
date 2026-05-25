# ADR: MCP tool governance (Phase 1)

## Status

**Proposed — DRAFT**

## Context

Agents expose MCP tools (daemon-intel, exa, etc.). Production requires versioned manifests, environment separation, and read-only defaults for investigative tools.

## Decision

| Control | Staging | Production |
|---------|---------|------------|
| Tool manifest | `aip/mcp/manifest.staging.yaml` | `aip/mcp/manifest.prod.yaml` |
| Write tools | Disabled unless feature flag | Disabled by default |
| New tool version | PR + `aip-eval` + security review | Same + change advisory |
| Semver | Required on manifest `version` field | Breaking changes → major bump |

**Allowlist:** Only tools registered in manifest may be invoked; unknown tool name → `403` + audit.

**Secrets:** MCP API keys only via External Secrets; never committed.

## CI gates

- `aip-eval` includes MCP schema validation.
- Optional: `skill-security-auditor` on manifest changes (manual workflow_dispatch).

## Consequences

- Staging may enable experimental tools under `experimental: true` flag.
- Prod manifest changes require Platform + Security sign-off in PR template.
