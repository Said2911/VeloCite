# backend/services/search.py
# Core search logic — connects DB, C++ engine, and currency service

import hashlib
import json
from typing import Optional

import asyncpg

from backend.config import settings
from backend.models.listing import SearchParams, SearchResponse
from backend.services.currency import CurrencyService

try:
    import real_estate_engine as cpp_engine
    search_engine = cpp_engine.SearchEngine()
    CPP_AVAILABLE = True
except ImportError:
    CPP_AVAILABLE = False
    print("⚠️ C++ engine not available, skipping ranking")


class SearchService:

    def __init__(self, db_pool: asyncpg.Pool, cache):
        self.db = db_pool
        self.cache = cache  # backend.cache.Cache (Redis or in-memory)
        self.fx = CurrencyService(cache)

    async def search(self, params: SearchParams) -> SearchResponse:
        """Main search method — query DB, rank with C++, convert currency."""

        # ── Cache check ───────────────────────────────────────────────────────
        cache_key = f"search:{hashlib.md5(params.model_dump_json().encode()).hexdigest()}"
        cached = await self.cache.get(cache_key)
        if cached:
            return SearchResponse(**json.loads(cached))

        # ── Convert price filters to USD ──────────────────────────────────────
        min_price_usd = None
        max_price_usd = None
        if params.min_price and params.currency != "USD":
            min_price_usd = await self.fx.to_usd(params.min_price, params.currency)
        if params.max_price and params.currency != "USD":
            max_price_usd = await self.fx.to_usd(params.max_price, params.currency)

        # ── Build dynamic SQL ─────────────────────────────────────────────────
        conditions = ["is_active = TRUE", "listing_type = $1"]
        query_params = [params.listing_type]
        i = 2

        if params.country_code:
            conditions.append(f"country_code = ${i}")
            query_params.append(params.country_code.upper())
            i += 1
        if params.city:
            conditions.append(f"city ILIKE ${i}")
            query_params.append(f"%{params.city}%")
            i += 1
        if params.property_type:
            conditions.append(f"property_type = ${i}")
            query_params.append(params.property_type)
            i += 1
        if min_price_usd or params.min_price:
            conditions.append(f"price_usd >= ${i}")
            query_params.append(min_price_usd or params.min_price)
            i += 1
        if max_price_usd or params.max_price:
            conditions.append(f"price_usd <= ${i}")
            query_params.append(max_price_usd or params.max_price)
            i += 1
        if params.min_area:
            conditions.append(f"area_sqm >= ${i}")
            query_params.append(params.min_area)
            i += 1
        if params.max_area:
            conditions.append(f"area_sqm <= ${i}")
            query_params.append(params.max_area)
            i += 1
        if params.bedrooms is not None:
            conditions.append(f"bedrooms = ${i}")
            query_params.append(params.bedrooms)
            i += 1

        # Geo radius filter
        if params.lat and params.lng and params.radius_km:
            conditions.append(
                f"ST_DWithin(location, "
                f"ST_MakePoint(${i}, ${i+1})::geography, ${i+2})"
            )
            query_params.extend([params.lng, params.lat, params.radius_km * 1000])
            i += 3

        where_clause = " AND ".join(conditions)

        sql = f"""
            SELECT
                id::text, country_code, city, district, address,
                ST_Y(location::geometry) as lat,
                ST_X(location::geometry) as lng,
                property_type, listing_type,
                price_usd, area_sqm, price_per_sqm,
                bedrooms, bathrooms, floor, year_built,
                value_score, market_position,
                listed_at
            FROM listings
            WHERE {where_clause}
            LIMIT {settings.MAX_SEARCH_RESULTS}
        """

        # ── Query database ────────────────────────────────────────────────────
        async with self.db.acquire() as conn:
            rows = await conn.fetch(sql, *query_params)

        if not rows:
            return SearchResponse(
                listings=[], total=0, page=params.page,
                page_size=params.page_size, market_summary=None
            )

        listings = [dict(r) for r in rows]

        # ── C++ ranking ───────────────────────────────────────────────────────
        if CPP_AVAILABLE and params.lat and params.lng:
            ranked = search_engine.rank_listings(
                listings, params.lat, params.lng
            )
            score_map = {r[0]: r[1] for r in ranked}
            listings.sort(
                key=lambda x: score_map.get(x['id'], 0), reverse=True
            )

        # ── Currency conversion ───────────────────────────────────────────────
        rate = await self.fx.get_rate("USD", params.currency)
        symbol = self.fx.get_symbol(params.currency)

        for listing in listings:
            listing['price_display'] = round(float(listing['price_usd']) * rate, 2)
            listing['price_per_sqm_display'] = round(
                float(listing.get('price_per_sqm') or 0) * rate, 2
            )
            listing['currency'] = params.currency
            listing['currency_symbol'] = symbol

        # ── Paginate ──────────────────────────────────────────────────────────
        total = len(listings)
        start = (params.page - 1) * params.page_size
        page_listings = listings[start:start + params.page_size]

        response = SearchResponse(
            listings=page_listings,
            total=total,
            page=params.page,
            page_size=params.page_size,
            market_summary=None  # Added in Phase 4 by Pandas
        )

        # Cache for 5 minutes
        await self.cache.setex(
            cache_key, 300,
            response.model_dump_json()
        )

        return response