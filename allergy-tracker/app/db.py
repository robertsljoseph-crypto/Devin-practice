import json
import os
import sqlite3
from collections.abc import Iterable
from typing import Any

from .config import DATA_DIR, DB_PATH, SYMPTOM_KEYS

SCHEMA = """
CREATE TABLE IF NOT EXISTS day_env (
    date TEXT PRIMARY KEY,
    pollen_index REAL,
    pollen_triggers TEXT,
    asthma_index REAL,
    temp_max REAL,
    temp_min REAL,
    wind_max REAL,
    precipitation REAL,
    humidity_mean REAL,
    pm2_5 REAL,
    ozone REAL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS symptom_log (
    date TEXT PRIMARY KEY,
    sneezing INTEGER DEFAULT 0,
    runny_nose INTEGER DEFAULT 0,
    congestion INTEGER DEFAULT 0,
    itchy_eyes INTEGER DEFAULT 0,
    throat INTEGER DEFAULT 0,
    cough INTEGER DEFAULT 0,
    headache INTEGER DEFAULT 0,
    fatigue INTEGER DEFAULT 0,
    medications TEXT DEFAULT '',
    outdoor_minutes INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_subscription (
    endpoint TEXT PRIMARY KEY,
    subscription TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS setting (
    key TEXT PRIMARY KEY,
    value TEXT
);
"""


def connect() -> sqlite3.Connection:
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)


def get_setting(key: str, default: str | None = None) -> str | None:
    with connect() as conn:
        row = conn.execute("SELECT value FROM setting WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else default


def set_setting(key: str, value: str) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO setting (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )


def upsert_day_env(date: str, values: dict[str, Any]) -> None:
    columns = [
        "pollen_index",
        "pollen_triggers",
        "asthma_index",
        "temp_max",
        "temp_min",
        "wind_max",
        "precipitation",
        "humidity_mean",
        "pm2_5",
        "ozone",
    ]
    present = {c: values[c] for c in columns if c in values and values[c] is not None}
    if not present:
        return
    if isinstance(present.get("pollen_triggers"), (list, dict)):
        present["pollen_triggers"] = json.dumps(present["pollen_triggers"])
    cols = ", ".join(present)
    placeholders = ", ".join("?" for _ in present)
    updates = ", ".join(f"{c} = excluded.{c}" for c in present)
    with connect() as conn:
        conn.execute(
            f"INSERT INTO day_env (date, {cols}) VALUES (?, {placeholders}) "
            f"ON CONFLICT(date) DO UPDATE SET {updates}, updated_at = CURRENT_TIMESTAMP",
            (date, *present.values()),
        )


def upsert_symptom_log(date: str, values: dict[str, Any]) -> None:
    allowed = SYMPTOM_KEYS + ["medications", "outdoor_minutes", "notes"]
    present = {k: values[k] for k in allowed if k in values}
    if not present:
        present = {k: 0 for k in SYMPTOM_KEYS}
    cols = ", ".join(present)
    placeholders = ", ".join("?" for _ in present)
    updates = ", ".join(f"{c} = excluded.{c}" for c in present)
    with connect() as conn:
        conn.execute(
            f"INSERT INTO symptom_log (date, {cols}) VALUES (?, {placeholders}) "
            f"ON CONFLICT(date) DO UPDATE SET {updates}, updated_at = CURRENT_TIMESTAMP",
            (date, *present.values()),
        )


def rows_to_dicts(rows: Iterable[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(r) for r in rows]


def fetch_joined(start: str | None = None, end: str | None = None) -> list[dict[str, Any]]:
    """Every day that has environment data and/or a symptom log, oldest first."""
    query = """
    SELECT d.date AS date, d.pollen_index, d.pollen_triggers, d.asthma_index, d.temp_max,
           d.temp_min, d.wind_max, d.precipitation, d.humidity_mean, d.pm2_5, d.ozone,
           s.sneezing, s.runny_nose, s.congestion, s.itchy_eyes, s.throat, s.cough,
           s.headache, s.fatigue, s.medications, s.outdoor_minutes, s.notes
    FROM day_env d LEFT JOIN symptom_log s ON s.date = d.date
    UNION
    SELECT s.date AS date, d.pollen_index, d.pollen_triggers, d.asthma_index, d.temp_max,
           d.temp_min, d.wind_max, d.precipitation, d.humidity_mean, d.pm2_5, d.ozone,
           s.sneezing, s.runny_nose, s.congestion, s.itchy_eyes, s.throat, s.cough,
           s.headache, s.fatigue, s.medications, s.outdoor_minutes, s.notes
    FROM symptom_log s LEFT JOIN day_env d ON s.date = d.date
    """
    clauses, params = [], []
    if start:
        clauses.append("date >= ?")
        params.append(start)
    if end:
        clauses.append("date <= ?")
        params.append(end)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    sql = f"SELECT * FROM ({query}) {where} ORDER BY date"
    with connect() as conn:
        rows = rows_to_dicts(conn.execute(sql, params).fetchall())
    for row in rows:
        row["pollen_triggers"] = json.loads(row["pollen_triggers"]) if row.get("pollen_triggers") else []
        row["logged"] = row["sneezing"] is not None
    return rows
