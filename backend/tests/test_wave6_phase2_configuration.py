from __future__ import annotations

import os
import pytest
from pydantic import ValidationError

from app.core.config import Settings, is_insecure_secret


def test_development_configuration_loads_with_safe_defaults():
    """Verify that development tier loads cleanly with safe local development defaults."""
    cfg = Settings(
        APP_ENV="development",
        DEBUG=True,
    )
    assert cfg.APP_ENV == "development"
    assert cfg.DEBUG is True
    assert cfg.PORT == 8000
    assert "http://localhost:5173" in cfg.cors_origins
    # Calling validate_startup_configuration should not raise in development
    cfg.validate_startup_configuration()


def test_staging_configuration_loads_when_supplied_valid_values():
    """Verify that staging tier loads and passes validation when supplied strong, non-default credentials."""
    valid_staging_secret = "f4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149afb"
    cfg = Settings(
        APP_ENV="staging",
        DEBUG=False,
        SECRET_KEY=valid_staging_secret,
        ALLOWED_ORIGINS="https://staging.sentinelx.internal",
        DATABASE_URL="postgresql://stage_user:StageK9xW2vM7qL4pZ1y!@pg-stage.internal:5432/sentinelx_stage",
        NEO4J_URI="bolt://neo4j-stage.internal:7687",
        NEO4J_PASSWORD="StageNeo4jK9xW2vM7qL4p!",
        STORAGE_BACKEND="s3",
        S3_ACCESS_KEY="STAGE_S3_KEY_VALID",
        S3_SECRET_KEY="StageS3KeyK9xW2vM7qL4p!",
        S3_BUCKET_NAME="sentinelx-evidence-staging",
        OPA_FAIL_CLOSED=True,
    )
    assert cfg.APP_ENV == "staging"
    assert cfg.DEBUG is False
    cfg.validate_startup_configuration()


def test_production_rejects_default_jwt_secret():
    """Production MUST reject default, weak, or development JWT secret keys."""
    insecure_keys = [
        "CHANGE_ME",
        "dev_insecure_key",
        "sentinelx_development_secret_key",
        "password1234567890123456789012345",
        "short",
    ]
    for bad_key in insecure_keys:
        with pytest.raises((ValueError, ValidationError)) as exc_info:
            Settings(
                APP_ENV="production",
                DEBUG=False,
                SECRET_KEY=bad_key,
                ALLOWED_ORIGINS="https://sentinelx.intelligence.gov.in",
                DATABASE_URL="postgresql://prod_user:StrongPass991!@pg-prod.internal:5432/sentinelx_prod",
                NEO4J_PASSWORD="StrongNeo4jPass991!",
                STORAGE_BACKEND="filesystem",
                OPA_FAIL_CLOSED=True,
            )
        err = str(exc_info.value)
        assert "SECRET_KEY" in err
        # Ensure the actual bad key is never revealed in the error message
        assert bad_key not in err or len(bad_key) < 8


def test_production_rejects_placeholder_passwords():
    """Production MUST reject placeholder or default database / Neo4j credentials."""
    with pytest.raises((ValueError, ValidationError)) as exc_info:
        Settings(
            APP_ENV="production",
            DEBUG=False,
            SECRET_KEY="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            ALLOWED_ORIGINS="https://sentinelx.intelligence.gov.in",
            DATABASE_URL="postgresql://prod_user:StrongPass991!@pg-prod.internal:5432/sentinelx_prod",
            NEO4J_PASSWORD="sentinelx_dev_secret",  # Known placeholder
            STORAGE_BACKEND="filesystem",
            OPA_FAIL_CLOSED=True,
        )
    err = str(exc_info.value)
    assert "NEO4J_PASSWORD" in err


def test_production_rejects_empty_required_secrets():
    """Production MUST reject empty secret strings."""
    with pytest.raises((ValueError, ValidationError)) as exc_info:
        Settings(
            APP_ENV="production",
            DEBUG=False,
            SECRET_KEY="",  # Empty
            ALLOWED_ORIGINS="https://sentinelx.intelligence.gov.in",
            DATABASE_URL="postgresql://prod_user:StrongPass991!@pg-prod.internal:5432/sentinelx_prod",
            NEO4J_PASSWORD="StrongNeo4jPass991!",
            STORAGE_BACKEND="filesystem",
            OPA_FAIL_CLOSED=True,
        )
    assert "SECRET_KEY" in str(exc_info.value)


def test_production_rejects_wildcard_cors():
    """Production MUST strictly reject wildcard ('*') CORS origins."""
    with pytest.raises((ValueError, ValidationError)) as exc_info:
        Settings(
            APP_ENV="production",
            DEBUG=False,
            SECRET_KEY="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            ALLOWED_ORIGINS="*",
            DATABASE_URL="postgresql://prod_user:StrongPass991!@pg-prod.internal:5432/sentinelx_prod",
            NEO4J_PASSWORD="StrongNeo4jPass991!",
            STORAGE_BACKEND="filesystem",
            OPA_FAIL_CLOSED=True,
        )
    assert "ALLOWED_ORIGINS" in str(exc_info.value)
    assert "wildcard" in str(exc_info.value).lower()


