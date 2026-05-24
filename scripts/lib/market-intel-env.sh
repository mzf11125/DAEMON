#!/usr/bin/env bash
# Source from prove-market-intel*.sh — loads repo .env, sets MI_PYTHON, bootstraps venv.
set -euo pipefail

ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
_MI_ROOT="$ROOT"
MI_DIR="$ROOT/pipelines/market-intel"

load_repo_dotenv() {
  local env_file="$_MI_ROOT/.env"
  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$env_file"
    set +a
  fi
}

load_repo_dotenv
ROOT="$_MI_ROOT"

apply_market_intel_migration() {
  local root="$_MI_ROOT"
  local migrate_url="${SEED_DATABASE_URL:-$DATABASE_URL}"
  if [[ -z "${migrate_url:-}" ]]; then
    echo "market-intel: DATABASE_URL or SEED_DATABASE_URL required for migration" >&2
    return 1
  fi
  if command -v psql >/dev/null 2>&1; then
    psql "$migrate_url" -v ON_ERROR_STOP=1 -f "$root/infra/migrations/postgres/007_market_intel_pgvector.sql"
  else
    echo "market-intel: psql required to apply 007_market_intel_pgvector.sql" >&2
    return 1
  fi
}

pick_python() {
  for c in python3.12 python3.11 python3.10 python3; do
    if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)'; then
      echo "$c"
      return 0
    fi
  done
  echo "market-intel: Python 3.10+ required" >&2
  return 1
}

MI_BOOT="${MI_BOOT:-$(pick_python)}"
VENV="$MI_DIR/.venv"
if [[ ! -x "$VENV/bin/python" ]]; then
  "$MI_BOOT" -m venv "$VENV"
fi
"$VENV/bin/pip" install -q -e "$MI_DIR"
MI_PYTHON="$VENV/bin/python"
export PYTHONPATH="$MI_DIR/src:${PYTHONPATH:-}"
