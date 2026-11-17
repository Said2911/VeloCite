# tests/backend/test_search_query.py
# Search SQL building and SearchService flow (fake DB — no Postgres needed)

import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest

from backend.cache import Cache
from backend.models.listing import SearchParams
from backend.services.currency import FALLBACK_RATES
from backend.services.search import SearchService, build_where, market_summary_from_rows, row_to_listing


# ─── build_where / row_to_listing ─────────────────────────────────────────────

def test_minimal_where():
    where, args = build_where(SearchParams(), None, None)
    assert where == "is_active = TRUE AND listing_type = $1"
    assert args == ["sale"]


def test_placeholders_are_sequential_and_values_not_inlined():
    params = SearchParams(country_code="az", city="Bakı'; DROP TABLE listings;--", property_type="villa",
                          min_area=50, bedrooms=2, lat=40.41, lng=49.87, radius_km=10)
    where, args = build_where(params, 100000.0, 900000.0)
    for i in range(1, len(args) + 1):
        assert f"${i}" in where
    assert "DROP TABLE" not in where
    assert args[1] == "AZ"
    assert "%Bakı'; DROP TABLE listings;--%" in args
    assert args[-1] == 10_000  # radius in metres


def test_five_bedrooms_means_five_or_more():
    where, _ = build_where(SearchParams(bedrooms=5), None, None)
    assert "bedrooms >= $2" in where
    where, _ = build_where(SearchParams(bedrooms=2), None, None)
    assert "bedrooms = $2" in where


def test_geo_filter_needs_radius():
    where, _ = build_where(SearchParams(lat=40.4, lng=49.8), None, None)
    assert "ST_DWithin" not in where


def test_row_to_listing_converts_currency():
    row = {"id": "1", "price_usd": Decimal("1000"), "price_per_sqm": Decimal("10"), "city": "Baku"}
    out = row_to_listing(row, 1.7, "AZN", "₼")
    assert out["price_display"] == 1700.0
    assert out["price_per_sqm_display"] == 17.0
    assert out["currency_symbol"] == "₼"
    assert "price_per_sqm" not in out


# ─── SearchService with a fake asyncpg pool ───────────────────────────────────

def _row(i: int, score: float, days: int = 1) -> dict:
    return {
        "id": f"id-{i}", "country_code": "AZ", "city": "Baku", "district": "Yasamal", "address": None,
        "lat": 40.40 + i / 1000, "lng": 49.85, "property_type": "apartment", "listing_type": "sale",
        "price_usd": Decimal(100000 + i), "area_sqm": Decimal(80), "price_per_sqm": Decimal(1250),
        "bedrooms": 2, "bathrooms": 1, "floor": 5, "year_built": 2015,
        "value_score": Decimal(str(score)), "market_position": "fair_value",
        "source": "demo", "listed_at": datetime.now(timezone.utc) - timedelta(days=days),
    }


class FakeConn:
    def __init__(self, rows, total):
        self.rows, self.total, self.queries = rows, total, []

    async def fetchval(self, sql, *args):
        self.queries.append(sql)
        return self.total

    async def fetch(self, sql, *args):
        self.queries.append(sql)
        return self.rows


class FakePool:
    def __init__(self, conn):
        self.conn = conn

    def acquire(self):
        pool = self

        class _Ctx:
            async def __aenter__(self):
                return pool.conn

            async def __aexit__(self, *exc):
                return False
        return _Ctx()


@pytest.fixture
def offline_fx(monkeypatch):
    from backend.services.currency import CurrencyService

    async def boom(self):
        raise ConnectionError("offline")
    monkeypatch.setattr(CurrencyService, "_fetch_live_rates", boom)


def _search(conn, **params):
    service = SearchService(FakePool(conn), Cache(None))
    return asyncio.run(service.search(SearchParams(**params)))


def test_sql_pagination_uses_count_limit_offset(offline_fx):
    conn = FakeConn([_row(i, 5.0) for i in range(20)], total=137)
    res = _search(conn, page=3, page_size=20, sort="price_asc")

    assert conn.queries[0].startswith("SELECT COUNT(*) FROM listings WHERE")
    page_sql = conn.queries[1]
    assert "ORDER BY price_usd ASC, id" in page_sql
    assert "LIMIT 20 OFFSET 40" in page_sql
    assert res.total == 137
    assert res.total_pages == 7
    assert res.sort == "price_asc"
    assert len(res.listings) == 20