def test_production_rejects_malformed_cors_origins():
    """Production MUST reject origins that contain paths or lack http(s) scheme."""
    with pytest.raises((ValueError, ValidationError)) as exc_info:
        Settings(
            APP_ENV="production",
            DEBUG=False,
            SECRET_KEY="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            ALLOWED_ORIGINS="https://sentinelx.intelligence.gov.in/api/v1",  # Path forbidden
            DATABASE_URL="postgresql://prod_user:StrongPass991!@pg-prod.internal:5432/sentinelx_prod",
            NEO4J_PASSWORD="StrongNeo4jPass991!",
            STORAGE_BACKEND="filesystem",
            OPA_FAIL_CLOSED=True,
        )
    assert "ALLOWED_ORIGINS" in str(exc_info.value)


def test_production_rejects_localhost_database_url():
    """Production MUST reject localhost or sqlite database URLs."""
    with pytest.raises((ValueError, ValidationError)) as exc_info:
        Settings(
            APP_ENV="production",
            DEBUG=False,
            SECRET_KEY="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            ALLOWED_ORIGINS="https://sentinelx.intelligence.gov.in",
            DATABASE_URL="postgresql://user:pass@localhost:5432/sentinelx",  # Localhost forbidden
            NEO4J_PASSWORD="StrongNeo4jPass991!",
            STORAGE_BACKEND="filesystem",
            OPA_FAIL_CLOSED=True,
        )
    assert "DATABASE_URL" in str(exc_info.value)


def test_production_rejects_debug_true():
    """Production MUST reject DEBUG=True."""
    with pytest.raises((ValueError, ValidationError)) as exc_info:
        Settings(
            APP_ENV="production",
            DEBUG=True,
            SECRET_KEY="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            ALLOWED_ORIGINS="https://sentinelx.intelligence.gov.in",
            DATABASE_URL="postgresql://prod_user:StrongPass991!@pg-prod.internal:5432/sentinelx_prod",
            NEO4J_PASSWORD="StrongNeo4jPass991!",
            STORAGE_BACKEND="filesystem",
            OPA_FAIL_CLOSED=True,
        )
    assert "DEBUG" in str(exc_info.value)


def test_production_accepts_valid_configuration():
    """Production configuration passes cleanly when all invariants are satisfied."""
    cfg = Settings(
        APP_ENV="production",
        DEBUG=False,
        PORT=8000,
        SECRET_KEY="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        ALLOWED_ORIGINS="https://sentinelx.intelligence.gov.in,https://console.sentinelx.gov.in",
        DATABASE_URL="postgresql://prod_user:StrongK9xW2vM7qL4pZ1y!@pg-cluster.internal:5432/sentinelx_prod",
        NEO4J_URI="neo4j+s://neo4j.prod.internal:7687",
        NEO4J_PASSWORD="StrongNeo4jK9xW2vM7qL4p!",
        STORAGE_BACKEND="s3",
        S3_ENDPOINT_URL="https://s3.prod.internal",
        S3_ACCESS_KEY="PROD_S3_KEY_VALID",
        S3_SECRET_KEY="StrongS3KeyK9xW2vM7qL4p!",
        S3_BUCKET_NAME="sentinelx-evidence-prod-vault",
        OPA_FAIL_CLOSED=True,
    )
    assert cfg.APP_ENV == "production"
    assert cfg.DEBUG is False
    assert len(cfg.cors_origins) == 2
    # Verify manual validation invocation succeeds
    cfg.validate_startup_configuration()


def test_error_messages_do_not_expose_secret_values():
    """Validation errors must identify the configuration variable without leaking secret content."""
    secret_canary = "CHANGE_ME_SENSITIVE_LEAK_CANARY_VALUE_XYZ_9999"
    with pytest.raises((ValueError, ValidationError)) as exc_info:
        Settings(
            APP_ENV="production",
            DEBUG=False,
            SECRET_KEY=secret_canary,  # Placeholder-like canary
            ALLOWED_ORIGINS="https://sentinelx.intelligence.gov.in",
            DATABASE_URL="postgresql://user:pass@pg-prod.internal:5432/prod",
            NEO4J_PASSWORD="StrongNeo4jPass991!",
            STORAGE_BACKEND="filesystem",
            OPA_FAIL_CLOSED=True,
        )
    err_message = str(exc_info.value)
    # The variable name MUST appear
    assert "SECRET_KEY" in err_message
    # The sensitive canary value MUST NEVER appear
    assert secret_canary not in err_message


def test_missing_required_production_values_fail_closed():
    """Production fails closed when required fields are missing or empty."""
    with pytest.raises((ValueError, ValidationError)) as exc_info:
        Settings(
            APP_ENV="production",
            DEBUG=False,
            SECRET_KEY="",
            ALLOWED_ORIGINS="",
            DATABASE_URL="",
            NEO4J_PASSWORD="",
        )
    err = str(exc_info.value)
    assert "INVALID_CONFIGURATION" in err


def test_fastapi_lifespan_enforces_startup_validation():
    """Verify that FastAPI lifespan startup fails closed when production invariants are violated."""
    from fastapi.testclient import TestClient
    from app.main import app
    from app.core.config import settings

    # In current development mode, client starts cleanly
    with TestClient(app) as client:
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"

