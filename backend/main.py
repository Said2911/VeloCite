# backend/main.py
# VeloCite API — main application entry point

import logging
from contextlib import asynccontextmanager

import asyncpg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from analytics.scoring import recompute_all_scores
from backend.cache import create_cache
from backend.config import settings
from backend.db import run_migrations
from backend.services.ranking import CPP_AVAILABLE

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("velocite")


async def prepare_data(pool) -> None:
    """Fill an empty database with demo listings, then score every listing."""
    from scrapers.data_generator import generate_and_insert

    async with pool.acquire() as conn:
        count = await conn.fetchval("SELECT COUNT(*) FROM listings")

    if count == 0 and settings.AUTO_SEED:
        logger.info("Database is empty — generating demo listings for Azerbaijan")
        await generate_and_insert(settings.SEED_LISTINGS_PER_MARKET, pool=pool)

    # Score every listing against its own segment (district or city + type + sale/rent)
    scored = await recompute_all_scores(pool)
    logger.info("Value scores recomputed for %d listings", scored)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and clean up connections on startup/shutdown."""
    db_pool = await asyncpg.create_pool(dsn=settings.DATABASE_URL, min_size=2, max_size=20)
    cache = await create_cache(settings.REDIS_URL)

    app.state.db_pool = db_pool
    app.state.cache = cache

    # Apply SQL migrations (idempotent, safe on every startup)
    failed = await run_migrations(db_pool, settings.MIGRATIONS_DIR)
    if failed:
        logger.error("Migrations failed: %s — is PostGIS installed?", ", ".join(failed))
    else:
        try:
            await prepare_data(db_pool)
        except Exception as e:
            logger.error("Preparing data failed: %s", e)

    logger.info(
        "✅ %s v%s started (cache: %s, C++ ranking: %s)",
        settings.APP_NAME, settings.APP_VERSION, cache.backend, "on" if CPP_AVAILABLE else "off",
    )

    yield  # App runs here

    await db_pool.close()
    await cache.close()
    logger.info("👋 VeloCite API shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Real estate search for Azerbaijan with value scoring",
    lifespan=lifespan,
)

# Auth uses a Bearer header (not cookies), so credentials are not needed for CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.routers.admin import router as admin_router  # noqa: E402
from backend.routers.search import router as search_router  # noqa: E402

app.include_router(search_router)
app.include_router(admin_router)


@app.get("/health")
async def health_check():
    db_ok = True
    try:
        async with app.state.db_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
    except Exception:
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": db_ok,
        "cache": app.state.cache.backend,
        "cpp_engine": CPP_AVAILABLE,
    }
