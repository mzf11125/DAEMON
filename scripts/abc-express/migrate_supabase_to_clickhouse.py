#!/usr/bin/env python3
"""Full refresh: ABC Express Supabase (public) -> local ClickHouse (abc_express).

Requires env:
  SUPABASE_URL=https://<ref>.supabase.co
  SUPABASE_ANON_KEY=<anon or service role key with read access>

Optional:
  CLICKHOUSE_HOST=127.0.0.1
  CLICKHOUSE_PORT=8124
  CLICKHOUSE_DATABASE=abc_express
  SUPABASE_DB_URL=postgresql://...   # bypasses RLS (preferred)
  SUPABASE_SERVICE_ROLE_KEY=...     # PostgREST bypasses RLS
  ABC_EXPRESS_DUMP_DIR=./dumps      # pre-exported JSON per table
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path
from typing import Any

import clickhouse_connect

try:
    import psycopg2
    import psycopg2.extras
except ImportError:  # pragma: no cover
    psycopg2 = None  # type: ignore

SCHEMA_PATH = Path(__file__).parent / "schema_columns.json"
DUMP_DIR = Path(__file__).parent / "dumps"
SKIP_TABLES = {"v_unit_dashboard"}  # view; not in PostgREST table list

PG_TO_CH = {
    "uuid": "UUID",
    "text": "String",
    "varchar": "String",
    "character varying": "String",
    "int4": "Int32",
    "int8": "Int64",
    "integer": "Int32",
    "bigint": "Int64",
    "bool": "UInt8",
    "boolean": "UInt8",
    "numeric": "Decimal(38, 10)",
    "float8": "Float64",
    "double precision": "Float64",
    "date": "Date",
    "timestamptz": "DateTime64(6, 'UTC')",
    "timestamp with time zone": "DateTime64(6, 'UTC')",
    "jsonb": "String",
    "json": "String",
    "kpi_type": "String",
    "org_type": "String",
    "scorecard_status": "String",
    "weight_profile": "String",
    "shared_kpi_status": "String",
    "pulse_status": "String",
    "USER-DEFINED": "String",
}


def pg_type_to_ch(data_type: str, udt_name: str) -> str:
    if udt_name in PG_TO_CH:
        return PG_TO_CH[udt_name]
    if data_type in PG_TO_CH:
        return PG_TO_CH[data_type]
    return "String"


def load_schema() -> dict[str, list[dict[str, str]]]:
    raw = json.loads(SCHEMA_PATH.read_text())
    by_table: dict[str, list[dict[str, str]]] = defaultdict(list)
    for col in raw:
        by_table[col["table_name"]].append(col)
    return dict(by_table)


def ddl_for_table(table: str, columns: list[dict[str, str]]) -> str:
    parts = []
    for c in columns:
        ch = pg_type_to_ch(c["data_type"], c["udt_name"])
        null = "" if c["is_nullable"] == "YES" else ""
        if ch.startswith("Decimal"):
            parts.append(f"`{c['column_name']}` Nullable({ch})")
        elif ch == "UInt8":
            parts.append(f"`{c['column_name']}` Nullable(UInt8)")
        elif ch in ("Int32", "Int64", "Float64"):
            parts.append(f"`{c['column_name']}` Nullable({ch})")
        elif ch == "UUID":
            parts.append(f"`{c['column_name']}` Nullable(UUID)")
        elif ch.startswith("DateTime"):
            parts.append(f"`{c['column_name']}` Nullable({ch})")
        elif ch == "Date":
            parts.append(f"`{c['column_name']}` Nullable(Date)")
        else:
            parts.append(f"`{c['column_name']}` Nullable(String)")
    cols = ",\n  ".join(parts)
    return (
        f"CREATE TABLE IF NOT EXISTS `{table}` (\n  {cols}\n) "
        "ENGINE = MergeTree ORDER BY tuple()"
    )


def fetch_table_rows_pg(db_url: str, table: str) -> list[dict[str, Any]]:
    if psycopg2 is None:
        raise RuntimeError("psycopg2 required for SUPABASE_DB_URL")
    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor(
            cursor_factory=psycopg2.extras.RealDictCursor
        ) as cur:
            cur.execute(f'SELECT * FROM public."{table}"')
            return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()


def fetch_table_rows_dump(table: str, dump_dir: Path) -> list[dict[str, Any]]:
    path = dump_dir / f"{table}.json"
    if not path.exists():
        return []
    data = json.loads(path.read_text())
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "rows" in data:
        return data["rows"]
    raise RuntimeError(f"Unexpected dump format in {path}")


def fetch_table_rows_rest(
    base_url: str, api_key: str, table: str, page_size: int = 1000
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0
    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }
    while True:
        url = (
            f"{base_url.rstrip('/')}/rest/v1/{table}"
            f"?select=*&limit={page_size}&offset={offset}"
        )
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                chunk = json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            body = e.read().decode() if e.fp else ""
            raise RuntimeError(f"{table} HTTP {e.code}: {body[:500]}") from e
        if not chunk:
            break
        rows.extend(chunk)
        if len(chunk) < page_size:
            break
        offset += page_size
    return rows


def fix_iso_timestamp(value: str) -> str:
    """PostgREST may return >6 fractional digits; CH/Python need <=6."""
    m = re.match(r"^(.+?)\.(\d+)(Z|[+-]\d{2}:\d{2})$", value)
    if not m:
        return value.replace("Z", "+00:00")
    base, frac, tz = m.group(1), m.group(2), m.group(3)
    frac = (frac + "000000")[:6]
    tz = "+00:00" if tz == "Z" else tz
    return f"{base}.{frac}{tz}"


def coerce_value(v: Any, ch_type: str) -> Any:
    if v is None or v == "":
        return None
    if isinstance(v, bool):
        return 1 if v else 0
    if isinstance(v, (dict, list)):
        return json.dumps(v, ensure_ascii=False)
    if ch_type == "Date" and isinstance(v, str):
        return date.fromisoformat(v[:10])
    if ch_type.startswith("DateTime") and isinstance(v, str):
        return datetime.fromisoformat(fix_iso_timestamp(v))
    return v


def row_to_batch(
    row: dict[str, Any], columns: list[dict[str, str]]
) -> list[Any]:
    normalized = {}
    for k, v in row.items():
        if v is None:
            normalized[k] = None
        elif isinstance(v, bool):
            normalized[k] = 1 if v else 0
        elif isinstance(v, (dict, list)):
            normalized[k] = json.dumps(v, ensure_ascii=False)
        elif v == "":
            normalized[k] = None
        elif isinstance(v, str) and "T" in v and re.match(
            r"^\d{4}-\d{2}-\d{2}T", v
        ):
            normalized[k] = fix_iso_timestamp(v)
        else:
            normalized[k] = v
    return [
        coerce_value(
            normalized.get(c["column_name"]),
            pg_type_to_ch(c["data_type"], c["udt_name"]),
        )
        for c in columns
    ]


def resolve_source() -> str:
    if os.environ.get("SUPABASE_DB_URL", "").strip():
        return "postgres"
    dump_dir = os.environ.get("ABC_EXPRESS_DUMP_DIR", "").strip()
    if dump_dir:
        return f"dump:{dump_dir}"
    if Path(__file__).parent.joinpath("dumps").is_dir() and any(
        DUMP_DIR.glob("*.json")
    ):
        return f"dump:{DUMP_DIR}"
    return "rest"


def fetch_table_rows_for_table(
    table: str,
    source: str,
    base_url: str,
    api_key: str,
    dump_dir: Path,
) -> list[dict[str, Any]]:
    dump_path = dump_dir / f"{table}.json"
    if dump_path.exists():
        return fetch_table_rows_dump(table, dump_dir)
    if source == "postgres":
        return fetch_table_rows_pg(
            os.environ["SUPABASE_DB_URL"].strip(), table
        )
    if source.startswith("dump:"):
        return fetch_table_rows_dump(table, dump_dir)
    return fetch_table_rows_rest(base_url, api_key, table)


def main() -> int:
    base_url = os.environ.get("SUPABASE_URL", "").strip()
    api_key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        or os.environ.get("SUPABASE_ANON_KEY", "").strip()
    )
    source = resolve_source()
    dump_dir = Path(
        os.environ.get("ABC_EXPRESS_DUMP_DIR", str(DUMP_DIR))
    )
    dump_dir.mkdir(parents=True, exist_ok=True)
    if source == "rest" and (not base_url or not api_key):
        print(
            "Set SUPABASE_URL + key, SUPABASE_DB_URL, or ABC_EXPRESS_DUMP_DIR",
            file=sys.stderr,
        )
        return 1
    if source == "postgres" and psycopg2 is None:
        print("pip install psycopg2-binary for SUPABASE_DB_URL", file=sys.stderr)
        return 1

    ch_host = os.environ.get("CLICKHOUSE_HOST", "127.0.0.1")
    ch_port = int(os.environ.get("CLICKHOUSE_PORT", "8124"))
    ch_db = os.environ.get("CLICKHOUSE_DATABASE", "abc_express")

    schema = load_schema()
    tables = sorted(t for t in schema if t not in SKIP_TABLES)

    client = clickhouse_connect.get_client(
        host=ch_host, port=ch_port, database=ch_db
    )
    client.command(f"CREATE DATABASE IF NOT EXISTS `{ch_db}`")

    report: list[dict[str, Any]] = []
    print(f"Source: {source}")

    for table in tables:
        ddl = ddl_for_table(table, schema[table])
        client.command(f"DROP TABLE IF EXISTS `{table}`")
        client.command(ddl)

        src_rows = fetch_table_rows_for_table(
            table, source, base_url, api_key, dump_dir
        )
        if not src_rows:
            report.append({"table": table, "source": 0, "loaded": 0})
            continue

        col_names = [c["column_name"] for c in schema[table]]
        batch = [row_to_batch(r, schema[table]) for r in src_rows]
        client.insert(
            table, batch, column_names=col_names, database=ch_db
        )
        loaded = int(
            client.query(f"SELECT count() FROM `{table}`").result_rows[0][0]
        )
        report.append(
            {
                "table": table,
                "source": len(src_rows),
                "loaded": loaded,
            }
        )
        print(f"{table}: {len(src_rows)} -> {loaded}")

    out_path = Path(__file__).parent / "migration_report.json"
    out_path.write_text(json.dumps(report, indent=2))
    mismatches = [r for r in report if r["source"] != r["loaded"]]
    if mismatches:
        print("Row count mismatches:", mismatches, file=sys.stderr)
        return 2
    print(f"OK — {len(tables)} tables loaded into {ch_db} @ {ch_host}:{ch_port}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
