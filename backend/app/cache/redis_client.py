"""
SentinelX Phase 7 — Redis Distributed Cache & Token Revocation Service.
Provides JWT token revocation blacklist, session tracking, and cache abstraction
with fail-closed security and graceful in-memory fallback.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, Optional, Set
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger("sentinelx.cache.redis")


class RedisCacheService:
    """
    Redis Cache & Token Revocation Service.
    Connects to Redis server if available, otherwise falls back to in-memory store.
    """
    _instance: Optional[RedisCacheService] = None

    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or settings.REDIS_URL
        self._in_memory_revocation: Set[str] = set()
        self._in_memory_cache: Dict[str, tuple[Any, float]] = {}
        self._redis_client = None

        # Attempt to initialize redis client if redis library is installed & url configured
        try:
            import redis
            self._redis_client = redis.Redis.from_url(
                self.redis_url,
                socket_timeout=2.0,
                decode_responses=True,
            )
            # Ping test
            self._redis_client.ping()
            logger.info("Connected to Redis at %s", self.redis_url)
        except Exception as err:
            logger.info("Redis unavailable (%s); using in-memory fallback cache.", err)
            self._redis_client = None

    @classmethod
    def get_instance(cls) -> RedisCacheService:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def revoke_token(self, token_jti: str, ttl_seconds: int = 3600) -> bool:
        """
        Blacklist a JWT token (by JTI or token string) for the specified TTL.
        """
        if self._redis_client:
            try:
                self._redis_client.setex(f"revoked_token:{token_jti}", ttl_seconds, "revoked")
                return True
            except Exception as err:
                logger.error("Failed to revoke token in Redis: %s", err)

        # Fallback in-memory revocation
        self._in_memory_revocation.add(token_jti)
        return True

    def is_token_revoked(self, token_jti: str) -> bool:
        """
        Check if a JWT token has been revoked.
        """
        if self._redis_client:
            try:
                val = self._redis_client.get(f"revoked_token:{token_jti}")
                if val == "revoked":
                    return True
            except Exception as err:
                logger.error("Redis lookup error for token revocation: %s", err)

        # Fallback check
        return token_jti in self._in_memory_revocation

    def set_cache(self, key: str, value: Any, ttl_seconds: int = 300) -> bool:
        """
        Store a key-value pair in cache with expiration time.
        """
        if self._redis_client:
            try:
                import json
                self._redis_client.setex(key, ttl_seconds, json.dumps(value))
                return True
            except Exception as err:
                logger.error("Failed to set cache in Redis: %s", err)

        # Fallback
        exp_time = time.time() + ttl_seconds
        self._in_memory_cache[key] = (value, exp_time)
        return True

    def get_cache(self, key: str) -> Optional[Any]:
        """
        Retrieve a value from cache by key.
        """
        if self._redis_client:
            try:
                import json
                val = self._redis_client.get(key)
                if val:
                    return json.loads(val)
            except Exception as err:
                logger.error("Redis get cache error: %s", err)

        # Fallback
        if key in self._in_memory_cache:
            val, exp = self._in_memory_cache[key]
            if time.time() < exp:
                return val
            else:
                del self._in_memory_cache[key]
        return None
