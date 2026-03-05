# scrapers/data_generator.py
# Generates realistic property listings based on real market prices
# Used for demo and development — produces 1000+ listings across 15 cities

import asyncio
import asyncpg
import random
import uuid
import os
from datetime import datetime, timedelta

# Real market data (price per sqm in USD, 2024)
CITY_MARKET_DATA = {
    "Berlin":      {"country": "DE", "lat": 52.5200, "lng": 13.4050, "currency": "EUR",
                    "sale_ppsqm": (4000, 9000),  "rent_ppsqm": (12, 28),
                    "districts": ["Mitte", "Prenzlauer Berg", "Kreuzberg", "Charlottenburg", "Friedrichshain", "Neukölln"]},
    "Munich":      {"country": "DE", "lat": 48.1351, "lng": 11.5820, "currency": "EUR",
                    "sale_ppsqm": (8000, 16000), "rent_ppsqm": (18, 38),
                    "districts": ["Maxvorstadt", "Schwabing", "Bogenhausen", "Sendling", "Pasing"]},
    "Hamburg":     {"country": "DE", "lat": 53.5511, "lng": 9.9937,  "currency": "EUR",
                    "sale_ppsqm": (5000, 11000), "rent_ppsqm": (14, 30),
                    "districts": ["Altona", "Eimsbüttel", "Harburg", "Wandsbek", "Bergedorf"]},
    "Paris":       {"country": "FR", "lat": 48.8566, "lng": 2.3522,  "currency": "EUR",
                    "sale_ppsqm": (9000, 18000), "rent_ppsqm": (25, 50),
                    "districts": ["Le Marais", "Montmartre", "Saint-Germain", "Bastille", "Oberkampf"]},
    "Barcelona":   {"country": "ES", "lat": 41.3851, "lng": 2.1734,  "currency": "EUR",
                    "sale_ppsqm": (4000, 10000), "rent_ppsqm": (14, 28),
                    "districts": ["Eixample", "Gràcia", "Barceloneta", "Poblenou", "Sarrià"]},
    "Madrid":      {"country": "ES", "lat": 40.4168, "lng": -3.7038, "currency": "EUR",
                    "sale_ppsqm": (3500, 9000),  "rent_ppsqm": (12, 26),
                    "districts": ["Salamanca", "Chamberí", "Retiro", "Malasaña", "Lavapiés"]},
    "Dubai":       {"country": "AE", "lat": 25.2048, "lng": 55.2708, "currency": "AED",
                    "sale_ppsqm": (3000, 12000), "rent_ppsqm": (80, 250),
                    "districts": ["Downtown", "Marina", "JBR", "Business Bay", "Palm Jumeirah", "DIFC"]},
    "Abu Dhabi":   {"country": "AE", "lat": 24.4539, "lng": 54.3773, "currency": "AED",
                    "sale_ppsqm": (2000, 8000),  "rent_ppsqm": (60, 180),
                    "districts": ["Corniche", "Al Reem", "Yas Island", "Saadiyat", "Al Khalidiyah"]},
    "New York":    {"country": "US", "lat": 40.7128, "lng": -74.0060, "currency": "USD",
                    "sale_ppsqm": (10000, 25000),"rent_ppsqm": (40, 100),
                    "districts": ["Manhattan", "Brooklyn", "Queens", "Bronx", "Hoboken"]},
    "Los Angeles": {"country": "US", "lat": 34.0522, "lng": -118.2437,"currency": "USD",
                    "sale_ppsqm": (6000, 18000), "rent_ppsqm": (25, 65),
                    "districts": ["Beverly Hills", "Santa Monica", "Venice", "Silver Lake", "Koreatown"]},
    "Tokyo":       {"country": "JP", "lat": 35.6762, "lng": 139.6503, "currency": "JPY",
                    "sale_ppsqm": (600000, 1800000), "rent_ppsqm": (2000, 6000),
                    "districts": ["Shibuya", "Shinjuku", "Minato", "Chiyoda", "Roppongi"]},
    "Singapore":   {"country": "SG", "lat": 1.3521,  "lng": 103.8198, "currency": "SGD",
                    "sale_ppsqm": (12000, 30000), "rent_ppsqm": (40, 100),
                    "districts": ["Orchard", "Marina Bay", "Bukit Timah", "Sentosa", "Tanjong Pagar"]},
    "Amsterdam":   {"country": "NL", "lat": 52.3676, "lng": 4.9041,  "currency": "EUR",
                    "sale_ppsqm": (6000, 14000), "rent_ppsqm": (20, 45),
                    "districts": ["Jordaan", "De Pijp", "Oud-West", "Centrum", "Oost"]},
    "Lisbon":      {"country": "PT", "lat": 38.7169, "lng": -9.1399, "currency": "EUR",
                    "sale_ppsqm": (3500, 9000),  "rent_ppsqm": (12, 28),
                    "districts": ["Alfama", "Chiado", "Baixa", "Belém", "Mouraria"]},
    "Istanbul":    {"country": "TR", "lat": 41.0082, "lng": 28.9784, "currency": "USD",
                    "sale_ppsqm": (1500, 6000),  "rent_ppsqm": (8, 25),
                    "districts": ["Beyoğlu", "Kadıköy", "Beşiktaş", "Şişli", "Üsküdar"]},
}

