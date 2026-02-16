"""
Redis Configuration
Async Redis client singleton for caching and session management.
"""

import redis.asyncio as aioredis
from config.settings import settings

# Module-level client reference
_redis: aioredis.Redis | None = None


async def init_redis() -> None:
    """Initialize the async Redis connection pool."""
    global _redis
    _redis = aioredis.from_url(
        settings.redis_url,
        decode_responses=True,
        max_connections=20,
    )
    # Verify connectivity
    await _redis.ping()


async def close_redis() -> None:
    """Close the Redis connection pool."""
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None


def get_redis() -> aioredis.Redis:
    """FastAPI dependency — returns the Redis client."""
    if _redis is None:
        raise RuntimeError("Redis not initialized. Call init_redis() first.")
    return _redis
