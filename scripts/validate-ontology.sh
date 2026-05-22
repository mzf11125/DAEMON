#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

ONTOLOGY_ROOT="${ONTOLOGY_ROOT:-ontology/v2-compiled}"
export ONTOLOGY_ROOT

python3 - <<'PY'
import json, os, sys
from pathlib import Path

root = Path(os.environ.get("ONTOLOGY_ROOT", "ontology/v2-compiled"))
if not root.is_dir():
    sys.exit(f"ontology root not found: {root} (run: make ontology-sync)")

manifest = json.loads((root / "manifest.json").read_text())
required = ["version", "domain", "objectTypes", "linkTypes", "actionTypes", "functions"]
for k in required:
    if k not in manifest:
        sys.exit(f"manifest missing {k}")

for ot in manifest["objectTypes"]:
    p = root / "object-types" / f"{ot}.json"
    if not p.exists():
        sys.exit(f"missing object type file: {p}")

for lt in manifest["linkTypes"]:
    p = root / "link-types" / f"{lt}.json"
    if not p.exists():
        sys.exit(f"missing link type file: {p}")

for at in manifest["actionTypes"]:
    p = root / "action-types" / f"{at}.json"
    if not p.exists():
        sys.exit(f"missing action type file: {p}")

for fn in manifest["functions"]:
    p = root / "functions" / f"{fn}.json"
    if not p.exists():
        sys.exit(f"missing function file: {p}")

rules = root / "rules"
if rules.exists():
    for rule_file in rules.glob("*.json"):
        data = json.loads(rule_file.read_text())
        sql = data.get("sql", "")
        if not sql:
            sys.exit(f"rule {rule_file.name}: sql is required")
        if "{threshold:Float64}" not in sql:
            sys.exit(f"rule {rule_file.name}: sql must contain {{threshold:Float64}}")
        upper = sql.upper()
        if not upper.strip().startswith("SELECT"):
            sys.exit(f"rule {rule_file.name}: only SELECT allowed")
        for kw in ("INSERT ", "UPDATE ", "DELETE ", "DROP ", ";", "--", "/*"):
            if kw in upper:
                sys.exit(f"rule {rule_file.name}: forbidden sql pattern {kw!r}")
PY

(cd packages/go-common/rules && go test -run TestOntologyRuleFiles -count=1) || exit 1

python3 - <<'PY'
import os, sys
from pathlib import Path

iface = Path("interfaces/ontology")
for name in ["operational-entity", "investigatable", "timestamped", "locateable"]:
    if not (iface / f"{name}.json").exists():
        sys.exit(f"missing interface: {name}")

print(f"validate-ontology: ok ({os.environ.get('ONTOLOGY_ROOT', 'ontology/v2-compiled')})")
PY
