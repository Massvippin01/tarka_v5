"""
SentinelX Phase 7 — Redis Distributed Cache & Token Revocation Tests.
Verifies token revocation blacklist, cache storage, TTL handling, and fallback behavior.
"""

import time
import pytest
from app.cache.redis_client import RedisCacheService


class TestWave6Phase7Redis:

    def test_redis_service_initialization(self):
        service = RedisCacheService()
        assert service is not None

    def test_token_revocation_in_memory_fallback(self):
        service = RedisCacheService(redis_url="redis://localhost:99999/0")  # Invalid port to trigger fallback
        token_jti = "test-jti-12345"

        assert service.is_token_revoked(token_jti) is False
        revoked = service.revoke_token(token_jti, ttl_seconds=60)
        assert revoked is True
        assert service.is_token_revoked(token_jti) is True

    def test_cache_set_and_get_in_memory_fallback(self):
        service = RedisCacheService(redis_url="redis://localhost:99999/0")
        key = "query_cache:case_001"
        data = {"case_id": "CASE-2026-001", "status": "ACTIVE"}

        set_ok = service.set_cache(key, data, ttl_seconds=60)
        assert set_ok is True

        cached_val = service.get_cache(key)
        assert cached_val is not None
        assert cached_val["case_id"] == "CASE-2026-001"

    def test_cache_expiration(self):
        service = RedisCacheService(redis_url="redis://localhost:99999/0")
        key = "expiring_key"
        service.set_cache(key, "temp_data", ttl_seconds=1)

        # Immediate retrieve works
        assert service.get_cache(key) == "temp_data"

        # After expiry, returns None
        time.sleep(1.1)
        assert service.get_cache(key) is None
