# scrapers/scheduler.py
# Runs scrapers every 6 hours via APScheduler

import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from scrapers.runner import run_all_scrapers

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main():
    scheduler = AsyncIOScheduler()

    # Run immediately on startup
    await run_all_scrapers()

    # Then every 6 hours
    # AsyncIOScheduler awaits coroutine functions on the running loop
    scheduler.add_job(
        run_all_scrapers,
        "interval",
        hours=6,
        id="scraper_job"
    )

    scheduler.start()
    logger.info("Scheduler started — scrapers run every 6 hours")

    # Keep running
    try:
        while True:
            await asyncio.sleep(3600)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()


if __name__ == "__main__":
    asyncio.run(main())