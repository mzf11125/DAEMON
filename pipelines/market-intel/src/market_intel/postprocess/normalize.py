"""PII scrub and output normalization."""

from __future__ import annotations

import re
from typing import Any

EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
PHONE_RE = re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b")
SECRET_PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9]{20,}"),
    re.compile(r"tvly-[A-Za-z0-9]{20,}"),
    re.compile(r"Bearer\s+[A-Za-z0-9\-._~+/]+=*", re.I),
]


def scrub_pii(text: str) -> str:
    text = EMAIL_RE.sub("[email redacted]", text)
    text = PHONE_RE.sub("[phone redacted]", text)
    for pat in SECRET_PATTERNS:
        text = pat.sub("[secret redacted]", text)
    return text


def assert_no_secrets_in_artifact(text: str) -> None:
    for pat in SECRET_PATTERNS:
        if pat.search(text):
            raise RuntimeError("artifact contains secret-like pattern; aborting write")


def normalize_company_name(name: str) -> str:
    return " ".join(name.strip().split())


def slugify_thread_id(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "unknown"


def build_sources_index(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for i, r in enumerate(results, start=1):
        out.append(
            {
                "source_id": f"src-{i}",
                "title": r.get("title"),
                "url": r.get("url"),
                "score": r.get("score"),
            }
        )
    return out
