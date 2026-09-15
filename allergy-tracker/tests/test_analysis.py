import datetime as dt

import pytest

from app.analysis import build_insights, spearman, symptom_score


def test_spearman_monotonic():
    assert spearman([1, 2, 3, 4], [2, 4, 8, 16]) == pytest.approx(1.0)
    assert spearman([1, 2, 3, 4], [16, 8, 4, 2]) == pytest.approx(-1.0)


def test_symptom_score_ignores_unlogged_day():
    assert symptom_score({"sneezing": None, "congestion": None}) is None
    assert symptom_score({"sneezing": 2, "congestion": 3}) == 5


def _rows(n=14):
    rows = []
    start = dt.date(2026, 4, 1)
    for i in range(n):
        pollen = float(i % 7)
        rows.append(
            {
                "date": (start + dt.timedelta(days=i)).isoformat(),
                "pollen_index": pollen,
                "pollen_triggers": ["Ragweed"] if pollen > 3 else ["Oak"],
                "pm2_5": 5.0,
                "logged": True,
                "sneezing": int(pollen // 3),
                "runny_nose": int(pollen // 3),
                "congestion": int(pollen // 3),
                "itchy_eyes": 0,
                "throat": 0,
                "cough": 0,
                "headache": 0,
                "fatigue": 0,
                "outdoor_minutes": 30,
            }
        )
    return rows


def test_build_insights_finds_pollen_relationship():
    result = build_insights(_rows())
    assert result["enough_data"]
    pollen = next(c for c in result["correlations"] if c["metric"] == "pollen_index" and c["lag"] == 0)
    assert pollen["rho"] > 0.8
    ragweed = next(t for t in result["triggers"] if t["name"] == "Ragweed")
    assert ragweed["delta_vs_overall"] > 0
    assert any(s["month_name"] == "Apr" for s in result["seasonality"])