PROPERTY_TYPES = ["apartment", "apartment", "apartment", "house", "villa"]
CURRENCY_TO_USD = {
    "EUR": 1.08, "AED": 0.272, "USD": 1.0,
    "JPY": 0.0067, "SGD": 0.74,
}


def random_coord(base: float, spread: float = 0.08) -> float:
    return round(base + random.uniform(-spread, spread), 6)


def generate_listing(city: str, market: dict, listing_type: str) -> dict:
    property_type = random.choice(PROPERTY_TYPES)

    # Area based on property type
    if property_type == "apartment":
        area = random.randint(35, 150)
    elif property_type == "house":
        area = random.randint(80, 300)
    else:  # villa
        area = random.randint(150, 500)

    # Price per sqm with some variance
    if listing_type == "sale":
        ppsqm_range = market["sale_ppsqm"]
    else:
        ppsqm_range = market["rent_ppsqm"]

    ppsqm = random.uniform(*ppsqm_range)
    price = round(ppsqm * area)

    # Convert to USD
    currency = market["currency"]
    rate = CURRENCY_TO_USD.get(currency, 1.0)
    price_usd = round(price * rate, 2)

    bedrooms = max(0, min(6, area // 30 + random.randint(-1, 1)))
    bathrooms = max(1, bedrooms - random.randint(0, 1))

    district = random.choice(market["districts"])

    # Value score — cheaper = higher score
    mid_ppsqm = (ppsqm_range[0] + ppsqm_range[1]) / 2
    value_score = round(10 * (1 - (ppsqm - ppsqm_range[0]) / (ppsqm_range[1] - ppsqm_range[0])), 1)
    value_score = max(0.5, min(9.9, value_score + random.uniform(-0.5, 0.5)))

    if value_score >= 7:
        market_position = "underpriced"
    elif value_score >= 4:
        market_position = "fair_value"
    else:
        market_position = "overpriced"

    listed_days_ago = random.randint(0, 90)
    listed_at = datetime.utcnow() - timedelta(days=listed_days_ago)

    return {
        "id": str(uuid.uuid4()),
        "external_id": f"gen_{city.lower().replace(' ', '_')}_{uuid.uuid4().hex[:8]}",
        "source": "generated",
        "country_code": market["country"],
        "city": city,
        "district": district,
        "lat": random_coord(market["lat"]),
        "lng": random_coord(market["lng"]),
        "property_type": property_type,
        "listing_type": listing_type,
        "price_usd": price_usd,
        "area_sqm": float(area),
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "floor": random.randint(0, 20) if property_type == "apartment" else None,
        "year_built": random.randint(1960, 2024),
        "value_score": value_score,
        "market_position": market_position,
        "listed_at": listed_at,
        "is_active": True,
    }


async def generate_and_insert(count_per_city: int = 80):
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://velocite:velocite123@postgres:5432/velocite"
    )

    db = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=5)
    total = 0

    for city, market in CITY_MARKET_DATA.items():
        city_count = 0
        for listing_type in ["sale", "rent"]:
            for _ in range(count_per_city // 2):
                listing = generate_listing(city, market, listing_type)
                try:
                    await db.execute("""
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
                    """,
                        listing["id"], listing["external_id"], listing["source"],
                        listing["country_code"], listing["city"], listing["district"],
                        listing["property_type"], listing["listing_type"],
                        listing["price_usd"], listing["area_sqm"],
                        listing["bedrooms"], listing["bathrooms"],
                        listing["floor"], listing["year_built"],
                        listing["value_score"], listing["market_position"],
                        listing["listed_at"], listing["is_active"],
                        listing["lat"], listing["lng"]
                    )
                    city_count += 1
                    total += 1
                except Exception as e:
                    print(f"Error inserting {city}: {e}")

        print(f"✅ {city}: {city_count} listings inserted")

    await db.close()
    print(f"\n🎉 Total inserted: {total} listings across {len(CITY_MARKET_DATA)} cities")


if __name__ == "__main__":
    asyncio.run(generate_and_insert(count_per_city=80))