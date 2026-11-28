from __future__ import annotations

import logging
import re
from typing import List, Literal, Optional
from urllib.parse import urlparse
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("sentinelx.config")

# Known placeholder substrings prohibited in production/staging
INSECURE_PLACEHOLDER_SUBSTRINGS = [
    "change_me",
    "replace_with",
    "from_vault",
    "password_from_vault",
    "stage_password",
    "prod_password",
    "sentinelx_dev_secret",
    "sentinelx_prod_password",
    "sentinelx_development",
    "dev_insecure",
    "dev_secret",
]

# Trivial tokens and prefixes prohibited in production/staging
TRIVIAL_SECRET_PREFIXES = (
    "password",
    "secret",
    "admin",
    "root",
    "default",
    "guest",
    "123456",
    "yp2280707",
)


def is_insecure_secret(val: Optional[str], min_length: int = 16) -> bool:
    """
    Check if a secret string is empty, too short, starts with trivial words, or contains placeholder patterns.
    Never logs or reveals the secret value.
    """
    if not val:
        return True
    val_clean = val.strip().lower()
    if len(val_clean) < min_length:
        return True
    if val_clean.startswith(TRIVIAL_SECRET_PREFIXES):
        return True
    return any(pattern in val_clean for pattern in INSECURE_PLACEHOLDER_SUBSTRINGS)


