#!/usr/bin/env python3
"""Deterministic express-cargo document intake extraction from eval fixtures."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURE_DIR = REPO_ROOT / "aip" / "evals" / "fixtures" / "intake"


def load_fixture(fixture_id: str) -> dict:
    path = FIXTURE_DIR / f"{fixture_id}.json"
    if not path.is_file():
        raise FileNotFoundError(f"fixture not found: {path}")
    return json.loads(path.read_text())


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract express-cargo intake fields")
    parser.add_argument("--fixture", required=True, help="Fixture id (e.g. bast-sim-001)")
    args = parser.parse_args()
    try:
        payload = load_fixture(args.fixture)
    except FileNotFoundError as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        return 1
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
