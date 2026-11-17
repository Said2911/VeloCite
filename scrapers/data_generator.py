# scrapers/data_generator.py
# Generates realistic demo listings for Azerbaijan (Baku districts + regional cities).
#
# Price ranges are in AZN per m² (sale) and AZN per m² per month (rent), based on
# public market reviews from 2025–2026 (Azerbaijan Chamber of Appraisers district
# ranges, m2map median for Baku ≈ 2,735 AZN/m², median rent ≈ 11 AZN/m²/month) and
# asking prices seen on listing sites. Regional cities without published statistics
# are rough estimates. Prices are stored in USD (AZN is pegged at 1.70 per USD).

import asyncio
import os
import random
import uuid
from datetime import datetime, timedelta, timezone

AZN_PER_USD = 1.70

# Each entry is one "market": a Baku district or a whole regional city.
MARKETS: list[dict] = [
    # ── Baku ──────────────────────────────────────────────────────────────────
    {"city": "Baku", "districts": ["Səbail"],    "lat": 40.3660, "lng": 49.8350, "spread": 0.012,
     "sale": (3500, 9000), "rent": (14, 30)},
    {"city": "Baku", "districts": ["Nəsimi"],    "lat": 40.3830, "lng": 49.8280, "spread": 0.012,
     "sale": (2400, 4800), "rent": (12, 24)},
    {"city": "Baku", "districts": ["Yasamal"],   "lat": 40.3870, "lng": 49.8030, "spread": 0.014,
     "sale": (2200, 4000), "rent": (11, 20)},
    {"city": "Baku", "districts": ["Nərimanov"], "lat": 40.4030, "lng": 49.8700, "spread": 0.014,
     "sale": (2500, 4000), "rent": (11, 20)},
    {"city": "Baku", "districts": ["Nizami"],    "lat": 40.3960, "lng": 49.9300, "spread": 0.012,
     "sale": (2500, 3100), "rent": (9, 15)},
    {"city": "Baku", "districts": ["Xətai"],     "lat": 40.3790, "lng": 49.9480, "spread": 0.016,
     "sale": (1800, 3400), "rent": (9, 16)},
    {"city": "Baku", "districts": ["Binəqədi"],  "lat": 40.4560, "lng": 49.8300, "spread": 0.020,
     "sale": (1550, 2950), "rent": (7, 12)},
    {"city": "Baku", "districts": ["Xəzər"],     "lat": 40.4880, "lng": 50.1400, "spread": 0.030,
     "sale": (1200, 2500), "rent": (6, 12)},
    {"city": "Baku", "districts": ["Sabunçu"],   "lat": 40.4420, "lng": 49.9480, "spread": 0.025,
     "sale": (1100, 2200), "rent": (6, 11)},
    {"city": "Baku", "districts": ["Suraxanı"],  "lat": 40.4180, "lng": 50.0050, "spread": 0.020,
     "sale": (1400, 2230), "rent": (6, 11)},
    {"city": "Baku", "districts": ["Qaradağ"],   "lat": 40.3200, "lng": 49.7300, "spread": 0.030,
     "sale": (1000, 2000), "rent": (5, 10)},
    # ── Regional cities ───────────────────────────────────────────────────────
    {"city": "Sumgait",     "districts": ["Mərkəz", "Bulvar", "9-cu mikrorayon", "17-ci mikrorayon"],
     "lat": 40.5897, "lng": 49.6686, "spread": 0.025, "sale": (1200, 2000), "rent": (5, 10)},
    {"city": "Ganja",       "districts": ["Kəpəz", "Nizami", "Mərkəz"],
     "lat": 40.6828, "lng": 46.3606, "spread": 0.030, "sale": (900, 1800), "rent": (4, 8)},
    {"city": "Mingachevir", "districts": ["Mərkəz", "Sahil", "QRES"],
     "lat": 40.7640, "lng": 47.0595, "spread": 0.020, "sale": (1000, 1900), "rent": (4, 8)},
    {"city": "Lankaran",    "districts": ["Mərkəz", "Sahil"],
     "lat": 38.7529, "lng": 48.8475, "spread": 0.020, "sale": (800, 1500), "rent": (3, 7)},
    {"city": "Shaki",       "districts": ["Mərkəz", "Yuxarı Baş"],
     "lat": 41.1919, "lng": 47.1706, "spread": 0.020, "sale": (800, 1500), "rent": (3, 7)},
    {"city": "Gabala",      "districts": ["Mərkəz", "Vəndam"],
     "lat": 40.9814, "lng": 47.8458, "spread": 0.030, "sale": (1000, 1900), "rent": (4, 9)},
    {"city": "Guba",        "districts": ["Mərkəz", "Qırmızı Qəsəbə"],
     "lat": 41.3600, "lng": 48.5134, "spread": 0.020, "sale": (800, 1500), "rent": (3, 7)},
]

CITIES = sorted({m["city"] for m in MARKETS})

# Apartments dominate; private houses (həyət evi) and villas (bağ evi) are rarer
PROPERTY_TYPES = ["apartment"] * 6 + ["house"] * 2 + ["villa"]


def random_coord(base: float, spread: float) -> float:
    return round(base + random.uniform(-spread, spread), 6)


