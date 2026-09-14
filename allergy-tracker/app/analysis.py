import datetime as dt
import math
from collections import defaultdict
from typing import Any

from . import db
from .config import SYMPTOM_KEYS, SYMPTOMS

ENV_METRICS = [
    ("pollen_index", "Pollen index"),
    ("asthma_index", "Asthma index"),
    ("pm2_5", "PM2.5"),
    ("ozone", "Ozone"),
    ("temp_max", "High temp"),
    ("temp_min", "Low temp"),
    ("wind_max", "Max wind"),
    ("precipitation", "Precipitation"),
    ("humidity_mean", "Humidity"),
    ("outdoor_minutes", "Time outdoors"),
]
MIN_PAIRS = 8


def symptom_score(row: dict[str, Any]) -> int | None:
    values = [row.get(k) for k in SYMPTOM_KEYS]
    if all(v is None for v in values):
        return None
    return sum(v or 0 for v in values)


def _ranks(values: list[float]) -> list[float]:
    order = sorted(range(len(values)), key=lambda i: values[i])
    ranks = [0.0] * len(values)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        average = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[order[k]] = average
        i = j + 1
    return ranks


def _pearson(xs: list[float], ys: list[float]) -> float | None:
    n = len(xs)
    if n < 3:
        return None
    mx, my = sum(xs) / n, sum(ys) / n
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    dx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    dy = math.sqrt(sum((y - my) ** 2 for y in ys))
    if dx == 0 or dy == 0:
        return None
    return num / (dx * dy)


def spearman(xs: list[float], ys: list[float]) -> float | None:
    if len(xs) < 3:
        return None
    return _pearson(_ranks(xs), _ranks(ys))


def _strength(rho: float) -> str:
    a = abs(rho)
    if a >= 0.6:
        return "strong"
    if a >= 0.4:
        return "moderate"
    if a >= 0.2:
        return "weak"
    return "negligible"


def build_insights(rows: list[dict[str, Any]]) -> dict[str, Any]:
    logged = [r for r in rows if r.get("logged")]
    by_date = {r["date"]: r for r in rows}
    for row in rows:
        row["score"] = symptom_score(row)

    correlations = []
    for key, label in ENV_METRICS:
        for lag, lag_label in ((0, "same day"), (1, "previous day")):
            xs: list[float] = []
            ys: list[float] = []
            for row in logged:
                source = row
                if lag:
                    prev = (dt.date.fromisoformat(row["date"]) - dt.timedelta(days=lag)).isoformat()
                    source = by_date.get(prev) or {}
                value = source.get(key)
                score = row.get("score")
                if value is not None and score is not None:
                    xs.append(float(value))
                    ys.append(float(score))
            rho = spearman(xs, ys) if len(xs) >= MIN_PAIRS else None
            if rho is not None:
                correlations.append(
                    {
                        "metric": key,
                        "label": label,
                        "lag": lag,
                        "lag_label": lag_label,
                        "rho": round(rho, 3),
                        "n": len(xs),
                        "strength": _strength(rho),
                    }
                )
    correlations.sort(key=lambda c: abs(c["rho"]), reverse=True)

    # Which named allergen was in the air on bad days vs good days.
    scores = [r["score"] for r in logged if r["score"] is not None]
    overall_mean = sum(scores) / len(scores) if scores else 0.0
    trigger_stats: dict[str, list[float]] = defaultdict(list)
    for row in logged:
        if row.get("score") is None:
            continue
        for trigger in row.get("pollen_triggers") or []:
            trigger_stats[trigger].append(float(row["score"]))
    triggers = [
        {
            "name": name,
            "days": len(values),
            "mean_score": round(sum(values) / len(values), 2),
            "delta_vs_overall": round(sum(values) / len(values) - overall_mean, 2),
        }
        for name, values in trigger_stats.items()
        if len(values) >= 3
    ]
    triggers.sort(key=lambda t: t["delta_vs_overall"], reverse=True)

    # Per-symptom sensitivity to pollen, so "itchy eyes" vs "cough" can differ.
    per_symptom = []
    for key, label in SYMPTOMS:
        xs, ys = [], []
        for row in logged:
            if row.get("pollen_index") is not None and row.get(key) is not None:
                xs.append(float(row["pollen_index"]))
                ys.append(float(row[key]))
        rho = spearman(xs, ys) if len(xs) >= MIN_PAIRS else None
        mean = sum(ys) / len(ys) if ys else None
        per_symptom.append(
            {
                "key": key,
                "label": label,
                "rho_pollen": round(rho, 3) if rho is not None else None,
                "mean_severity": round(mean, 2) if mean is not None else None,
                "n": len(ys),
            }
        )
    per_symptom.sort(key=lambda s: (s["rho_pollen"] is None, -(s["rho_pollen"] or 0)))

    monthly: dict[int, dict[str, list[float]]] = defaultdict(lambda: {"score": [], "pollen": []})
    for row in rows:
        month = dt.date.fromisoformat(row["date"]).month
        if row.get("score") is not None:
            monthly[month]["score"].append(float(row["score"]))
        if row.get("pollen_index") is not None:
            monthly[month]["pollen"].append(float(row["pollen_index"]))
    seasonality = [
        {
            "month": m,
            "month_name": dt.date(2000, m, 1).strftime("%b"),
            "mean_score": round(sum(v["score"]) / len(v["score"]), 2) if v["score"] else None,
            "logged_days": len(v["score"]),
            "mean_pollen": round(sum(v["pollen"]) / len(v["pollen"]), 2) if v["pollen"] else None,
        }
        for m, v in sorted(monthly.items())
    ]

    worst = sorted(
        (r for r in logged if r.get("score") is not None), key=lambda r: r["score"], reverse=True
    )[:5]

    return {
        "logged_days": len(logged),
        "mean_score": round(overall_mean, 2),
        "min_pairs": MIN_PAIRS,
        "enough_data": len(logged) >= MIN_PAIRS,
        "correlations": correlations[:12],
        "triggers": triggers,
        "per_symptom": per_symptom,
        "seasonality": seasonality,
        "worst_days": [
            {
                "date": r["date"],
                "score": r["score"],
                "pollen_index": r.get("pollen_index"),
                "triggers": r.get("pollen_triggers") or [],
            }
            for r in worst
        ],
    }


def insights(start: str | None = None, end: str | None = None) -> dict[str, Any]:
    return build_insights(db.fetch_joined(start, end))
