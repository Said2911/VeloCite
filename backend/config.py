# backend/config.py
# Central configuration — all settings loaded from .env file

from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings

REPO_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # App
    APP_NAME: str = "VeloCite API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/velocite"
    MIGRATIONS_DIR: str = str(REPO_ROOT / "database" / "migrations")

    # Redis (optional — an in-memory cache is used if Redis is unreachable)
    REDIS_URL: Optional[str] = "redis://localhost:6379"

    # Currency API
    EXCHANGE_RATE_API_URL: str = "https://api.exchangerate-api.com/v4/latest/USD"
    CURRENCY_CACHE_TTL: int = 900  # 15 minutes

    # Search
    MAX_SEARCH_RESULTS: int = 500
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    SEARCH_CACHE_TTL: int = 300  # seconds

    # CORS — comma-separated list of allowed origins, or "*"
    CORS_ORIGINS: str = "*"

    # Admin / demo data
    ADMIN_TOKEN: Optional[str] = None      # required header for /api/v1/admin/*
    AUTO_SEED: bool = True                 # generate demo listings if the DB is empty
    SEED_LISTINGS_PER_MARKET: int = 80     # per Baku district / regional city

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()