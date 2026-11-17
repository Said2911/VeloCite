# backend/main.py
# VeloCite API — main application entry point

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncpg

from analytics.scoring import recompute_all_scores
from backend.cache import create_cache
from backend.config import settings
from backend.db import run_migrations

# ─── Database & Cache connections ─────────────────────────────────────────────
db_pool: asyncpg.Pool = None
cache = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup connections on startup/shutdown."""
    global db_pool, cache

    # Connect to PostgreSQL
    db_pool = await asyncpg.create_pool(
        dsn=settings.DATABASE_URL,
        min_size=5,
        max_size=20
    )

    # Redis if available, otherwise in-memory cache
    cache = await create_cache(settings.REDIS_URL)

    app.state.db_pool = db_pool
    app.state.cache = cache

    # Apply SQL migrations (idempotent, safe on every startup)
    failed = await run_migrations(db_pool, settings.MIGRATIONS_DIR)
    if failed:
        print(f"⚠️ Migrations failed: {', '.join(failed)} — is PostGIS installed?")
    else:
        print("✅ Migrations applied")
        # Score every listing against its own segment (city + type + sale/rent)
        try:
            scored = await recompute_all_scores(db_pool)
            print(f"✅ Value scores recomputed for {scored} listings")
        except Exception as e:
            print(f"⚠️ Value score recompute failed: {e}")

    print(f"✅ {settings.APP_NAME} v{settings.APP_VERSION} started")
    print(f"✅ Database connected")
    print(f"✅ Cache: {cache.backend}")

    yield  # App runs here

    # Cleanup on shutdown
    await db_pool.close()
    await cache.close()
    print("👋 VeloCite API shutdown complete")


# ─── App Instance ──────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Global Real Estate Search Engine API",
    lifespan=lifespan
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
from backend.routers.search import router as search_router
app.include_router(search_router)

# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }