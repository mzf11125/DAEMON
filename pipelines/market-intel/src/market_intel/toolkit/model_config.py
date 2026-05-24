"""LangChain model initialization (bring-your-own-model)."""

from __future__ import annotations

import os
from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_openai import ChatOpenAI

from market_intel.config import Settings, get_settings
from market_intel.openai_client import _openrouter_headers, require_llm_api_key


def init_chat_model(settings: Settings | None = None, **kwargs: Any) -> BaseChatModel:
    settings = settings or get_settings()
    require_llm_api_key(settings)
    spec = settings.market_intel_model
    if ":" in spec:
        provider, model = spec.split(":", 1)
    else:
        provider, model = "openai", spec

    if provider == "openai":
        api_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY required for MARKET_INTEL_MODEL openai:*")
        return ChatOpenAI(model=model, api_key=api_key, temperature=0.2, **kwargs)

    if provider == "openrouter":
        api_key = settings.openrouter_api_key or os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise RuntimeError("OPENROUTER_API_KEY required for MARKET_INTEL_MODEL openrouter:*")
        base_url = settings.openrouter_base_url or os.getenv(
            "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
        )
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=base_url,
            default_headers=_openrouter_headers(),
            temperature=0.2,
            **kwargs,
        )

    raise ValueError(f"Unsupported MARKET_INTEL_MODEL provider: {provider} (use openai: or openrouter:)")
