# backend/config.py
# Central configuration — all settings loaded from .env file

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "VeloCite API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/velocite"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

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