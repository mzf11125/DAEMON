"""JSON schema validation for artifacts."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import jsonschema

SCHEMA_DIR = Path(__file__).resolve().parent.parent / "schemas"


def load_schema(name: str) -> dict[str, Any]:
    path = SCHEMA_DIR / name
    return json.loads(path.read_text(encoding="utf-8"))


def validate_artifact(data: dict[str, Any], schema_name: str) -> None:
    schema = load_schema(schema_name)
    jsonschema.validate(instance=data, schema=schema)
