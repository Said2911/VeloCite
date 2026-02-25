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
    allow_origins=["http://localhost:3000"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }