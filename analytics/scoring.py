# analytics/scoring.py
# Batch job: recompute value_score / market_position for every active listing.
# Run after seeding or scraping:  python -m analytics.scoring

from __future__ import annotations

import asyncio
import logging
import os

import pandas as pd

from analytics.market_analyzer import score_dataframe

logger = logging.getLogger(__name__)

LOAD_SQL = """
    SELECT id, country_code, city, property_type, listing_type, price_per_sqm, year_built
    FROM listings
    WHERE is_active = TRUE
"""

UPDATE_SQL = """
    UPDATE listings
    SET value_score = $2, market_position = $3, updated_at = NOW()
    WHERE id = $1
"""


async def recompute_all_scores(pool) -> int:
    """Score all active listings against their segment. Returns rows updated."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(LOAD_SQL)
    if not rows:
        return 0

    scored = score_dataframe(pd.DataFrame([dict(r) for r in rows]))
    updates = [
        (row.id, float(row.value_score), str(row.market_position))
        for row in scored.itertuples(index=False)
    ]

    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.executemany(UPDATE_SQL, updates)

    logger.info("Value scores recomputed for %d listings", len(updates))
    return len(updates)


async def _main() -> None:  # pragma: no cover - CLI helper
    import asyncpg

    logging.basicConfig(level=logging.INFO)
    pool = await asyncpg.create_pool(
        os.getenv("DATABASE_URL", "postgresql://velocite:velocite123@localhost:5432/velocite"),
        min_size=1, max_size=2,
    )
    try:
        print(f"✅ Updated {await recompute_all_scores(pool)} listings")
    finally:
        await pool.close()


if __name__ == "__main__":  # pragma: no cover
    asyncio.run(_main())
