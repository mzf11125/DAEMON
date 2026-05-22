# Supply chain risk audit (v1)

Date: 2026-05-22. Scope: DAEMON monorepo direct dependencies (Go modules, pnpm workspace). Not a formal third-party attestation.

## Executive summary

Demo stack uses well-known OSS (Go chi, ClickHouse driver, LangChain, MCP SDK). Highest practical risks: **transitive npm/Go CVEs**, **unpinned provider APIs** (OpenRouter), and **container base images** in compose. No critical blocker for local demo; enable Dependabot and `go mod`/`pnpm audit` in CI before production.

## High-risk table

| Dependency class | Risk | Mitigation v1 |
|------------------|------|----------------|
| JWT / crypto (`golang-jwt`) | Auth bypass CVEs | Pin versions; `go test` auth package |
| ClickHouse client | Query injection if SQL escapes | SELECT-only validator in rules |
| MCP + LangChain npm | Supply chain / prompt injection | Lockfile; skill-security-audit on skills |
| Keycloak image | Container CVEs | Pin image digest in compose (phase 2) |
| OpenRouter API | Data egress | No PII in prompts; env-only keys |

## Recommendations

1. Add CI step: `pnpm audit --audit-level=high` (continue-on-error until clean).
2. Add CI step: `govulncheck ./...` on Go modules.
3. Document allowed registries in `docs/security/supply-chain-v1.md`.
4. Re-run this audit quarterly or before external demo.
