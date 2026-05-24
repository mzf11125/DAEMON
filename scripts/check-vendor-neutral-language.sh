#!/usr/bin/env bash
# Fail if vendor-specific names appear in main-repo public paths.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PATTERN='palantir|foundry|anduril|gotham|lattice-sdk|lattice sample'
PATHS=(
  docs
  README.md
  .cursor/agents
  services
  apps
  scripts
  Makefile
)

EXCLUDES=(
  'docs/governance/vendor-neutral-content-v1.md'
  'scripts/check-vendor-neutral-language.sh'
  'external/'
)

build_exclude_args() {
  local args=()
  for ex in "${EXCLUDES[@]}"; do
    args+=(--glob "!${ex}**")
  done
  printf '%s\n' "${args[@]}"
}

EXCLUDE_ARGS=()
while IFS= read -r line; do
  EXCLUDE_ARGS+=("$line")
done < <(build_exclude_args)

hits=0
for path in "${PATHS[@]}"; do
  [[ -e "$path" ]] || continue
  if rg -i -n "$PATTERN" "${EXCLUDE_ARGS[@]}" "$path" 2>/dev/null; then
    hits=1
  fi
done

if [[ "$hits" -ne 0 ]]; then
  echo "vendor-neutral check FAILED: remove or neutralize matches above" >&2
  exit 1
fi

echo "vendor-neutral check: ok"
