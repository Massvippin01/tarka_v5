from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Generic, TypeVar

T = TypeVar("T")


class BaseRepository(ABC, Generic[T]):
    """
    Abstract repository contract.

    Every persistence implementation
    (Neo4j, PostgreSQL, etc.) implements this.
    """

    @abstractmethod
    def create(self, entity: T) -> T:
        ...

    @abstractmethod
    def update(self, entity: T) -> T:
        ...

    @abstractmethod
    def delete(self, entity_id: str) -> bool:
        ...

    @abstractmethod
    def get(self, entity_id: str) -> T | None:
        ...

    @abstractmethod
    def list(self) -> list[T]:
        ...