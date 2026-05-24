"""Context packing with explicit char budgets (ai-platform gate)."""

from __future__ import annotations


def trim_to_budget(text: str, max_chars: int) -> tuple[str, bool]:
    if len(text) <= max_chars:
        return text, False
    return text[: max(0, max_chars - 3)] + "...", True


def pack_sections(sections: list[tuple[str, str]], *, max_chars: int) -> str:
    """Join labeled sections; drop tail sections when over budget."""
    parts: list[str] = []
    used = 0
    for label, body in sections:
        block = f"## {label}\n{body.strip()}\n"
        if used + len(block) > max_chars and parts:
            break
        if len(block) > max_chars - used:
            block, _ = trim_to_budget(block, max_chars - used)
        parts.append(block)
        used += len(block)
        if used >= max_chars:
            break
    return "\n".join(parts).strip()
