#!/usr/bin/env bash
# Require at least one LLM credential (OpenRouter preferred for DAEMON stack).
require_market_intel_llm() {
  if [[ -n "${OPENAI_API_KEY:-}" || -n "${OPENROUTER_API_KEY:-}" ]]; then
    return 0
  fi
  echo "${1:-market-intel}: OPENAI_API_KEY or OPENROUTER_API_KEY required for LLM" >&2
  exit 1
}
