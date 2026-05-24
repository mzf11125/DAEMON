#!/usr/bin/env bash
# G-EC-01: logistics-express-cargo catalog must document exactly 41 objects across four domains.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OBJECTS_YAML="$ROOT/ontology/v2/examples/packs/logistics-express-cargo/catalog/objects.yaml"
LINKS_YAML="$ROOT/ontology/v2/examples/packs/logistics-express-cargo/catalog/links.yaml"

python3 - <<'PY'
import sys
from pathlib import Path
import yaml

objects_path = Path("ontology/v2/examples/packs/logistics-express-cargo/catalog/objects.yaml")
links_path = Path("ontology/v2/examples/packs/logistics-express-cargo/catalog/links.yaml")
data = yaml.safe_load(objects_path.read_text())
objects = data.get("objects") or []
if len(objects) != 41:
    sys.exit(f"expected 41 objects, found {len(objects)}")

domains = {}
for o in objects:
    d = o.get("domain", "?")
    domains[d] = domains.get(d, 0) + 1
expected = {"core": 18, "commercial": 10, "network": 6, "financial": 7}
for d, n in expected.items():
    if domains.get(d, 0) != n:
        sys.exit(f"domain {d}: expected {n}, got {domains.get(d, 0)}")

links = yaml.safe_load(links_path.read_text())
junctions = links.get("junctions") or []
if len(junctions) != 5:
    sys.exit(f"expected 5 junction links, found {len(junctions)}")

print("express-cargo catalog check: ok (41 objects, 5 junctions)")
PY
