import asyncio

from backend.cache import Cache, MemoryCache, create_cache


def test_memory_cache_ttl():
    async def scenario():
        cache = MemoryCache()
        await cache.setex("k", 60, "v")
        assert await cache.get("k") == "v"
        await cache.setex("old", -1, "x")
        assert await cache.get("old") is None
        await cache.delete_prefix("k")
        assert await cache.get("k") is None
    asyncio.run(scenario())


def test_cache_without_redis_uses_memory():
    async def scenario():
        cache = await create_cache(None)
        assert cache.backend == "memory"
        await cache.setex("search:1", 10, "{}")
        assert await cache.get("search:1") == "{}"
    asyncio.run(scenario())


def test_redis_errors_fall_back_to_memory():
    class BrokenRedis:
        async def get(self, key):
            raise ConnectionError("down")

        async def setex(self, key, ttl, value):
            raise ConnectionError("down")

    async def scenario():
        cache = Cache(BrokenRedis())
        await cache.setex("k", 10, "v")
        assert await cache.get("k") == "v"
    asyncio.run(scenario())
