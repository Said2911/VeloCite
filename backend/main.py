# backend/main.py
# VeloCite API — main application entry point

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncpg
import redis.asyncio as aioredis

from backend.config import settings

# ─── Database & Cache connections ─────────────────────────────────────────────
db_pool: asyncpg.Pool = None
redis_client = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup connections on startup/shutdown."""
    global db_pool, redis_client

    # Connect to PostgreSQL
    db_pool = await asyncpg.create_pool(
        dsn=settings.DATABASE_URL,
        min_size=5,
        max_size=20
    )

    # Connect to Redis
    redis_client = aioredis.from_url(
        settings.REDIS_URL,
        decode_responses=True
    )

    app.state.db_pool = db_pool
    app.state.redis_client = redis_client

    from alembic.config import Config
    from alembic import command
    import os

    base_dir = os.path.dirname(os.path.abspath(__file__))
    ini_path = os.path.join(base_dir, "alembic.ini")

    alembic_cfg = Config(ini_path)
    alembic_cfg.set_main_option("script_location", os.path.join(base_dir, "migrations"))
    command.upgrade(alembic_cfg, "head")
    
    print("✅ Migrations applied")

    print(f"✅ {settings.APP_NAME} v{settings.APP_VERSION} started")
    print(f"✅ Database connected")
    print(f"✅ Redis connected")

    yield  # App runs here

    # Cleanup on shutdown
    await db_pool.close()
    await redis_client.close()
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