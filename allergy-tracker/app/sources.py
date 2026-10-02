"""Keyless data sources: pollen.com (pollen index + top triggers) and Open-Meteo (weather, air quality)."""

import datetime as dt
from typing import Any

import httpx

from .config import LATITUDE, LONGITUDE, TIMEZONE, TIMEZONE_NAME, ZIP_CODE

POLLEN_BASE = "https://www.pollen.com/api/forecast"
POLLEN_HEADERS = {
    "User-Agent": "Mozilla/5.0 (allergy-tracker)",
    "Accept": "application/json",
}
WEATHER_FORECAST = "https://api.open-meteo.com/v1/forecast"
WEATHER_ARCHIVE = "https://archive-api.open-meteo.com/v1/archive"
AIR_QUALITY = "https://air-quality-api.open-meteo.com/v1/air-quality"

DAILY_WEATHER_VARS = [
    "temperature_2m_max",
    "temperature_2m_min",
    "wind_speed_10m_max",
    "precipitation_sum",
    "relative_humidity_2m_mean",
]


def pollen_category(index: float | None) -> str:
    """pollen.com uses a 0-12 scale."""
    if index is None:
        return "Unknown"
    if index < 2.5:
        return "Low"
    if index < 4.9:
        return "Low-Medium"
    if index < 7.3:
        return "Medium"
    if index < 9.7:
        return "Medium-High"
    if index < 12:
        return "High"
    return "Very High"


async def _pollen_get(client: httpx.AsyncClient, path: str) -> dict[str, Any] | None:
    url = f"{POLLEN_BASE}/{path}"
    headers = dict(POLLEN_HEADERS)
    headers["Referer"] = f"https://www.pollen.com/forecast/{path}"
    resp = await client.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return data if isinstance(data, dict) else None


async def fetch_pollen_current(client: httpx.AsyncClient, today: dt.date) -> dict[str, dict[str, Any]]:
    """Yesterday/today/tomorrow index plus the day's top allergen triggers."""
    data = await _pollen_get(client, f"current/pollen/{ZIP_CODE}")
    out: dict[str, dict[str, Any]] = {}
    if not data:
        return out
    offsets = {"Yesterday": -1, "Today": 0, "Tomorrow": 1}
    for period in data.get("Location", {}).get("periods", []):
        offset = offsets.get(period.get("Type"))
        if offset is None:
            continue
        date = (today + dt.timedelta(days=offset)).isoformat()
        out[date] = {
            "pollen_index": period.get("Index"),
            "pollen_triggers": [t.get("Name") for t in period.get("Triggers", []) if t.get("Name")],
        }
    return out


async def fetch_pollen_history(client: httpx.AsyncClient, days: int = 30) -> dict[str, dict[str, Any]]:
    data = await _pollen_get(client, f"historic/pollen/{ZIP_CODE}/{days}")
    out: dict[str, dict[str, Any]] = {}
    if not data:
        return out
    for period in data.get("Location", {}).get("periods", []):
        date = str(period.get("Period", ""))[:10]
        if date and period.get("Index") is not None:
            out[date] = {"pollen_index": period["Index"]}
    return out


async def fetch_pollen_forecast(client: httpx.AsyncClient) -> list[dict[str, Any]]:
    data = await _pollen_get(client, f"extended/pollen/{ZIP_CODE}")
    if not data:
        return []
    return [
        {
            "date": str(p.get("Period", ""))[:10],
            "pollen_index": p.get("Index"),
            "category": pollen_category(p.get("Index")),
        }
        for p in data.get("Location", {}).get("periods", [])
    ]


async def fetch_asthma(client: httpx.AsyncClient, today: dt.date) -> dict[str, dict[str, Any]]:
    try:
        data = await _pollen_get(client, f"current/asthma/{ZIP_CODE}")
    except httpx.HTTPError:
        return {}
    out: dict[str, dict[str, Any]] = {}
    if not data:
        return out
    offsets = {"Yesterday": -1, "Today": 0, "Tomorrow": 1}
    for period in data.get("Location", {}).get("periods", []):
        offset = offsets.get(period.get("Type"))
        if offset is not None and period.get("Index") is not None:
            out[(today + dt.timedelta(days=offset)).isoformat()] = {"asthma_index": period["Index"]}
    return out


def _merge_daily(out: dict[str, dict[str, Any]], daily: dict[str, Any], mapping: dict[str, str]) -> None:
    dates = daily.get("time", [])
    for i, date in enumerate(dates):
        entry = out.setdefault(date, {})
        for src, dest in mapping.items():
            values = daily.get(src)
            if values and i < len(values) and values[i] is not None:
                entry[dest] = values[i]


async def fetch_weather(
    client: httpx.AsyncClient, start: dt.date, end: dt.date
) -> dict[str, dict[str, Any]]:
    """Archive for older days, forecast API (past_days) for the recent window it does not cover yet."""
    out: dict[str, dict[str, Any]] = {}
    mapping = {
        "temperature_2m_max": "temp_max",
        "temperature_2m_min": "temp_min",
        "wind_speed_10m_max": "wind_max",
        "precipitation_sum": "precipitation",
        "relative_humidity_2m_mean": "humidity_mean",
    }
    common = {
        "latitude": LATITUDE,
        "longitude": LONGITUDE,
        "timezone": TIMEZONE_NAME,
        "temperature_unit": "fahrenheit",
        "wind_speed_unit": "mph",
        "precipitation_unit": "inch",
        "daily": ",".join(DAILY_WEATHER_VARS),
    }
    archive_end = min(end, dt.datetime.now(TIMEZONE).date() - dt.timedelta(days=6))
    if start <= archive_end:
        resp = await client.get(
            WEATHER_ARCHIVE,
            params={**common, "start_date": start.isoformat(), "end_date": archive_end.isoformat()},
            timeout=60,
        )
        resp.raise_for_status()
        _merge_daily(out, resp.json().get("daily", {}), mapping)

    resp = await client.get(
        WEATHER_FORECAST, params={**common, "past_days": 14, "forecast_days": 3}, timeout=60
    )
    resp.raise_for_status()
    _merge_daily(out, resp.json().get("daily", {}), mapping)
    return {d: v for d, v in out.items() if start.isoformat() <= d <= (end + dt.timedelta(days=3)).isoformat()}


async def fetch_air_quality(
    client: httpx.AsyncClient, start: dt.date, end: dt.date
) -> dict[str, dict[str, Any]]:
    """Daily means of PM2.5 and ozone (Open-Meteo only publishes pollen for Europe, so we skip it here)."""
    resp = await client.get(
        AIR_QUALITY,
        params={
            "latitude": LATITUDE,
            "longitude": LONGITUDE,
            "hourly": "pm2_5,ozone",
            "timezone": TIMEZONE_NAME,
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
        },
        timeout=60,
    )
    resp.raise_for_status()
    hourly = resp.json().get("hourly", {})
    sums: dict[str, dict[str, list[float]]] = {}
    for i, stamp in enumerate(hourly.get("time", [])):
        date = stamp[:10]
        bucket = sums.setdefault(date, {"pm2_5": [], "ozone": []})
        for key in ("pm2_5", "ozone"):
            value = hourly.get(key, [None] * (i + 1))[i]
            if value is not None:
                bucket[key].append(value)
    return {
        date: {
            key: round(sum(values) / len(values), 1)
            for key, values in buckets.items()
            if values
        }
        for date, buckets in sums.items()
    }
