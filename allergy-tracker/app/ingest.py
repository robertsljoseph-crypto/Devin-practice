import datetime as dt
import logging
from typing import Any

import httpx

from . import db, sources
from .config import TIMEZONE

logger = logging.getLogger(__name__)


def today_local() -> dt.date:
    return dt.datetime.now(TIMEZONE).date()


def _merge(target: dict[str, dict[str, Any]], source: dict[str, dict[str, Any]]) -> None:
    for date, values in source.items():
        target.setdefault(date, {}).update(values)


async def refresh(days_back: int = 30, include_pollen_history: bool = True) -> dict[str, Any]:
    """Pull pollen, weather and air quality for the recent window and store them."""
    today = today_local()
    start = today - dt.timedelta(days=days_back)
    merged: dict[str, dict[str, Any]] = {}
    errors: list[str] = []

    async with httpx.AsyncClient(follow_redirects=True) as client:
        for name, coro in (
            ("pollen_current", sources.fetch_pollen_current(client, today)),
            ("pollen_history", sources.fetch_pollen_history(client, days_back) if include_pollen_history else None),
            ("asthma", sources.fetch_asthma(client, today)),
            ("weather", sources.fetch_weather(client, start, today)),
            ("air_quality", sources.fetch_air_quality(client, start, today)),
        ):
            if coro is None:
                continue
            try:
                _merge(merged, await coro)
            except Exception as exc:  # noqa: BLE001 - one bad source must not block the rest
                logger.warning("source %s failed: %s", name, exc)
                errors.append(f"{name}: {exc}")

    for date, values in merged.items():
        db.upsert_day_env(date, values)

    db.set_setting("last_refresh", dt.datetime.now(dt.timezone.utc).isoformat())
    return {"days_updated": len(merged), "errors": errors}


async def backfill(years: int = 2) -> dict[str, Any]:
    """Weather and air quality go back years; pollen.com only exposes the last 30 days."""
    today = today_local()
    start = today - dt.timedelta(days=365 * years)
    merged: dict[str, dict[str, Any]] = {}
    errors: list[str] = []

    async with httpx.AsyncClient(follow_redirects=True) as client:
        try:
            _merge(merged, await sources.fetch_weather(client, start, today))
        except Exception as exc:  # noqa: BLE001
            errors.append(f"weather: {exc}")
        cursor = start
        while cursor < today:
            chunk_end = min(cursor + dt.timedelta(days=180), today)
            try:
                _merge(merged, await sources.fetch_air_quality(client, cursor, chunk_end))
            except Exception as exc:  # noqa: BLE001
                errors.append(f"air_quality {cursor}: {exc}")
            cursor = chunk_end + dt.timedelta(days=1)

    for date, values in merged.items():
        db.upsert_day_env(date, values)
    return {"days_updated": len(merged), "errors": errors}


async def forecast() -> list[dict[str, Any]]:
    async with httpx.AsyncClient(follow_redirects=True) as client:
        try:
            return await sources.fetch_pollen_forecast(client)
        except Exception as exc:  # noqa: BLE001
            logger.warning("forecast failed: %s", exc)
            return []
