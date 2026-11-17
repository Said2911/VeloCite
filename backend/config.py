# backend/config.py
# Central configuration — all settings loaded from .env file

from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings

REPO_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # App
    APP_NAME: str = "VeloCite API"
    APP_VERSION: str = "0.1.0"
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

    # Mapbox
    MAPBOX_TOKEN: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()