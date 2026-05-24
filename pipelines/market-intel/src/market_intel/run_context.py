"""Run identity, artifact paths, and run_manifest.json."""

from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from market_intel.config import Settings, get_settings
from market_intel.toolkit.tavily_metrics import get_metrics, reset_metrics


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


@dataclass
class RunManifest:
    run_id: str
    correlation_id: str
    workflow: str
    started_at: str
    workflow_run_id: str | None = None
    thread_id: str | None = None
    tenant_id: str = "tenant-demo"
    layers: list[str] = field(default_factory=list)
    tavily_calls: int = 0
    tavily_ops: list[dict[str, Any]] = field(default_factory=list)
    duration_ms: float | None = None
    model: str | None = None
    ai_visibility: bool = True
    humanize: bool = True
    status: str = "running"
    finished_at: str | None = None
    errors: list[str] = field(default_factory=list)
    budgets: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class RunContext:
    def __init__(
        self,
        workflow: str,
        *,
        settings: Settings | None = None,
        run_id: str | None = None,
        thread_id: str | None = None,
        correlation_id: str | None = None,
    ):
        self.settings = settings or get_settings()
        self.run_id = run_id or uuid.uuid4().hex[:12]
        self.correlation_id = correlation_id or self.run_id
        self.thread_id = thread_id
        self.workflow = workflow
        self.root = self.settings.artifacts_dir / self.run_id
        self.root.mkdir(parents=True, exist_ok=True)
        reset_metrics()
        self.manifest = RunManifest(
            run_id=self.run_id,
            correlation_id=self.correlation_id,
            workflow=workflow,
            started_at=utc_now_iso(),
            workflow_run_id=self.run_id,
            thread_id=thread_id,
            tenant_id=self.settings.tenant_id,
            ai_visibility=self.settings.enable_ai_visibility,
            humanize=self.settings.enable_humanize,
            model=self.settings.market_intel_model,
            budgets={
                "max_tavily_calls": self.settings.max_tavily_calls_per_run,
                "max_social_iterations": self.settings.max_social_iterations,
                "max_competitors": self.settings.max_competitor_profiles,
                "search_token_limit": self.settings.search_token_limit,
                "llm_context_char_limit": self.settings.llm_context_char_limit,
            },
        )

    def path(self, name: str) -> Path:
        return self.root / name

    def write_json(self, name: str, data: Any) -> Path:
        p = self.path(name)
        p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return p

    def write_text(self, name: str, text: str) -> Path:
        p = self.path(name)
        p.write_text(text, encoding="utf-8")
        return p

    def record_tavily_call(self, n: int = 1) -> None:
        self.manifest.tavily_calls += n

    def sync_tavily_metrics(self) -> None:
        metrics = get_metrics()
        self.manifest.tavily_calls = metrics.count
        self.manifest.tavily_ops = metrics.calls

    def finish(self, status: str = "completed", error: str | None = None) -> None:
        self.manifest.status = status
        self.manifest.finished_at = utc_now_iso()
        self.sync_tavily_metrics()
        try:
            start = datetime.fromisoformat(self.manifest.started_at.replace("Z", "+00:00"))
            end = datetime.fromisoformat(self.manifest.finished_at.replace("Z", "+00:00"))
            self.manifest.duration_ms = round((end - start).total_seconds() * 1000, 2)
        except ValueError:
            self.manifest.duration_ms = None
        if error:
            self.manifest.errors.append(error)
        self.write_json("run_manifest.json", self.manifest.to_dict())
