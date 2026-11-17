# tests/backend/test_ranking.py
# Relevance ranking (pure-Python path; mirrors cpp/search_engine.cpp)

from datetime import datetime, timedelta, timezone

from backend.services import ranking


def _listing(id_, lat, lng, score, days=1):
    return {"id": id_, "lat": lat, "lng": lng, "value_score": score,
            "listed_at": datetime.now(timezone.utc) - timedelta(days=days)}


def test_python_rank_prefers_value_and_proximity():
    listings = [
        _listing("ganja-bad", 40.68, 46.36, 2.0),     # ~300 km from Baku
        _listing("baku-good", 40.409, 49.867, 9.0),
        _listing("baku-bad", 40.410, 49.880, 2.0),
    ]
    order = [item["id"] for item in ranking.rank(listings, 40.409, 49.867)]
    assert order[0] == "baku-good"
    assert order[-1] == "ganja-bad"


def test_recency_breaks_ties():
    listings = [_listing("old", 40.4, 49.8, 5.0, days=90), _listing("new", 40.4, 49.8, 5.0, days=0)]
    assert [item["id"] for item in ranking.rank(listings, 40.4, 49.8)] == ["new", "old"]


def test_rank_handles_missing_values():
    listings = [{"id": "a", "lat": None, "lng": None, "value_score": None}, _listing("b", 40.4, 49.8, 5)]
    assert {item["id"] for item in ranking.rank(listings, None, None)} == {"a", "b"}


def test_rank_empty():
    assert ranking.rank([], None, None) == []
