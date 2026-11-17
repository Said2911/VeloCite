# backend/services/search.py
# Core search logic — connects DB, ranking engine, analytics and currency service

import hashlib
import math
from decimal import Decimal
from typing import Any, Optional

import pandas as pd

from analytics.market_analyzer import build_market_report
from backend.config import settings
from backend.models.listing import MarketSummary, SearchParams, SearchResponse
from backend.services import ranking
from backend.services.currency import CurrencyService

SEARCH_CACHE_PREFIX = "search:"

LISTING_COLUMNS = """
    id::text AS id, country_code, city, district, address,
    ST_Y(location::geometry) AS lat,
    ST_X(location::geometry) AS lng,
    property_type, listing_type,
    price_usd, area_sqm, price_per_sqm,
    bedrooms, bathrooms, floor, year_built,
    value_score, market_position,
    source, url, description, listed_at
"""

SORT_SQL = {
    "value": "value_score DESC NULLS LAST, listed_at DESC",
    "price_asc": "price_usd ASC",
    "price_desc": "price_usd DESC",
    "newest": "listed_at DESC",
    "area_desc": "area_sqm DESC NULLS LAST",
    "ppsqm_asc": "price_per_sqm ASC NULLS LAST",
    # "relevance" is ranked in C++/Python after fetching the best candidates
    "relevance": "value_score DESC NULLS LAST, listed_at DESC",
}


def _num(value: Any) -> Any:
    """asyncpg returns DECIMAL as Decimal — convert to float for JSON/math."""
    return float(value) if isinstance(value, Decimal) else value


def build_where(
    params: SearchParams,
    min_price_usd: Optional[float],
    max_price_usd: Optional[float],
) -> tuple[str, list]:
    """Build a parameterised WHERE clause (values are never interpolated)."""
    conditions = ["is_active = TRUE", "listing_type = $1"]
    args: list = [params.listing_type]

    def add(sql_template: str, *values) -> None:
        start = len(args) + 1
        placeholders = [f"${start + i}" for i in range(len(values))]
        conditions.append(sql_template.format(*placeholders))
        args.extend(values)

    if params.country_code:
        add("country_code = {}", params.country_code.upper())
    if params.city:
        add("city ILIKE {}", f"%{params.city.strip()}%")
    if params.property_type:
        add("property_type = {}", params.property_type)
    if min_price_usd is not None:
        add("price_usd >= {}", min_price_usd)
    if max_price_usd is not None:
        add("price_usd <= {}", max_price_usd)
    if params.min_area is not None:
        add("area_sqm >= {}", params.min_area)
    if params.max_area is not None:
        add("area_sqm <= {}", params.max_area)
    if params.bedrooms is not None:
        # "5" in the UI means "5 or more"
        if params.bedrooms >= 5:
            add("bedrooms >= {}", params.bedrooms)
        else:
            add("bedrooms = {}", params.bedrooms)
    if params.lat is not None and params.lng is not None and params.radius_km:
        add("ST_DWithin(location, ST_MakePoint({}, {})::geography, {})",
            params.lng, params.lat, params.radius_km * 1000)

    return " AND ".join(conditions), args


def row_to_listing(row: Any, rate: float, currency: str, symbol: str) -> dict:
    """Convert a DB row into the ListingResponse shape, in the display currency."""
    listing = {k: _num(v) for k, v in dict(row).items()}
    price_usd = listing.get("price_usd") or 0.0
    ppsqm = listing.get("price_per_sqm")
    listing["price_display"] = round(price_usd * rate, 2)
    listing["price_per_sqm_display"] = round(ppsqm * rate, 2) if ppsqm is not None else None
    listing["currency"] = currency
    listing["currency_symbol"] = symbol
    listing.pop("price_per_sqm", None)
    return listing


def market_summary_from_rows(rows: list, rate: float, currency: str) -> Optional[MarketSummary]:
    """Run the Pandas market report and convert it to the display currency."""
    if len(rows) < 3:
        return None
    df = pd.DataFrame([{k: _num(v) for k, v in dict(r).items()} for r in rows])
    report = build_market_report(df)
    if not report:
        return None
    return MarketSummary(
        currency=currency,
        median_price_sqm=round(report["median_price_sqm"] * rate, 2),
        avg_price_sqm=round(report["avg_price_sqm"] * rate, 2),
        listings_analyzed=report["listings_analyzed"],
        price_distribution={k: round(v * rate, 2) for k, v in report["price_distribution"].items()},
        bedroom_breakdown={k: round(v * rate, 2) for k, v in report["bedroom_breakdown"].items()},
    )


class SearchService:

    def __init__(self, db_pool, cache):
        self.db = db_pool
        self.cache = cache  # backend.cache.Cache (Redis or in-memory)
        self.fx = CurrencyService(cache)

    async def search(self, params: SearchParams) -> SearchResponse:
        """Query DB (filter, sort, paginate), rank, add market summary, convert currency."""
        params = params.model_copy(update={"currency": params.currency.upper()})

        cache_key = SEARCH_CACHE_PREFIX + hashlib.md5(params.model_dump_json().encode()).hexdigest()
        cached = await self.cache.get(cache_key)
        if cached:
            return SearchResponse.model_validate_json(cached)

        # Price filters arrive in the display currency; the DB stores USD
        min_price_usd = await self.fx.to_usd(params.min_price, params.currency) if params.min_price else None
        max_price_usd = await self.fx.to_usd(params.max_price, params.currency) if params.max_price else None

        where, args = build_where(params, min_price_usd, max_price_usd)
        rate = await self.fx.get_rate("USD", params.currency)
        symbol = self.fx.get_symbol(params.currency)
        offset = (params.page - 1) * params.page_size

        async with self.db.acquire() as conn:
            total = await conn.fetchval(f"SELECT COUNT(*) FROM listings WHERE {where}", *args)

            if params.sort == "relevance":
                # Rank the best candidates with the C++/Python engine, then paginate
                rows = await conn.fetch(
                    f"SELECT {LISTING_COLUMNS} FROM listings WHERE {where} "
                    f"ORDER BY {SORT_SQL['relevance']} LIMIT {settings.MAX_SEARCH_RESULTS}",
                    *args,
                )
                ranked = ranking.rank([dict(r) for r in rows], params.lat, params.lng)
                total = min(total, len(ranked))
                page_rows = ranked[offset:offset + params.page_size]
            else:
                # `id` as a tie-breaker keeps pages stable
                page_rows = await conn.fetch(
                    f"SELECT {LISTING_COLUMNS} FROM listings WHERE {where} "
                    f"ORDER BY {SORT_SQL[params.sort]}, id "
                    f"LIMIT {params.page_size} OFFSET {offset}",
                    *args,
                )

            # Market context for the whole result set, not just this page
            stats_rows = await conn.fetch(
                f"SELECT price_per_sqm, bedrooms FROM listings WHERE {where} "
                f"AND price_per_sqm IS NOT NULL LIMIT 5000",
                *args,
            ) if total else []

        response = SearchResponse(
            listings=[row_to_listing(r, rate, params.currency, symbol) for r in page_rows],
            total=total,
            page=params.page,
            page_size=params.page_size,
            total_pages=math.ceil(total / params.page_size),
            sort=params.sort,
            market_summary=market_summary_from_rows(stats_rows, rate, params.currency),
        )

        await self.cache.setex(cache_key, settings.SEARCH_CACHE_TTL, response.model_dump_json())
        return response
