from __future__ import annotations

from sqlalchemy import JSON
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import DeclarativeBase

# Cross-dialect JSON type: uses JSONB in PostgreSQL, standard JSON in SQLite
JSONVariant = JSON().with_variant(postgresql.JSONB(), "postgresql")


class Base(DeclarativeBase):
    """Authoritative SQLAlchemy 2.x Declarative Base for SentinelX models."""
    pass
