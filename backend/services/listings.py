# backend/services/listings.py
# Listing details (comparables, market context, price history) and
# city / district market overviews.

import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from analytics.market_analyzer import MIN_DISTRICT_COMPARABLES, PRICE_TREND_SQL
from backend.models.listing import (
    DistrictOverview,
    ListingDetailResponse,
    MarketOverview,
    MarketsResponse,
    PricePoint,
)
from backend.services.currency import CurrencyService
from backend.services.search import (
    LISTING_COLUMNS,
    _num,
    market_summary_from_rows,
    row_to_listing,
)

MARKETS_CACHE_PREFIX = "markets:"
MARKETS_CACHE_TTL = 300


def parse_uuid(value: str) -> Optional[str]:
    try:
        return str(uuid.UUID(value))
    except (ValueError, AttributeError, TypeError):
        return None


def percentile_of(value: Optional[float], values: list[float]) -> Optional[float]:
    """Share (0–100) of `values` that are <= `value`; None with too little data."""
    if value is None or len(values) < 5:
        return None
    return round(100.0 * sum(1 for v in values if v <= value) / len(values), 1)


class ListingService:

    def __init__(self, db_pool, cache):
        self.db = db_pool
        self.cache = cache
        self.fx = CurrencyService(cache)

    async def get_detail(self, listing_id: str, currency: str = "AZN") -> Optional[ListingDetailResponse]:
        listing_uuid = parse_uuid(listing_id)
        if listing_uuid is None:
            return None

        currency = currency.upper()
        rate = await self.fx.get_rate("USD", currency)
        symbol = self.fx.get_symbol(currency)

        async with self.db.acquire() as conn:
            row = await conn.fetchrow(
                f"SELECT {LISTING_COLUMNS}, price_per_sqm AS ppsqm_usd FROM listings WHERE id = $1::uuid",
                listing_uuid,
            )
            if row is None:
                return None

            # Same segment as the value score: the district if it has enough
            # comparable listings, otherwise the whole city
            city_args = [row["country_code"], row["city"], row["property_type"], row["listing_type"]]
            city_where = (
                "is_active = TRUE AND country_code = $1 AND city = $2 "
                "AND property_type = $3 AND listing_type = $4"
            )
            where, args, segment = city_where, city_args, "city"
            if row["district"]:
                district_where = city_where + " AND district = $5"
                district_args = city_args + [row["district"]]
                n = await conn.fetchval(
                    f"SELECT COUNT(*) FROM listings WHERE {district_where} AND price_per_sqm IS NOT NULL",
                    *district_args,
                )
                if n >= MIN_DISTRICT_COMPARABLES:
                    where, args, segment = district_where, district_args, "district"

            segment_rows = await conn.fetch(
                f"SELECT price_per_sqm, bedrooms FROM listings WHERE {where} AND price_per_sqm IS NOT NULL",
                *args,
            )

            n_args = len(args)
            comparables = await conn.fetch(
                f"SELECT {LISTING_COLUMNS} FROM listings WHERE {where} AND id <> ${n_args + 1}::uuid "
                f"ORDER BY ABS(COALESCE(bedrooms, 0) - COALESCE(${n_args + 2}::int, 0)), "
                f"ABS(COALESCE(area_sqm, 0) - COALESCE(${n_args + 3}::numeric, 0)) LIMIT 6",
                *args, listing_uuid, row["bedrooms"], row["area_sqm"],
            )

            history = await conn.fetch(
                "SELECT recorded_at, price_usd FROM price_history WHERE listing_id = $1::uuid "
                "ORDER BY recorded_at",
                listing_uuid,
            )

        listing = row_to_listing(row, rate, currency, symbol)
        listing.pop("ppsqm_usd", None)

        price_history = [
            PricePoint(date=h["recorded_at"], price_display=round(_num(h["price_usd"]) * rate, 2))
            for h in history
        ]
        if price_history:
            # today's asking price closes the series
            price_history.append(PricePoint(date=datetime.now(timezone.utc), price_display=listing["price_display"]))

        return ListingDetailResponse(
            listing=listing,
            segment=segment,
            percentile=percentile_of(_num(row["ppsqm_usd"]), [_num(r["price_per_sqm"]) for r in segment_rows]),
            market=market_summary_from_rows(segment_rows, rate, currency),
            comparables=[row_to_listing(c, rate, currency, symbol) for c in comparables],
            price_history=price_history,
        )

    async def get_by_ids(self, ids: list[str], currency: str = "AZN") -> list[dict]:
        """Fetch listings by id, preserving the given order (used for favorites)."""
        if not ids:
            return []
        currency = currency.upper()
        rate = await self.fx.get_rate("USD", currency)
        symbol = self.fx.get_symbol(currency)
        async with self.db.acquire() as conn:
            rows = await conn.fetch(f"SELECT {LISTING_COLUMNS} FROM listings WHERE id = ANY($1::uuid[])", ids)
        by_id = {r["id"]: row_to_listing(r, rate, currency, symbol) for r in rows}
        return [by_id[i] for i in ids if i in by_id]

    async def markets(self, currency: str = "AZN") -> MarketsResponse:
        currency = currency.upper()
        cache_key = f"{MARKETS_CACHE_PREFIX}{currency}"
        cached = await self.cache.get(cache_key)
        if cached:
            return MarketsResponse.model_validate(json.loads(cached))

        rate = await self.fx.get_rate("USD", currency)
        stats = """
            COUNT(*) AS listings,
            COUNT(*) FILTER (WHERE listing_type = 'sale') AS sale_listings,
            COUNT(*) FILTER (WHERE listing_type = 'rent') AS rent_listings,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_per_sqm)
                FILTER (WHERE listing_type = 'sale') AS median_sale,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_per_sqm)
                FILTER (WHERE listing_type = 'rent') AS median_rent
        """
        async with self.db.acquire() as conn:
            cities = await conn.fetch(f"""
                SELECT country_code, city,
                       AVG(ST_Y(location::geometry)) AS lat, AVG(ST_X(location::geometry)) AS lng,
                       AVG(value_score) AS avg_value_score, {stats}
                FROM listings WHERE is_active = TRUE
                GROUP BY country_code, city
                ORDER BY COUNT(*) DESC, city
            """)
            districts = await conn.fetch(f"""
                SELECT country_code, city, district, {stats}
                FROM listings WHERE is_active = TRUE AND district IS NOT NULL
                GROUP BY country_code, city, district
                ORDER BY COUNT(*) DESC, district
            """)
            trends = await conn.fetch(
                PRICE_TREND_SQL.replace("SELECT AVG", "SELECT l.country_code, l.city, AVG")
                + " WHERE l.listing_type = 'sale' GROUP BY l.country_code, l.city"
            )

        def money(value):
            return round(_num(value) * rate, 2) if value is not None else None

        trend_map = {
            (t["country_code"], t["city"]): round(_num(t["trend"]), 2)
            for t in trends if t["trend"] is not None
        }
        district_map: dict[tuple, list[DistrictOverview]] = {}
        for d in districts:
            district_map.setdefault((d["country_code"], d["city"]), []).append(DistrictOverview(
                district=d["district"],
                listings=d["listings"],
                median_sale_price_sqm=money(d["median_sale"]),
                median_rent_price_sqm=money(d["median_rent"]),
            ))

        markets = [
            MarketOverview(
                country_code=c["country_code"],
                city=c["city"],
                lat=_num(c["lat"]),
                lng=_num(c["lng"]),
                listings=c["listings"],
                sale_listings=c["sale_listings"],
                rent_listings=c["rent_listings"],
                median_sale_price_sqm=money(c["median_sale"]),
                median_rent_price_sqm=money(c["median_rent"]),
                avg_value_score=round(_num(c["avg_value_score"]), 2) if c["avg_value_score"] is not None else None,
                price_trend_30d=trend_map.get((c["country_code"], c["city"])),
                currency=currency,
                districts=district_map.get((c["country_code"], c["city"]), []),
            )
            for c in cities
        ]
        response = MarketsResponse(
            total_listings=sum(m.listings for m in markets),
            total_cities=len(markets),
            total_districts=sum(len(m.districts) for m in markets),
            currency=currency,
            markets=markets,
        )
        await self.cache.setex(cache_key, MARKETS_CACHE_TTL, response.model_dump_json())
        return response
