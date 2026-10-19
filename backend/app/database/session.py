from __future__ import annotations

import logging
from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from app.core.config import settings

logger = logging.getLogger("sentinelx.database.postgres")

_async_engine: Optional[AsyncEngine] = None
_async_sessionmaker: Optional[async_sessionmaker[AsyncSession]] = None


def get_async_engine(custom_url: Optional[str] = None) -> AsyncEngine:
    """
    Get or create the shared SQLAlchemy async engine with production connection pooling.
    """
    global _async_engine
    if custom_url is not None:
        return _build_engine(custom_url)

    if _async_engine is None:
        _async_engine = _build_engine(settings.async_database_url)
    return _async_engine


def _build_engine(url: str) -> AsyncEngine:
    engine_kwargs = {
        "echo": settings.DEBUG,
        "future": True,
    }
    # Pool sizing applies to client/server databases (PostgreSQL), not SQLite memory
    if "sqlite" not in url:
        engine_kwargs.update({
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
            "pool_timeout": settings.DB_POOL_TIMEOUT,
            "pool_pre_ping": True,
        })
    return create_async_engine(url, **engine_kwargs)


def get_async_sessionmaker(engine: Optional[AsyncEngine] = None) -> async_sessionmaker[AsyncSession]:
    """
    Get or create the async session factory.
    """
    global _async_sessionmaker
    target_engine = engine or get_async_engine()
    if engine is not None:
        return async_sessionmaker(
            bind=target_engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )

    if _async_sessionmaker is None:
        _async_sessionmaker = async_sessionmaker(
            bind=target_engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _async_sessionmaker


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding an async database session within a transaction context.
    """
    session_factory = get_async_sessionmaker()
    async with session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def close_db_engine() -> None:
    """
    Dispose of the async engine and connection pool on application shutdown.
    """
    global _async_engine, _async_sessionmaker
    if _async_engine is not None:
        try:
            await _async_engine.dispose()
            logger.info("SQLAlchemy async database engine closed")
        except Exception as e:
            logger.warning(f"Error closing async database engine: {e}")
        finally:
            _async_engine = None
            _async_sessionmaker = None
