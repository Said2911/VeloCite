# scrapers/base_scraper.py
# Base class for all VeloCite scrapers

import asyncio
import hashlib
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
import httpx
import asyncpg

logger = logging.getLogger(__name__)


@dataclass
class RawListing:
    """Normalized listing data before DB insertion."""
    external_id: str
    source: str
    country_code: str
    city: str
    district: Optional[str]
    address: Optional[str]
    lat: Optional[float]
    lng: Optional[float]
    property_type: str       # apartment, house, villa, commercial
    listing_type: str        # sale, rent
    price: float
    currency: str
    area_sqm: Optional[float]
    bedrooms: Optional[int]
    bathrooms: Optional[int]
    floor: Optional[int]
    year_built: Optional[int]
    description: Optional[str]
    url: Optional[str]


class BaseScraper(ABC):
    """
    Abstract base class for all property scrapers.
    Handles DB connection, deduplication, and rate limiting.
    """

    SOURCE_NAME = "base"
    REQUEST_DELAY = 2.0   # seconds between requests (be polite)
    MAX_RETRIES = 3

    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; VeloCiteBot/1.0)"
            }
        )
        self.stats = {"fetched": 0, "inserted": 0, "skipped": 0, "errors": 0}

    @abstractmethod
    async def fetch_listings(self, city: str, **kwargs) -> list[RawListing]:
        """Fetch listings from the source. Must be implemented by subclass."""
        pass

    async def run(self, cities: list[str]) -> dict:
        """Run scraper for all cities and save to DB."""
        logger.info(f"Starting {self.SOURCE_NAME} scraper for {len(cities)} cities")

        for city in cities:
            try:
                listings = await self.fetch_listings(city)
                self.stats["fetched"] += len(listings)

                for listing in listings:
                    await self._save_listing(listing)
                    await asyncio.sleep(0.1)  # small delay between inserts

                await asyncio.sleep(self.REQUEST_DELAY)

            except Exception as e:
                logger.error(f"Error scraping {city}: {e}")
                self.stats["errors"] += 1

        await self.client.aclose()
        logger.info(f"{self.SOURCE_NAME} done: {self.stats}")
        return self.stats

    async def _save_listing(self, listing: RawListing):
        """Insert listing into DB, skip if already exists."""
        try:
            async with self.db.acquire() as conn:
                # Check if already exists
                exists = await conn.fetchval(
                    "SELECT id FROM listings WHERE external_id = $1",
                    listing.external_id
                )
                if exists:
                    self.stats["skipped"] += 1
                    return

                # Convert price to USD
                price_usd = await self._convert_to_usd(
                    listing.price, listing.currency
                )

                await conn.execute("""
                    INSERT INTO listings (
                        external_id, source, country_code, city, district,
                        address, property_type, listing_type,
                        price_usd, area_sqm, bedrooms, bathrooms,
                        floor, year_built, url, is_active, listed_at,
                        location
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8,
                        $9, $10, $11, $12, $13, $14, $15,
                        TRUE, NOW(),
                        CASE WHEN $16 IS NOT NULL AND $17 IS NOT NULL
                             THEN ST_MakePoint($17, $16)::geography
                             ELSE NULL END
                    )
                """,
                    listing.external_id, listing.source,
                    listing.country_code, listing.city, listing.district,
                    listing.address, listing.property_type, listing.listing_type,
                    price_usd, listing.area_sqm, listing.bedrooms,
                    listing.bathrooms, listing.floor, listing.year_built,
                    listing.url, listing.lat, listing.lng
                )
                self.stats["inserted"] += 1

        except Exception as e:
            logger.error(f"Error saving listing {listing.external_id}: {e}")
            self.stats["errors"] += 1

    async def _convert_to_usd(self, price: float, currency: str) -> float:
        """Simple currency conversion using fixed rates as fallback."""
        if currency == "USD":
            return price

        # Fallback rates (updated periodically)
        RATES_TO_USD = {
            "EUR": 1.08, "GBP": 1.27, "AED": 0.272,
            "JPY": 0.0067, "CHF": 1.13, "AUD": 0.65,
            "CAD": 0.74, "SGD": 0.74, "INR": 0.012,
            "TRY": 0.031, "BRL": 0.20, "MXN": 0.058,
        }
        rate = RATES_TO_USD.get(currency, 1.0)
        return round(price * rate, 2)

    def _make_external_id(self, source: str, raw_id: str) -> str:
        """Create consistent external ID."""
        return f"{source}_{raw_id}"