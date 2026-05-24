"""OpenAI SDK client — direct OpenAI or OpenRouter (OpenAI-compatible)."""

from __future__ import annotations

import os

from openai import OpenAI

from market_intel.config import Settings, get_settings


def _openrouter_headers() -> dict[str, str]:
    return {
        "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", "https://daemon-system.local"),
        "X-Title": os.getenv("OPENROUTER_APP_NAME", "Daemon Market Intel"),
    }


def openai_compatible_client(settings: Settings | None = None) -> OpenAI:
    settings = settings or get_settings()
    if settings.openai_api_key:
        return OpenAI(api_key=settings.openai_api_key)
    if settings.openrouter_api_key:
        return OpenAI(
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
            default_headers=_openrouter_headers(),
        )
    raise RuntimeError("OPENAI_API_KEY or OPENROUTER_API_KEY required for embeddings / OpenAI API paths")


def embedding_model_id(settings: Settings | None = None) -> str:
    settings = settings or get_settings()
    model = settings.embedding_model
    if settings.openai_api_key or "/" in model:
        return model
    return f"openai/{model}"


def require_llm_api_key(settings: Settings | None = None) -> None:
    settings = settings or get_settings()
    if settings.openai_api_key or settings.openrouter_api_key:
        return
    raise RuntimeError("OPENAI_API_KEY or OPENROUTER_API_KEY required for market-intel LLM paths")
