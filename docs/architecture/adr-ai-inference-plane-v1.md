# ADR: AI inference plane topology (Phase 1)

## Status

**Proposed — DRAFT** (Phase 1, parallel with P1.1–P1.2).

## Context

AIP workloads (`agent-bridge`, future `agent-service`, eval harness) must be isolated from the transactional platform plane while sharing OIDC, audit, and observability standards.

## Decision

| Component | Namespace | Exposure | Notes |
|-----------|-----------|----------|-------|
| `agent-bridge` | `daemon-aip` | ClusterIP only | Console → bridge; no public ingress |
| `agent-service` (future) | `daemon-aip` | ClusterIP | Tool execution + MCP gateway |
| Platform APIs | `daemon-platform` | Ingress / gateway | Existing charts |
| LLM egress | `daemon-aip` | Egress allowlist | OpenRouter / gateway hosts only |

**Network policy (target):** `daemon-aip` may call `daemon-platform` service DNS; platform pods may not call LLM egress without policy exception.

## Observability

- LangSmith project per environment (`staging`, `prod`) — see [langsmith-observability-v1](../aip/langsmith-observability-v1.md).
- OTel traces from bridge/service with `tenant_id` attribute when present.
- Audit: tool invocations logged to platform audit ingest (same `event_class` taxonomy as API).

## Consequences

- Helm chart `agent-bridge` deploys to `daemon-aip` via GitOps (sync-wave after platform-api).
- Secrets: `OPENROUTER_API_KEY`, LangSmith keys via External Secrets — never in ConfigMap.

## Alternatives considered

- Single namespace — rejected (blast radius, compliance scoping).
- Vercel-only agents — rejected for enterprise data-boundary requirements.
