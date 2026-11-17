# backend/services/ranking.py
# Relevance ranking. Uses the compiled C++ engine when available and an
# equivalent pure-Python implementation otherwise (same formula as
# cpp/search_engine.cpp), so "relevance" sorting always works.

import logging
import math
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

try:
    import real_estate_engine as _cpp  # built from cpp/search_engine.cpp

    _engine = _cpp.SearchEngine()
    CPP_AVAILABLE = True
except ImportError:  # pragma: no cover - depends on build environment
    _engine = None
    CPP_AVAILABLE = False
    logger.info("C++ engine not available — using Python ranking")

WEIGHTS = {"value_score": 0.40, "proximity": 0.25, "recency": 0.20, "completeness": 0.15}
DETAIL_FIELDS = ("district", "area_sqm", "bedrooms", "bathrooms", "floor", "year_built", "lat")


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def ranking_features(listing: dict, now: Optional[datetime] = None) -> dict:
    """Plain numeric features the ranking engine understands."""
    now = now or datetime.now(timezone.utc)
    listed_at = listing.get("listed_at")
    days = 30.0
    if isinstance(listed_at, datetime):
        if listed_at.tzinfo is None:
            listed_at = listed_at.replace(tzinfo=timezone.utc)
        days = max(0.0, (now - listed_at).total_seconds() / 86400)

    filled = sum(1 for f in DETAIL_FIELDS if listing.get(f) is not None)
    vs = listing.get("value_score")
    return {
        "id": str(listing["id"]),
        "lat": float(listing["lat"]) if listing.get("lat") is not None else None,
        "lng": float(listing["lng"]) if listing.get("lng") is not None else None,
        "value_score": float(vs) if vs is not None else None,
        "days_listed": days,
        "completeness": 10.0 * filled / len(DETAIL_FIELDS),
    }


def _python_rank(features: list[dict], lat: float, lng: float) -> list[tuple[str, float]]:
    results = []
    for f in features:
        vs = f["value_score"] if f["value_score"] is not None else 5.0
        proximity = 5.0
        if f["lat"] is not None and f["lng"] is not None:
            proximity = 10.0 / (1.0 + haversine_km(lat, lng, f["lat"], f["lng"]) * 0.1)
        recency = 10.0 * math.exp(-max(0.0, f["days_listed"]) / 30.0)
        score = (WEIGHTS["value_score"] * vs + WEIGHTS["proximity"] * proximity
                 + WEIGHTS["recency"] * recency + WEIGHTS["completeness"] * f["completeness"])
        results.append((f["id"], score))
    results.sort(key=lambda r: r[1], reverse=True)
    return results


def rank(listings: list[dict], lat: Optional[float], lng: Optional[float]) -> list[dict]:
    """
    Return `listings` sorted by relevance. Without a search centre, the
    centroid of the results is used so proximity still means "central".
    """
    if not listings:
        return listings

    features = [ranking_features(item) for item in listings]
    if lat is None or lng is None:
        points = [(f["lat"], f["lng"]) for f in features if f["lat"] is not None]
        if points:
            lat = sum(p[0] for p in points) / len(points)
            lng = sum(p[1] for p in points) / len(points)
        else:
            lat = lng = 0.0

    if CPP_AVAILABLE:
        try:
            ranked = _engine.rank_listings(features, lat, lng)
        except Exception as e:  # pragma: no cover
            logger.warning("C++ ranking failed (%s) — falling back to Python", e)
            ranked = _python_rank(features, lat, lng)
    else:
        ranked = _python_rank(features, lat, lng)

    order = {listing_id: i for i, (listing_id, _) in enumerate(ranked)}
    return sorted(listings, key=lambda item: order.get(str(item["id"]), len(order)))
