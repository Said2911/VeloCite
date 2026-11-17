# scrapers/runner.py
# Orchestrates all scrapers — runs on schedule via Docker

import asyncio
import logging
import os
from datetime import datetime, timezone
import asyncpg

from analytics.scoring import recompute_all_scores
from scrapers.bina_az_scraper import BinaAzScraper

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
    BinaAzScraper: ["Baku", "Sumgait", "Ganja"],
}


async def run_all_scrapers():
    logger.info(f"🚀 Scraper run started at {datetime.now(timezone.utc).isoformat()}")

    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=5)

    total_stats = {"fetched": 0, "inserted": 0, "skipped": 0, "errors": 0}

    for ScraperClass, cities in SCRAPER_CITIES.items():
        scraper = ScraperClass(db_pool)
        stats = await scraper.run(cities)

        for key in total_stats:
            total_stats[key] += stats.get(key, 0)

    # New listings need value scores relative to their market
    try:
        await recompute_all_scores(db_pool)
    except Exception as e:
        logger.error(f"Score recompute failed: {e}")

    await db_pool.close()

    logger.info(f"✅ All scrapers done: {total_stats}")
    return total_stats


if __name__ == "__main__":
    asyncio.run(run_all_scrapers())