def test_display_currency_is_applied(offline_fx):
    conn = FakeConn([_row(0, 5.0)], total=1)
    res = _search(conn, currency="azn")
    listing = res.listings[0]
    assert listing.currency == "AZN" and listing.currency_symbol == "₼"
    assert listing.price_display == round(100000 * FALLBACK_RATES["AZN"], 2)
    assert listing.price_per_sqm_display == round(1250 * FALLBACK_RATES["AZN"], 2)


def test_price_filter_is_converted_to_usd(offline_fx):
    conn = FakeConn([], total=0)
    service = SearchService(FakePool(conn), Cache(None))
    seen = {}
    original = build_where

    import backend.services.search as search_module

    def spy(params, lo, hi):
        seen["lo"], seen["hi"] = lo, hi
        return original(params, lo, hi)
    search_module.build_where = spy
    try:
        asyncio.run(service.search(SearchParams(currency="AZN", min_price=170, max_price=340)))
    finally:
        search_module.build_where = original
    assert seen["lo"] == pytest.approx(100) and seen["hi"] == pytest.approx(200)


def test_empty_result(offline_fx):
    res = _search(FakeConn([], total=0))
    assert res.total == 0 and res.total_pages == 0 and res.listings == []


def test_relevance_ranks_then_paginates(offline_fx):
    rows = [_row(0, 2.0, days=60), _row(1, 9.0, days=0), _row(2, 5.0, days=10)]
    conn = FakeConn(rows, total=3)
    res = _search(conn, sort="relevance", page_size=2, lat=40.40, lng=49.85)

    assert "LIMIT 500" in conn.queries[1]
    assert "OFFSET" not in conn.queries[1]
    assert [item.id for item in res.listings] == ["id-1", "id-2"]
    assert res.total == 3 and res.total_pages == 2


def test_results_are_cached(offline_fx):
    conn = FakeConn([_row(0, 5.0)], total=1)
    service = SearchService(FakePool(conn), Cache(None))
    first = asyncio.run(service.search(SearchParams()))
    calls = len(conn.queries)
    second = asyncio.run(service.search(SearchParams()))
    assert len(conn.queries) == calls
    assert first == second


# ─── Market summary (Pandas) ──────────────────────────────────────────────────

def test_market_summary_from_rows_converts_currency():
    rows = [{"price_per_sqm": Decimal(p), "bedrooms": b}
            for p, b in [(1000, 1), (1500, 2), (2000, 2), (2500, 3), (3000, 3)]]
    summary = market_summary_from_rows(rows, 1.7, "AZN")
    assert summary.currency == "AZN"
    assert summary.median_price_sqm == 3400.0           # 2000 USD × 1.7
    assert summary.listings_analyzed == 5
    assert summary.bedroom_breakdown == {"1": 1700.0, "2": 2975.0, "3": 4675.0}
    d = summary.price_distribution
    assert d["p10"] <= d["p25"] <= d["p50"] <= d["p75"] <= d["p90"]


def test_market_summary_needs_three_listings():
    assert market_summary_from_rows([{"price_per_sqm": 1000, "bedrooms": 1}] * 2, 1.0, "USD") is None


def test_search_attaches_market_summary_for_whole_result_set(offline_fx):
    conn = FakeConn([_row(i, 5.0) for i in range(5)], total=5)
    res = _search(conn, currency="AZN", page_size=2)
    stats_sql = conn.queries[2]
    assert stats_sql.startswith("SELECT price_per_sqm, bedrooms FROM listings WHERE")
    assert "OFFSET" not in stats_sql
    assert res.market_summary is not None
    assert res.market_summary.currency == "AZN"
    assert res.market_summary.median_price_sqm == round(1250 * FALLBACK_RATES["AZN"], 2)


def test_no_market_summary_without_results(offline_fx):
    conn = FakeConn([], total=0)
    res = _search(conn)
    assert res.market_summary is None
    assert len(conn.queries) == 2  # no stats query when nothing matched


def test_district_filter_and_azn_default():
    params = SearchParams(city="Baku", district="Nəsimi")
    assert params.currency == "AZN"
    where, args = build_where(params, None, None)
    assert "district ILIKE $3" in where
    assert args[2] == "%Nəsimi%"
