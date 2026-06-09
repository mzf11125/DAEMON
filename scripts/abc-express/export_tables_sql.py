#!/usr/bin/env python3
"""Export ABC Express public tables via direct Postgres (bypasses RLS).

Requires SUPABASE_DB_URL (Session pooler or direct connection string).
Writes JSON arrays to scripts/abc-express/dumps/<table>.json
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import psycopg2
import psycopg2.extras

SCHEMA_PATH = Path(__file__).parent / "schema_columns.json"
DUMP_DIR = Path(__file__).parent / "dumps"
SKIP = {"v_unit_dashboard"}


def main() -> int:
    db_url = os.environ.get("SUPABASE_DB_URL", "").strip()
    if not db_url:
        print("Set SUPABASE_DB_URL", file=sys.stderr)
        return 1

    schema = json.loads(SCHEMA_PATH.read_text())
    tables = sorted({c["table_name"] for c in schema if c["table_name"] not in SKIP})
    DUMP_DIR.mkdir(parents=True, exist_ok=True)

    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            for table in tables:
                cur.execute(f'SELECT * FROM public."{table}"')
                rows = [dict(r) for r in cur.fetchall()]
                out = DUMP_DIR / f"{table}.json"
                out.write_text(json.dumps(rows, default=str, indent=2))
                print(f"{table}: {len(rows)}")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