class Settings(BaseSettings):
    """
    Authoritative, typed, environment-driven configuration model for SentinelX.
    Enforces strict production and staging safety invariants on startup.
    """
    # Environment Tier
    APP_ENV: Literal["development", "staging", "production", "test"] = Field(
        default="development",
        description="Operating environment tier: development | staging | production | test"
    )
    DEBUG: bool = Field(
        default=False,
        description="Enable debug mode (MUST be false in staging/production)"
    )
    PORT: int = Field(
        default=8000,
        description="API HTTP port (1-65535)"
    )
    HOST: str = Field(
        default="0.0.0.0",
        description="API bind host"
    )

    # Security & Cryptographic Tokens
    SECRET_KEY: str = Field(
        default="sentinelx_development_secret_key_minimum_32_characters_for_local_testing",
        description="Cryptographic secret key for signing session tokens and credentials"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
        description="Access token expiration window in minutes"
    )
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7,
        description="Refresh token expiration window in days"
    )
    ALGORITHM: str = Field(
        default="HS256",
        description="JWT cryptographic signing algorithm"
    )
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:8080",
        description="Comma-separated list of allowed CORS origins"
    )
    ENABLE_DEMO_AUTH: bool = Field(
        default=False,
        description="Allow raw synthetic user keys as bearer tokens (LOCAL DEV ONLY - strictly prohibited in staging/prod)"
    )

    # Google Two-Account Authentication
    GOOGLE_CLIENT_ID: str = Field(
        default="",
        description="Google OAuth2 Client ID for authentication"
    )
    DEMO_ADMIN_EMAIL: str = Field(
        default="admin@tarka.local",
        description="Allowed Google account for SUPER_ADMIN role"
    )
    DEMO_TESTER_EMAIL: str = Field(
        default="tester@tarka.local",
        description="Allowed Google account for INVESTIGATOR_QA role"
    )

    # WhatsApp Official Business Cloud API Integration
    WHATSAPP_ENABLED: bool = Field(
        default=False,
        description="Enable official WhatsApp Cloud API integration (disabled until valid credentials provided)"
    )
    WHATSAPP_PHONE_NUMBER_ID: str = Field(
        default="",
        description="Meta WhatsApp Cloud API Phone Number ID"
    )
    WHATSAPP_ACCESS_TOKEN: str = Field(
        default="",
        description="Meta WhatsApp Cloud API System User Access Token"
    )
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: str = Field(
        default="tarka_webhook_verify_token_2026",
        description="Verification token for WhatsApp webhook subscription handshake"
    )
    WHATSAPP_APP_SECRET: str = Field(
        default="",
        description="Meta App Secret for X-Hub-Signature-256 webhook validation"
    )
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = Field(
        default="",
        description="Meta WhatsApp Business Account ID"
    )


    # Persistence - PostgreSQL Transactional Authority
    DATABASE_URL: str = Field(
        default="postgresql://sentinelx_user:sentinelx_dev_secret@localhost:5432/sentinelx",
        description="PostgreSQL transactional database connection URL"
    )
    DB_POOL_SIZE: int = Field(
        default=10,
        description="PostgreSQL connection pool size"
    )
    DB_MAX_OVERFLOW: int = Field(
        default=5,
        description="PostgreSQL connection pool maximum overflow"
    )
    DB_POOL_TIMEOUT: int = Field(
        default=30,
        description="Connection pool acquisition timeout in seconds"
    )

    # Graph - Neo4j Projection Authority
    NEO4J_URI: str = Field(
        default="bolt://localhost:7687",
        description="Neo4j bolt/neo4j connection URI"
    )
    NEO4J_USERNAME: str = Field(
        default="neo4j",
        description="Neo4j username"
    )
    NEO4J_PASSWORD: str = Field(
        default="sentinelx_dev_secret",
        description="Neo4j password"
    )
    NEO4J_MAX_CONNECTION_POOL_SIZE: int = Field(
        default=50,
        description="Neo4j driver maximum connection pool size"
    )
    NEO4J_CONNECTION_TIMEOUT_SEC: float = Field(
        default=10.0,
        description="Neo4j connection acquisition timeout in seconds"
    )

    # Storage - Evidence CAS & S3-Compatible Storage
    STORAGE_BACKEND: Literal["filesystem", "s3"] = Field(
        default="filesystem",
        description="Evidence storage backend: filesystem (dev/test) | s3 (staging/prod)"
    )
    S3_ENDPOINT_URL: Optional[str] = Field(
        default="http://localhost:9000",
        description="S3 / MinIO API endpoint URL"
    )
    S3_ACCESS_KEY: Optional[str] = Field(
        default="sentinelx_minio",
        description="S3 access key ID"
    )
    S3_SECRET_KEY: Optional[str] = Field(
        default="sentinelx_dev_secret",
        description="S3 secret access key"
    )
    S3_BUCKET_NAME: str = Field(
        default="sentinelx-evidence",
        description="Target evidence bucket name"
    )
    S3_REGION: str = Field(
        default="us-east-1",
        description="S3 region name"
    )
    S3_OBJECT_LOCK_ENABLED: bool = Field(
        default=False,
        description="Enable S3 object lock / immutability retention in production"
    )
    S3_SECURE: bool = Field(
        default=False,
        description="Use SSL/TLS for S3 connection"
    )
    S3_ADDRESSING_STYLE: Literal["auto", "path", "virtual"] = Field(
        default="path",
        description="S3 addressing style ('path' recommended for MinIO)"
    )

    # Search - OpenSearch Projection Engine
    OPENSEARCH_URL: str = Field(
        default="http://localhost:9200",
        description="OpenSearch cluster HTTP/HTTPS URL"
    )
    OPENSEARCH_USERNAME: Optional[str] = Field(
        default="admin",
        description="OpenSearch HTTP basic auth username"
    )
    OPENSEARCH_PASSWORD: Optional[str] = Field(
        default="SentinelX_DevPass123!",
        description="OpenSearch HTTP basic auth password"
    )
    OPENSEARCH_VERIFY_CERTS: bool = Field(
        default=False,
        description="Verify SSL/TLS certificates when connecting to OpenSearch"
    )

    # Governance & Policy - Open Policy Agent (OPA)
    OPA_URL: str = Field(
        default="http://localhost:8181",
        description="Open Policy Agent server URL"
    )
    OPA_FAIL_CLOSED: bool = Field(
        default=True,
        description="Fail-closed behavior if OPA service is unreachable"
    )

    # Cache & Session - Redis
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL"
    )

    # Realtime Voice - LiveKit
    LIVEKIT_URL: str = Field(
        default="wss://sentinelx-livekit.local/webrtc",
        description="LiveKit WebRTC SFU server URL"
    )
    LIVEKIT_API_KEY: str = Field(
        default="devkey",
        description="LiveKit API key"
    )
    LIVEKIT_API_SECRET: str = Field(
        default="secret",
        description="LiveKit API secret"
    )

    # AI & Speech Providers Configuration
    STT_PROVIDER: Literal["mock", "livekit"] = Field(
        default="mock",
        description="Speech-to-text provider implementation"
    )
    TTS_PROVIDER: Literal["mock", "fish_audio"] = Field(
        default="mock",
        description="Text-to-speech provider implementation"
    )
    REASONING_PROVIDER: Literal["deterministic_mock", "gemini"] = Field(
        default="deterministic_mock",
        description="Reasoning provider implementation"
    )
    GEMINI_API_KEY: Optional[str] = Field(
        default=None,
        description="Google Gemini API key (optional in mock mode)"
    )
    FISH_AUDIO_API_KEY: Optional[str] = Field(
        default=None,
        description="Fish Audio S2.1 Pro TTS API key (optional in mock mode)"
    )
    VOICE_LANGUAGE: str = Field(
        default="en-IN",
        description="Default voice interaction language code"
    )

    # Sarvam AI Voice & Indic Orchestration Configuration
    SARVAM_API_KEY: Optional[str] = Field(
        default=None,
        description="Sarvam AI API subscription key for Saaras STT & Bulbul TTS"
    )
    SARVAM_STT_MODEL: str = Field(
        default="saaras:v4",
        description="Sarvam Speech-to-Text model identifier (e.g. saaras:v4 or saaras:v3)"
    )
    SARVAM_TTS_MODEL: str = Field(
        default="bulbul:v4-flash",
        description="Sarvam Text-to-Speech model identifier (e.g. bulbul:v4-flash or bulbul:v3)"
    )
    SARVAM_DEFAULT_SPEAKER: str = Field(
        default="shubh_enhi_ads",
        description="Sarvam voice persona identifier (e.g. shubh_enhi_ads for bulbul:v4-flash, or shubh for bulbul:v3)"
    )
    SARVAM_API_BASE_URL: str = Field(
        default="https://api.sarvam.ai",
        description="Sarvam AI API base URL"
    )

    # Telemetry & Observability - OpenTelemetry
    OTEL_EXPORTER_OTLP_ENDPOINT: str = Field(
        default="http://localhost:4317",
        description="OpenTelemetry collector gRPC/HTTP OTLP endpoint"
    )
    OTEL_SERVICE_NAME: str = Field(
        default="sentinelx-core-api",
        description="OpenTelemetry service resource name"
    )

    # Audit Durability
    AUDIT_STORAGE_BACKEND: Literal["memory", "postgres"] = Field(
        default="memory",
        description="Audit ledger persistence mode: memory | postgres"
    )
    AUDIT_FAIL_CLOSED: bool = Field(
        default=True,
        description="Reject mutations if audit event recording fails"
    )

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def async_database_url(self) -> str:
        """
        Normalize DATABASE_URL for SQLAlchemy async engine.
        Converts postgresql:// and postgres:// to postgresql+asyncpg://.
        Preserves sqlite+aiosqlite:// or custom async schemes.
        """
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    def validate_cors_origins(self) -> List[str]:
        """
        Validate CORS origins according to security standards.
        Returns a list of validation error descriptions.
        """
        errors: List[str] = []
        origins = self.cors_origins

        if not origins:
            errors.append("INVALID_CONFIGURATION: Variable 'ALLOWED_ORIGINS' cannot be empty.")
            return errors

        is_production_or_staging = self.APP_ENV in ("production", "staging")

        if is_production_or_staging and "*" in origins:
            errors.append(
                "INVALID_CONFIGURATION: Variable 'ALLOWED_ORIGINS' must not contain wildcard ('*') "
                f"in {self.APP_ENV} environment. Explicit domain origins required."
            )

        for origin in origins:
            if origin == "*":
                continue
            parsed = urlparse(origin)
            if parsed.scheme not in ("http", "https") or not parsed.netloc:
                errors.append(
                    f"INVALID_CONFIGURATION: Variable 'ALLOWED_ORIGINS' contains malformed origin. "
                    "Must be valid http(s) origin without path or query."
                )
                break
            if parsed.path and parsed.path != "":
                errors.append(
                    f"INVALID_CONFIGURATION: Variable 'ALLOWED_ORIGINS' contains path segment. "
                    "CORS origins must not specify URL paths."
                )
                break

        return errors

    def validate_startup_configuration(self) -> None:
        """
        Enforce strict fail-closed configuration invariants on application startup.
        Never prints or exposes secret values in error messages or logs.
        """
        errors: List[str] = []

        # 1. Port boundary validation
        if not (1 <= self.PORT <= 65535):
            errors.append("INVALID_CONFIGURATION: Variable 'PORT' must be an integer between 1 and 65535.")

        # 2. CORS origin validation
        errors.extend(self.validate_cors_origins())

        # 3. Environment-specific validation for Production and Staging
        if self.APP_ENV in ("production", "staging"):
            tier = self.APP_ENV.upper()

            # DEBUG must be False
            if self.DEBUG:
                errors.append(f"INVALID_CONFIGURATION: Variable 'DEBUG' must be False in {tier}.")

            # ENABLE_DEMO_AUTH must be False in staging/production
            if self.ENABLE_DEMO_AUTH:
                errors.append(f"INVALID_CONFIGURATION: Variable 'ENABLE_DEMO_AUTH' must be False in {tier}. Synthetic demo authentication is prohibited outside local testing.")


            # SECRET_KEY strength (>= 32 chars and not placeholder)
            if is_insecure_secret(self.SECRET_KEY, min_length=32):
                errors.append(
                    f"INVALID_CONFIGURATION: Variable 'SECRET_KEY' must be a strong, non-default cryptographic key "
                    f"(>= 32 characters) in {tier}."
                )

            # Database URL validation (no localhost or sqlite in production)
            if self.APP_ENV == "production":
                db_clean = self.DATABASE_URL.lower()
                if "localhost" in db_clean or "127.0.0.1" in db_clean or "sqlite" in db_clean:
                    errors.append(
                        "INVALID_CONFIGURATION: Variable 'DATABASE_URL' cannot use localhost, 127.0.0.1, "
                        "or sqlite in PRODUCTION."
                    )

            # Neo4j credentials
            if is_insecure_secret(self.NEO4J_PASSWORD, min_length=12):
                errors.append(
                    f"INVALID_CONFIGURATION: Variable 'NEO4J_PASSWORD' must not use a default or placeholder value in {tier}."
                )

            # OPA fail-closed enforcement
            if not self.OPA_FAIL_CLOSED:
                errors.append(
                    f"INVALID_CONFIGURATION: Variable 'OPA_FAIL_CLOSED' must be True in {tier}."
                )

            # S3 storage requirements
            if self.STORAGE_BACKEND == "s3":
                if is_insecure_secret(self.S3_SECRET_KEY, min_length=12):
                    errors.append(
                        f"INVALID_CONFIGURATION: Variable 'S3_SECRET_KEY' must not use a default or placeholder value in {tier}."
                    )
                if not self.S3_BUCKET_NAME or self.S3_BUCKET_NAME == "sentinelx-evidence":
                    errors.append(
                        f"INVALID_CONFIGURATION: Variable 'S3_BUCKET_NAME' must specify a dedicated production/staging bucket in {tier}."
                    )

        if errors:
            error_summary = "\n".join(f" - {err}" for err in errors)
            logger.critical(f"FATAL: Configuration failed startup validation:\n{error_summary}")
            raise ValueError(f"Application configuration failed startup validation:\n{error_summary}")

    @model_validator(mode="after")
    def _validate_on_init(self) -> Settings:
        """Execute validation automatically if running in production or staging."""
        if self.APP_ENV in ("production", "staging"):
            self.validate_startup_configuration()
        return self


settings = Settings()
