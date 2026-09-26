from __future__ import annotations

import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_async_sessionmaker
from app.repositories.postgres_repository import (
    PostgresAuditRepository,
    PostgresCaseRepository,
    PostgresEntityRepository,
    PostgresEpistemicRepository,
    PostgresEvidenceRepository,
)

logger = logging.getLogger("sentinelx.repositories.uow")


class UnitOfWork:
    """
    Authoritative Unit of Work pattern for managing transactional boundaries.
    Guarantees atomicity across cases, evidence metadata, facts, claims, and audit events.
    """
    def __init__(self, session: Optional[AsyncSession] = None):
        self._external_session = session is not None
        self._session = session
        self.cases: Optional[PostgresCaseRepository] = None
        self.evidence: Optional[PostgresEvidenceRepository] = None
        self.epistemic: Optional[PostgresEpistemicRepository] = None
        self.entities: Optional[PostgresEntityRepository] = None
        self.audit: Optional[PostgresAuditRepository] = None

    async def __aenter__(self) -> "UnitOfWork":
        if self._session is None:
            session_factory = get_async_sessionmaker()
            self._session = session_factory()

        self.cases = PostgresCaseRepository(self._session)
        self.evidence = PostgresEvidenceRepository(self._session)
        self.epistemic = PostgresEpistemicRepository(self._session)
        self.entities = PostgresEntityRepository(self._session)
        self.audit = PostgresAuditRepository(self._session)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        try:
            if exc_type is not None:
                await self.rollback()
        finally:
            if not self._external_session and self._session is not None:
                await self._session.close()

    async def commit(self) -> None:
        if self._session is not None:
            await self._session.commit()

    async def rollback(self) -> None:
        if self._session is not None:
            await self._session.rollback()
