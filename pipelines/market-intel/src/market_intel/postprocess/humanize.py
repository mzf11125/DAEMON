"""Rule-based humanizer pass for sales-facing markdown."""

from __future__ import annotations

import re

FILLER = [
    r"\bdelve\b",
    r"\blandscape\b",
    r"\bcrucial\b",
    r"\bleverage\b",
    r"\brobust\b",
    r"\bcomprehensive\b",
    r"\butilize\b",
    r"\bin today's\b",
    r"\bit's worth noting\b",
    r"\bin conclusion\b",
]

REPLACEMENTS = {
    "delve": "look at",
    "leverage": "use",
    "utilize": "use",
    "crucial": "important",
    "robust": "solid",
    "comprehensive": "full",
    "landscape": "market",
}


def ai_tell_density(text: str) -> float:
    """Fraction of filler hits per 1000 chars (lower is better)."""
    if not text:
        return 0.0
    hits = 0
    lower = text.lower()
    for word in REPLACEMENTS:
        hits += lower.count(word)
    return hits / max(1, len(text) / 1000)


def humanize_markdown(text: str, *, max_density: float = 8.0) -> str:
    out = text
    for pat in FILLER:
        out = re.sub(pat, "", out, flags=re.I)
    for src, dst in REPLACEMENTS.items():
        out = re.sub(rf"\b{src}\b", dst, out, flags=re.I)
    out = re.sub(r"\n{3,}", "\n\n", out)
    out = re.sub(r"  +", " ", out)
    if ai_tell_density(out) > max_density:
        # second pass: shorten long sentences
        out = re.sub(r"—", ", ", out)
    return out.strip() + "\n"
