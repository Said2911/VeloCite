# scrapers/runner.py
# Orchestrates all scrapers — runs on schedule via Docker

import asyncio
import logging
import os
from datetime import datetime
import asyncpg

from scrapers.immowelt_scraper import ImmoweltScraper
from scrapers.bayut_scraper import BayutScraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://velocite:velocite123@postgres:5432/velocite"
)

# Which cities each scraper should cover
SCRAPER_CITIES = {
    ImmoweltScraper: ["Berlin", "Munich", "Hamburg", "Frankfurt", "Vienna"],
    BayutScraper:    ["Dubai", "Abu Dhabi"],
}


async def run_all_scrapers():
    logger.info(f"🚀 Scraper run started at {datetime.utcnow().isoformat()}")

    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=5)

    total_stats = {"fetched": 0, "inserted": 0, "skipped": 0, "errors": 0}

    for ScraperClass, cities in SCRAPER_CITIES.items():
        scraper = ScraperClass(db_pool)
        stats = await scraper.run(cities)

        for key in total_stats:
            total_stats[key] += stats.get(key, 0)

    await db_pool.close()

    logger.info(f"✅ All scrapers done: {total_stats}")
    return total_stats


if __name__ == "__main__":
    asyncio.run(run_all_scrapers())