def generate_listing(market: dict, listing_type: str) -> dict:
    property_type = random.choice(PROPERTY_TYPES)

    if property_type == "apartment":
        area = random.randint(30, 160)
    elif property_type == "house":
        area = random.randint(70, 260)
    else:  # villa
        area = random.randint(140, 450)

    low, high = market["sale"] if listing_type == "sale" else market["rent"]
    ppsqm = random.uniform(low, high)
    price_azn = round(ppsqm * area, -1 if listing_type == "rent" else -2)
    price_usd = round(price_azn / AZN_PER_USD, 2)

    rooms = max(1, min(6, area // 28 + random.randint(-1, 1)))
    bedrooms = max(0, rooms - 1)
    bathrooms = max(1, rooms // 2)

    # Placeholder until analytics/scoring.py recomputes it against the market
    value_score = round(10 * (1 - (ppsqm - low) / (high - low)), 1)
    value_score = max(0.5, min(9.9, value_score))
    market_position = "underpriced" if value_score >= 7 else "fair_value" if value_score >= 4 else "overpriced"

    listed_at = datetime.now(timezone.utc) - timedelta(days=random.randint(0, 90))

    return {
        "id": str(uuid.uuid4()),
        "external_id": f"gen_az_{uuid.uuid4().hex[:12]}",
        "source": "generated",
        "country_code": "AZ",
        "city": market["city"],
        "district": random.choice(market["districts"]),
        "lat": random_coord(market["lat"], market["spread"]),
        "lng": random_coord(market["lng"], market["spread"]),
        "property_type": property_type,
        "listing_type": listing_type,
        "price_usd": price_usd,
        "area_sqm": float(area),
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "floor": random.randint(1, 20) if property_type == "apartment" else None,
        "year_built": random.randint(1960, 2026),
        "value_score": value_score,
        "market_position": market_position,
        "listed_at": listed_at,
        "is_active": True,
    }


def generate_price_history(listing: dict, market_drift: float) -> list[tuple]:
    """
    Earlier asking prices for a sale listing. `market_drift` is the market's
    price change over 60 days (0.03 = +3%), so the 30-day trend has data.
    """
    now = datetime.now(timezone.utc)
    age_days = (now - listing["listed_at"]).days
    if listing["listing_type"] != "sale" or age_days < 10 or random.random() > 0.6:
        return []
    points = []
    for days_ago in sorted(random.sample(range(5, age_days), k=min(3, random.randint(1, 3), age_days - 5)), reverse=True):
        factor = 1 - market_drift * (days_ago / 60) + random.uniform(-0.015, 0.015)
        points.append((listing["id"], now - timedelta(days=days_ago), round(listing["price_usd"] * factor, 2)))
    return points


INSERT_LISTING_SQL = """
    INSERT INTO listings (
        id, external_id, source, country_code, city, district,
        property_type, listing_type, price_usd, area_sqm,
        bedrooms, bathrooms, floor, year_built,
        value_score, market_position, listed_at, is_active,
        location
    ) VALUES (
        $1::uuid, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17, $18,
        ST_MakePoint($20, $19)::geography
    )
    ON CONFLICT (external_id) DO NOTHING
"""

INSERT_HISTORY_SQL = """
    INSERT INTO price_history (listing_id, recorded_at, price_usd, currency_code)
    SELECT $1::uuid, $2, $3, 'USD'
    WHERE EXISTS (SELECT 1 FROM listings WHERE id = $1::uuid)
"""


async def generate_and_insert(count_per_market: int = 80, pool=None) -> int:
    """
    Insert `count_per_market` listings (half sale, half rent) for every Baku
    district and regional city, plus price history. Reuses `pool` if given.
    Returns the number of listings inserted.
    """
    own_pool = pool is None
    if own_pool:
        import asyncpg

        database_url = os.getenv("DATABASE_URL", "postgresql://velocite:velocite123@postgres:5432/velocite")
        pool = await asyncpg.create_pool(database_url, min_size=1, max_size=3)

    total = 0
    try:
        for market in MARKETS:
            listings = [
                generate_listing(market, listing_type)
                for listing_type in ("sale", "rent")
                for _ in range(count_per_market // 2)
            ]
            drift = random.uniform(-0.02, 0.06)
            history = [p for item in listings for p in generate_price_history(item, drift)]

            async with pool.acquire() as conn:
                async with conn.transaction():
                    before = await conn.fetchval("SELECT COUNT(*) FROM listings")
                    await conn.executemany(INSERT_LISTING_SQL, [
                        (
                            item["id"], item["external_id"], item["source"],
                            item["country_code"], item["city"], item["district"],
                            item["property_type"], item["listing_type"],
                            item["price_usd"], item["area_sqm"],
                            item["bedrooms"], item["bathrooms"], item["floor"], item["year_built"],
                            item["value_score"], item["market_position"],
                            item["listed_at"], item["is_active"],
                            item["lat"], item["lng"],
                        )
                        for item in listings
                    ])
                    if history:
                        await conn.executemany(INSERT_HISTORY_SQL, history)
                    inserted = await conn.fetchval("SELECT COUNT(*) FROM listings") - before

            total += inserted
            print(f"✅ {market['city']} / {', '.join(market['districts'][:2])}: {inserted} listings")
    finally:
        if own_pool:
            await pool.close()

    print(f"\n🎉 Total inserted: {total} listings in {len(CITIES)} cities")
    return total


if __name__ == "__main__":
    asyncio.run(generate_and_insert())
