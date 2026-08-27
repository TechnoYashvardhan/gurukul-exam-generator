"""
Async Redis client — singleton pattern.

Used for:
  - Document deduplication cache (sha256_hash → document_id)
  - Caching extracted raw text for recently uploaded PDFs
  - (Future) Job queuing for heavy embedding tasks

Phase 3 uses: sha256 hash → cached text and doc metadata.
"""

import logging
from typing import Optional

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

_redis: Optional[aioredis.Redis] = None


def get_redis() -> aioredis.Redis:
    """
    Return the module-level Redis client, creating it on first call.
    Thread-safe for asyncio; the client handles connection pooling.
    """
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
        )
        logger.info("Redis client created | url=%s", settings.redis_url)
    return _redis


async def close_redis() -> None:
    """Call on app shutdown to cleanly close connection pool."""
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
        logger.info("Redis connection closed")


# ── Convenience helpers ───────────────────────────────────────────────────────

async def redis_get(key: str) -> Optional[str]:
    try:
        return await get_redis().get(key)
    except Exception as exc:
        logger.warning("Redis GET failed for key=%s: %s", key, exc)
        return None


async def redis_set(key: str, value: str, ttl: int = 3600) -> None:
    try:
        await get_redis().set(key, value, ex=ttl)
    except Exception as exc:
        logger.warning("Redis SET failed for key=%s: %s", key, exc)


async def redis_delete(key: str) -> None:
    try:
        await get_redis().delete(key)
    except Exception as exc:
        logger.warning("Redis DELETE failed for key=%s: %s", key, exc)
