"""Query sanitization and injection guards."""

from __future__ import annotations

import re

BLOCKED_SUBSTRINGS = [
    "ignore previous",
    "ignore all prior",
    "system prompt",
    "reveal api key",
    "print env",
    "curl ",
    "wget ",
    "rm -rf",
]

INJECTION_RE = re.compile(r"(?i)(ignore\s+(all\s+)?(previous|prior)|system\s*:|<\s*script)")


def sanitize_user_query(query: str, *, max_len: int = 2000) -> str:
    q = query.strip()
    if len(q) > max_len:
        q = q[:max_len]
    lower = q.lower()
    for bad in BLOCKED_SUBSTRINGS:
        if bad in lower:
            raise ValueError(f"query blocked by sanitization policy: contains '{bad}'")
    if INJECTION_RE.search(q):
        raise ValueError("query blocked: possible prompt injection pattern")
    return q
