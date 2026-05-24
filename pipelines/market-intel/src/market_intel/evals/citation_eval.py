"""Citation golden-set validation (structure + optional live run)."""

from __future__ import annotations

import json
import re
from pathlib import Path

CITATION_RE = re.compile(r"\[\d+\]|\[INTERNAL\s+\d+\]|\[WEB\s+\d+\]")


def load_golden(path: Path | None = None) -> dict:
    root = Path(__file__).resolve().parents[5]
    path = path or root / "aip" / "evals" / "market-intel" / "citation-golden.json"
    return json.loads(path.read_text(encoding="utf-8"))


def citation_coverage(text: str) -> float:
    if not text.strip():
        return 0.0
    bullets = [ln for ln in text.splitlines() if ln.strip().startswith(("-", "*", "•"))]
    if not bullets:
        return 1.0 if CITATION_RE.search(text) else 0.0
    cited = sum(1 for b in bullets if CITATION_RE.search(b))
    return cited / len(bullets)


def validate_golden_file(path: Path | None = None) -> tuple[bool, list[str]]:
    data = load_golden(path)
    errors: list[str] = []
    cases = data.get("cases") or []
    if len(cases) < 5:
        errors.append("expected >=5 golden cases")
    for case in cases:
        for field in ("id", "question", "rubric"):
            if not case.get(field):
                errors.append(f"case missing {field}: {case.get('id')}")
    return not errors, errors


def main() -> int:
    ok, errors = validate_golden_file()
    if not ok:
        for e in errors:
            print(f"citation-golden: {e}")
        return 1
    print("citation-golden: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
