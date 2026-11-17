# backend/cache.py
# Small cache facade: uses Redis when available, falls back to an in-process
# TTL cache so the API keeps working when Redis is down or not configured.

import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)


class MemoryCache:
    """Minimal async-compatible TTL cache (single process only)."""

    def __init__(self, max_items: int = 2000):
        self._data: dict[str, tuple[float, str]] = {}
        self._max_items = max_items

    async def get(self, key: str) -> Optional[str]:
        item = self._data.get(key)
        if item is None:
            return None
        expires_at, value = item
        if expires_at < time.monotonic():
            self._data.pop(key, None)
            return None
        return value

    async def setex(self, key: str, ttl: int, value: str) -> None:
        if len(self._data) >= self._max_items:
            # drop the entry that expires first
            oldest = min(self._data, key=lambda k: self._data[k][0])
            self._data.pop(oldest, None)
        self._data[key] = (time.monotonic() + ttl, value)

    async def delete_prefix(self, prefix: str) -> None:
        for key in [k for k in self._data if k.startswith(prefix)]:
            self._data.pop(key, None)

    async def ping(self) -> bool:
        return True

    async def close(self) -> None:
        self._data.clear()


class Cache:
    """
    Wraps a Redis client. Every Redis error is logged and swallowed, so a cache
    outage degrades performance instead of breaking requests.
    """

    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.memory = MemoryCache()

    @property
    def backend(self) -> str:
        return "redis" if self.redis is not None else "memory"

    async def get(self, key: str) -> Optional[str]:
        if self.redis is not None:
            try:
                return await self.redis.get(key)
            except Exception as e:  # pragma: no cover - depends on Redis state
                logger.warning("Redis GET failed, using memory cache: %s", e)
        return await self.memory.get(key)

    async def setex(self, key: str, ttl: int, value: str) -> None:
        if self.redis is not None:
            try:
                await self.redis.setex(key, ttl, value)
                return
            except Exception as e:  # pragma: no cover
                logger.warning("Redis SETEX failed, using memory cache: %s", e)
        await self.memory.setex(key, ttl, value)

    async def delete_prefix(self, prefix: str) -> None:
        await self.memory.delete_prefix(prefix)
        if self.redis is not None:
            try:
                async for key in self.redis.scan_iter(match=f"{prefix}*"):
                    await self.redis.delete(key)
            except Exception as e:  # pragma: no cover
                logger.warning("Redis delete failed: %s", e)

    async def close(self) -> None:
        if self.redis is not None:
            try:
                await self.redis.close()
            except Exception:  # pragma: no cover
                pass


async def create_cache(redis_url: Optional[str]) -> Cache:
    """Connect to Redis if possible, otherwise return a memory-only cache."""
    if not redis_url:
        logger.info("REDIS_URL not set — using in-memory cache")
        return Cache(None)
    try:
        import redis.asyncio as aioredis

        client = aioredis.from_url(redis_url, decode_responses=True, socket_connect_timeout=3)
        await client.ping()
        logger.info("Connected to Redis")
        return Cache(client)
    except Exception as e:
        logger.warning("Redis unavailable (%s) — using in-memory cache", e)
        return Cache(None)
