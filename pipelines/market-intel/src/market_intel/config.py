"""Environment and runtime configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


def repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


@dataclass
class Settings:
    tavily_api_key: str = field(default_factory=lambda: os.getenv("TAVILY_API_KEY", ""))
    shodan_api_key: str = field(default_factory=lambda: os.getenv("SHODAN_API_KEY", ""))
    openai_api_key: str = field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))
    openrouter_api_key: str = field(default_factory=lambda: os.getenv("OPENROUTER_API_KEY", ""))
    openrouter_base_url: str = field(
        default_factory=lambda: os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    )
    database_url: str = field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL",
            os.getenv("SUPABASE_DB_URL", "postgresql://postgres:postgres@127.0.0.1:54332/postgres"),
        )
    )
    market_intel_model: str = field(
        default_factory=lambda: os.getenv("MARKET_INTEL_MODEL", "openrouter:openai/gpt-4o-mini")
    )
    embedding_model: str = field(
        default_factory=lambda: os.getenv("MARKET_INTEL_EMBEDDING_MODEL", "text-embedding-3-large")
    )
    embedding_dims: int = field(default_factory=lambda: int(os.getenv("MARKET_INTEL_EMBEDDING_DIMS", "3072")))
    artifacts_dir: Path = field(
        default_factory=lambda: Path(os.getenv("MARKET_INTEL_ARTIFACTS", repo_root() / "artifacts" / "market-intel"))
    )
    max_tavily_results: int = field(default_factory=lambda: int(os.getenv("MARKET_INTEL_MAX_SEARCH_RESULTS", "8")))
    search_token_limit: int = field(default_factory=lambda: int(os.getenv("MARKET_INTEL_SEARCH_TOKEN_LIMIT", "12000")))
    llm_context_char_limit: int = field(
        default_factory=lambda: int(os.getenv("MARKET_INTEL_LLM_CONTEXT_CHARS", "24000"))
    )
    tavily_timeout: float = field(default_factory=lambda: float(os.getenv("MARKET_INTEL_TAVILY_TIMEOUT", "60")))
    max_tavily_calls_per_run: int = field(
        default_factory=lambda: int(os.getenv("MARKET_INTEL_MAX_TAVILY_CALLS", "40"))
    )
    max_social_iterations: int = field(
        default_factory=lambda: int(os.getenv("MARKET_INTEL_MAX_SOCIAL_ITERATIONS", "3"))
    )
    max_competitor_profiles: int = field(
        default_factory=lambda: int(os.getenv("MARKET_INTEL_MAX_COMPETITORS", "5"))
    )
    enable_humanize: bool = field(
        default_factory=lambda: os.getenv("MARKET_INTEL_HUMANIZE", "true").lower() not in ("0", "false", "no")
    )
    humanize_max_density: float = field(
        default_factory=lambda: float(os.getenv("MARKET_INTEL_HUMANIZE_MAX_DENSITY", "12.0"))
    )
    enable_ai_visibility: bool = field(
        default_factory=lambda: os.getenv("MARKET_INTEL_AI_VISIBILITY", "true").lower() not in ("0", "false", "no")
    )
    tenant_id: str = field(default_factory=lambda: os.getenv("TENANT_ID", "tenant-demo"))

    def require_tavily(self) -> None:
        key = (self.tavily_api_key or "").strip()
        if not key or key.startswith("tvly-placeholder") or key == "your-api-key":
            raise RuntimeError("TAVILY_API_KEY is required (set a real key for prove/runtime paths)")


def get_settings() -> Settings:
    return Settings()
