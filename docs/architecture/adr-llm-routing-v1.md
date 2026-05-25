# ADR: LLM routing and data handling (Phase 1)

## Status

**Proposed — DRAFT**

## Context

Production agents use OpenRouter (via `aip/llm/`) with model fallbacks. Enterprise customers require documented data handling, no training on customer content, and cost guardrails.

## Decision

1. **Primary path:** OpenRouter with allowlisted model IDs per environment (`AIP_MODEL_ALLOWLIST` in External Secrets / env).
2. **Fallback:** Secondary model on timeout or 5xx; max one fallback hop per request.
3. **Data handling:** Customer prompts and tool outputs are **not** used for vendor model training; subprocessors listed in compliance matrices (Phase 3).
4. **Retention:** LangSmith traces retained per environment policy (90d staging, 365d prod default — tune in compliance).
5. **Cost:** Per-tenant session caps enforced in bridge (configurable); hard stop returns `503` with audit event `agent.budget_exceeded`.

## Non-goals (this ADR)

- On-prem LLM hosting — future ADR if required by customer contract.
- Fine-tuning on customer data — prohibited without separate legal + security review.

## Verification

- `make aip-eval` on every PR touching `aip/` prompts or MCP manifests.
- Red-team tier-2+ before GA agent claims (Phase 4).
