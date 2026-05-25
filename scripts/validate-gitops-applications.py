#!/usr/bin/env python3
"""Validate ArgoCD Application / AppProject YAMLs under infra/gitops/.

Exit non-zero on first violation. Used by .github/workflows/iac-plan.yml.
"""
from __future__ import annotations

import pathlib
import sys

try:
    import yaml
except ImportError:  # pragma: no cover
    print("PyYAML required; pip install pyyaml", file=sys.stderr)
    raise

REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]
GITOPS_ROOT = REPO_ROOT / "infra" / "gitops"


def fail(message: str) -> None:
    print(f"validate-gitops: {message}", file=sys.stderr)
    sys.exit(1)


def validate_doc(path: pathlib.Path, doc: dict) -> None:
    if not isinstance(doc, dict):
        return
    kind = doc.get("kind")
    if kind not in {"Application", "AppProject"}:
        return
    if doc.get("apiVersion") != "argoproj.io/v1alpha1":
        fail(f"{path}: apiVersion must be argoproj.io/v1alpha1")
    name = doc.get("metadata", {}).get("name")
    if not name:
        fail(f"{path}: metadata.name required")
    if kind == "Application":
        spec = doc.get("spec") or {}
        if not spec.get("destination"):
            fail(f"{path}: Application missing spec.destination")
        if not (spec.get("source") or spec.get("sources")):
            fail(f"{path}: Application missing spec.source(s)")


def main() -> int:
    if not GITOPS_ROOT.exists():
        print("validate-gitops: no infra/gitops/ — skipping")
        return 0

    files = sorted(GITOPS_ROOT.rglob("*.yaml"))
    if not files:
        print("validate-gitops: no YAML files under infra/gitops/")
        return 0

    for path in files:
        try:
            docs = list(yaml.safe_load_all(path.read_text()))
        except yaml.YAMLError as err:
            fail(f"{path}: invalid YAML: {err}")
        for doc in docs:
            validate_doc(path, doc)

    print(f"validate-gitops: ok ({len(files)} files)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
