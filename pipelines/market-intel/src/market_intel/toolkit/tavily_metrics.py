"""Per-run Tavily API call accounting (ops / run_manifest)."""

from __future__ import annotations

import contextvars
import time
from dataclasses import dataclass, field
from typing import Any, Callable, TypeVar

T = TypeVar("T")


@dataclass
class TavilyMetrics:
    calls: list[dict[str, Any]] = field(default_factory=list)

    @property
    def count(self) -> int:
        return len(self.calls)

    def record(self, op: str, duration_ms: float, *, extra: dict[str, Any] | None = None) -> None:
        row: dict[str, Any] = {"tavily_op": op, "duration_ms": round(duration_ms, 2)}
        if extra:
            row.update(extra)
        self.calls.append(row)

    def to_dict(self) -> dict[str, Any]:
        total_ms = sum(c.get("duration_ms", 0) for c in self.calls)
        return {"tavily_calls": self.count, "tavily_duration_ms": round(total_ms, 2), "ops": self.calls}


_metrics_ctx: contextvars.ContextVar[TavilyMetrics | None] = contextvars.ContextVar(
    "tavily_metrics", default=None
)


def reset_metrics() -> TavilyMetrics:
    metrics = TavilyMetrics()
    _metrics_ctx.set(metrics)
    return metrics


def get_metrics() -> TavilyMetrics:
    metrics = _metrics_ctx.get()
    if metrics is None:
        metrics = reset_metrics()
    return metrics


def timed_tavily(op: str, fn: Callable[[], T], *, extra: dict[str, Any] | None = None) -> T:
    start = time.perf_counter()
    try:
        return fn()
    finally:
        ms = (time.perf_counter() - start) * 1000
        get_metrics().record(op, ms, extra=extra)
