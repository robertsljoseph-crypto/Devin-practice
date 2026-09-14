import datetime as dt
import hashlib
import logging
import os
from contextlib import asynccontextmanager
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import Body, Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import analysis, db, ingest, push, sources
from .config import PASSCODE, SYMPTOMS, TIMEZONE, ZIP_CODE

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
SESSION_COOKIE = "allergy_session"
DEFAULT_REMINDER_HOUR = 19
scheduler = AsyncIOScheduler(timezone=TIMEZONE)


def passcode() -> str:
    """Env var wins; otherwise the passcode chosen on the first visit to a fresh deployment."""
    return PASSCODE or (db.get_setting("passcode", "") or "")


def _token() -> str:
    return hashlib.sha256(f"allergy-tracker:{passcode()}".encode()).hexdigest()


def require_auth(request: Request) -> None:
    if not passcode():
        return
    if request.cookies.get(SESSION_COOKIE) != _token():
        raise HTTPException(status_code=401, detail="Passcode required")


def reminder_hour() -> int:
    return int(db.get_setting("reminder_hour", str(DEFAULT_REMINDER_HOUR)) or DEFAULT_REMINDER_HOUR)


async def daily_refresh_job() -> None:
    result = await ingest.refresh(days_back=30)
    logger.info("scheduled refresh: %s", result)


async def reminder_job() -> None:
    today = ingest.today_local().isoformat()
    with db.connect() as conn:
        logged = conn.execute("SELECT 1 FROM symptom_log WHERE date = ?", (today,)).fetchone()
    if logged:
        logger.info("reminder skipped, %s already logged", today)
        return
    rows = db.fetch_joined(today, today)
    pollen = rows[0].get("pollen_index") if rows else None
    detail = (
        f"Pollen today is {pollen} ({sources.pollen_category(pollen)})."
        if pollen is not None
        else "Tap to log how you felt."
    )
    logger.info("reminder: %s", push.send_to_all("How are your allergies today?", detail))


def schedule_jobs() -> None:
    scheduler.add_job(daily_refresh_job, CronTrigger(hour=6, minute=15), id="refresh", replace_existing=True)
    scheduler.add_job(
        reminder_job,
        CronTrigger(hour=reminder_hour(), minute=0),
        id="reminder",
        replace_existing=True,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    push.ensure_keys()
    schedule_jobs()
    scheduler.start()
    try:
        await ingest.refresh(days_back=30)
    except Exception as exc:  # noqa: BLE001 - never block startup on a flaky upstream
        logger.warning("startup refresh failed: %s", exc)
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="Allergy Tracker", lifespan=lifespan)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/login")
async def login(response: Response, payload: dict = Body(...)) -> dict[str, bool]:
    supplied = str(payload.get("passcode") or "")
    current = passcode()
    if not current:
        if len(supplied) < 4:
            raise HTTPException(status_code=400, detail="Choose a passcode of at least 4 characters")
        db.set_setting("passcode", supplied)
    elif supplied != current:
        raise HTTPException(status_code=401, detail="Wrong passcode")
    response.set_cookie(
        SESSION_COOKIE, _token(), max_age=60 * 60 * 24 * 365, httponly=True, samesite="lax", secure=True
    )
    return {"ok": True}


@app.get("/api/me")
async def me(request: Request) -> dict[str, Any]:
    current = passcode()
    authed = not current or request.cookies.get(SESSION_COOKIE) == _token()
    return {
        "authenticated": authed,
        "passcode_set": bool(current),
        "zip": ZIP_CODE,
        "symptoms": [{"key": k, "label": l} for k, l in SYMPTOMS],
        "reminder_hour": reminder_hour(),
        "vapid_public_key": push.ensure_keys(),
        "today": ingest.today_local().isoformat(),
    }


@app.get("/api/day/{date}", dependencies=[Depends(require_auth)])
async def get_day(date: str) -> dict[str, Any]:
    rows = db.fetch_joined(date, date)
    row = rows[0] if rows else {"date": date, "logged": False}
    row["pollen_category"] = sources.pollen_category(row.get("pollen_index"))
    row["score"] = analysis.symptom_score(row)
    return row


@app.post("/api/day/{date}", dependencies=[Depends(require_auth)])
async def save_day(date: str, payload: dict = Body(...)) -> dict[str, Any]:
    dt.date.fromisoformat(date)
    db.upsert_symptom_log(date, payload)
    return await get_day(date)


@app.get("/api/history", dependencies=[Depends(require_auth)])
async def history(days: int = 120) -> list[dict[str, Any]]:
    end = ingest.today_local()
    start = end - dt.timedelta(days=days)
    rows = db.fetch_joined(start.isoformat(), end.isoformat())
    for row in rows:
        row["score"] = analysis.symptom_score(row)
        row["pollen_category"] = sources.pollen_category(row.get("pollen_index"))
    return rows


@app.get("/api/insights", dependencies=[Depends(require_auth)])
async def insights(start: str | None = None, end: str | None = None) -> dict[str, Any]:
    return analysis.insights(start, end)


@app.get("/api/forecast", dependencies=[Depends(require_auth)])
async def forecast() -> list[dict[str, Any]]:
    return await ingest.forecast()


@app.post("/api/refresh", dependencies=[Depends(require_auth)])
async def refresh(days_back: int = 30) -> dict[str, Any]:
    return await ingest.refresh(days_back=days_back)


@app.post("/api/backfill", dependencies=[Depends(require_auth)])
async def backfill(years: int = 2) -> dict[str, Any]:
    return await ingest.backfill(years=years)


@app.post("/api/push/subscribe", dependencies=[Depends(require_auth)])
async def subscribe(subscription: dict = Body(...)) -> dict[str, bool]:
    push.save_subscription(subscription)
    return {"ok": True}


@app.post("/api/push/unsubscribe", dependencies=[Depends(require_auth)])
async def unsubscribe(payload: dict = Body(...)) -> dict[str, bool]:
    push.delete_subscription(payload.get("endpoint", ""))
    return {"ok": True}


@app.post("/api/push/test", dependencies=[Depends(require_auth)])
async def push_test() -> dict[str, Any]:
    return push.send_to_all("Allergy Tracker", "Test reminder — logging works from here.")


@app.post("/api/settings/reminder", dependencies=[Depends(require_auth)])
async def set_reminder(payload: dict = Body(...)) -> dict[str, int]:
    hour = int(payload.get("hour", DEFAULT_REMINDER_HOUR))
    if not 0 <= hour <= 23:
        raise HTTPException(status_code=400, detail="hour must be 0-23")
    db.set_setting("reminder_hour", str(hour))
    scheduler.add_job(reminder_job, CronTrigger(hour=hour, minute=0), id="reminder", replace_existing=True)
    return {"hour": hour}


@app.get("/api/export.csv", dependencies=[Depends(require_auth)])
async def export_csv() -> Response:
    import csv
    import io

    rows = db.fetch_joined()
    buffer = io.StringIO()
    if rows:
        fields = [f for f in rows[0] if f != "pollen_triggers"] + ["pollen_triggers"]
        writer = csv.DictWriter(buffer, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            row = dict(row)
            row["pollen_triggers"] = "; ".join(row.get("pollen_triggers") or [])
            writer.writerow(row)
    return Response(
        buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=allergy-tracker.csv"},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)


@app.get("/sw.js")
async def service_worker() -> FileResponse:
    return FileResponse(os.path.join(STATIC_DIR, "sw.js"), media_type="application/javascript")


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
