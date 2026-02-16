"""
Cache Helpers
Deterministic key generation, get/set with JSON, and domain-based invalidation.
"""

import hashlib
import json
import logging
from typing import Any

from config.redis import get_redis

logger = logging.getLogger(__name__)

# TTLs in seconds per cache domain
CACHE_TTLS: dict[str, int] = {
    "bilag": 60,
    "reports": 120,
    "bank_transactions": 60,
    "reconciliation": 60,
    "bank_accounts": 300,
}

# Maps a write event to the cache domains it should invalidate
WRITE_INVALIDATION_MAP: dict[str, list[str]] = {
    "bilag:approve": ["bilag", "reports"],
    "bilag:post": ["bilag", "reports"],
    "bilag:reject": ["bilag"],
    "bilag:pay": ["bilag", "reports"],
    "bilag:manual_post": ["bilag", "reports", "reconciliation", "bank_transactions"],
    "bilag:delete": ["bilag", "reports"],
    "reconciliation:confirm": ["reconciliation", "bank_transactions", "bilag"],
    "reconciliation:reject": ["reconciliation"],
    "rules:create": ["bank_transactions"],
    "rules:update": ["bank_transactions"],
    "rules:delete": ["bank_transactions"],
    "rules:apply": ["bank_transactions"],
}


def cache_key(domain: str, **params: Any) -> str:
    """Build a deterministic cache key: ciri:{domain}:{hash_of_params}."""
    sorted_items = sorted((k, str(v)) for k, v in params.items() if v is not None)
    raw = json.dumps(sorted_items, separators=(",", ":"))
    digest = hashlib.md5(raw.encode()).hexdigest()[:12]
    return f"ciri:{domain}:{digest}"


async def get_cached(key: str) -> Any | None:
    """Return cached JSON value or None on miss/error."""
    try:
        redis = get_redis()
        raw = await redis.get(key)
        if raw is not None:
            return json.loads(raw)
    except Exception:
        logger.debug("Cache miss or error for key=%s", key)
    return None


async def set_cached(key: str, data: Any, ttl: int) -> None:
    """Store JSON-serialisable data with a TTL."""
    try:
        redis = get_redis()
        await redis.set(key, json.dumps(data, default=str), ex=ttl)
    except Exception:
        logger.warning("Failed to set cache key=%s", key, exc_info=True)


async def invalidate_domains(*domains: str) -> None:
    """Delete all keys matching ciri:{domain}:* for each domain using SCAN."""
    try:
        redis = get_redis()
        for domain in domains:
            pattern = f"ciri:{domain}:*"
            deleted = 0
            async for key in redis.scan_iter(match=pattern, count=100):
                await redis.delete(key)
                deleted += 1
            if deleted:
                logger.info("Invalidated %d keys for domain=%s", deleted, domain)
    except Exception:
        logger.warning("Cache invalidation failed", exc_info=True)


async def invalidate_event(event: str) -> None:
    """Invalidate all cache domains associated with a write event."""
    domains = WRITE_INVALIDATION_MAP.get(event, [])
    if domains:
        await invalidate_domains(*domains)
