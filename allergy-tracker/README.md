# Allergy Tracker (ZIP 06820)

Daily allergy symptom log joined to the day's local pollen, weather and air-quality data, so
repeated patterns ("ragweed days wreck me, grass days don't") become visible over a season.

## Data sources (all keyless)

| Data | Source | Coverage |
| --- | --- | --- |
| Pollen index (0-12) + the region's top 3 pollen contributors, asthma index | pollen.com forecast API by ZIP | yesterday/today/tomorrow, 5-day forecast, 30-day index history |
| Daily high/low temp, wind, precipitation, humidity | Open-Meteo forecast + archive | years of history |
| PM2.5, ozone daily means | Open-Meteo air quality (CAMS) | years of history |

Open-Meteo's pollen variables are Europe-only, which is why pollen comes from pollen.com.
Named-allergen history (which plants were dominant) only exists going forward from the first
day the app runs — the 30-day pollen history is index-only.

## Running locally

```bash
python3 -m venv .venv && .venv/bin/pip install -e .
DATA_DIR=$PWD/data ALLERGY_PASSCODE=choose-one .venv/bin/uvicorn app.main:app --port 8000
```

Environment variables: `ALLERGY_ZIP`, `ALLERGY_LAT`, `ALLERGY_LON`, `ALLERGY_TZ`,
`ALLERGY_PASSCODE` (leave unset to disable the passcode gate), `DATA_DIR`, `VAPID_CONTACT`.

## How it works

- `app/sources.py` — HTTP clients for the three upstreams.
- `app/ingest.py` — `refresh()` (last 30 days, runs at startup and 06:15 local daily) and
  `backfill()` (weather + air quality, multi-year).
- `app/analysis.py` — symptom score (sum of 8 symptoms, 0-3 each), Spearman correlations of
  the score against each metric at same-day and previous-day lag, per-allergen mean-score
  deltas, per-symptom pollen sensitivity, and a month-by-month season profile.
- `app/main.py` — API, APScheduler jobs, web-push reminder.
- `app/static/` — installable PWA: log a day, browse history, read insights.

Insights need at least 8 logged days before correlations are shown; per-allergen comparisons
need 3 logged days with that allergen dominant.

## Reminders

The daily reminder is a Web Push notification at a configurable local hour, skipped when the
day is already logged. VAPID keys are generated on first start into `DATA_DIR`. On iPhone the
page must be added to the home screen before notifications can be enabled.
