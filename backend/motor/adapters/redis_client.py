from __future__ import annotations

from functools import lru_cache

import redis

from motor.config import get_settings


class RedisCache:
    def __init__(self) -> None:
        settings = get_settings()
        try:
            self._client = redis.from_url(settings.redis_url, decode_responses=True)
            self._client.ping()
            self._available = True
        except Exception:
            self._client = None
            self._available = False

    @property
    def available(self) -> bool:
        return self._available

    def get(self, key: str) -> str | None:
        if not self._client:
            return None
        return self._client.get(key)

    def set(self, key: str, value: str, ttl: int = 86400) -> None:
        if self._client:
            self._client.setex(key, ttl, value)


@lru_cache
def get_redis() -> RedisCache:
    return RedisCache()
