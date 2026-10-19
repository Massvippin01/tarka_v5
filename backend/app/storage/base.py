from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, BinaryIO, Dict, Optional


class StorageError(Exception):
    """Base exception for all storage operations."""
    pass


class StorageImmutabilityViolation(StorageError):
    """Raised when an attempt is made to overwrite an existing CAS object with different bytes."""
    pass


class StorageIntegrityError(StorageError):
    """Raised when object hash, size, or verification fails during or after write."""
    pass


class StorageNotFoundError(StorageError):
    """Raised when a requested storage URI or key does not exist on the storage backend."""
    pass


class StorageQuarantineError(StorageError):
    """Raised when an artifact fails ingestion validation and is placed into quarantine."""
    pass


@dataclass(frozen=True)
class StorageObjectMetadata:
    """Metadata describing an object stored in CAS."""
    content_hash: str
    size_bytes: int
    mime_type: str
    storage_uri: str
    created_at: str
    etag: Optional[str] = None
    custom_metadata: Dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class StorageVerificationResult:
    """Result of verifying a stored object against its authoritative cryptographic hash."""
    verified: bool
    recorded_hash: str
    storage_hash: Optional[str]
    size_bytes: int
    error: Optional[str] = None


@dataclass(frozen=True)
class QuarantineRecord:
    """Forensic record generated when evidence fails validation."""
    content_hash: str
    observed_hash: str
    declared_hash: Optional[str]
    reason: str
    storage_uri: str
    timestamp: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    artifact_id: Optional[str] = None
    operator_id: Optional[str] = None


class EvidenceByteStore(ABC):
    """
    Authoritative abstraction for immutable, content-addressed evidence byte storage.
    
    Invariants:
    1. IMMUTABILITY: Objects are indexed by their SHA-256 content hash. Overwriting
       an existing object with differing bytes is strictly forbidden and fails closed.
    2. STREAMING: Large evidence must be written and hashed in bounded memory chunks.
    3. SEPARATION: Raw bytes are stored in the byte store; structured metadata resides in PostgreSQL.
    4. CUSTODY & REPRODUCIBILITY: Every stored object can be verified against its full SHA-256 digest.
    """

    @abstractmethod
    def compute_cas_key(
        self,
        content_hash: str,
        is_quarantined: bool = False,
        filename: Optional[str] = None,
    ) -> str:
        """
        Derive the canonical storage object key from the SHA-256 digest.
        Standard layout: sha256/<h[:2]>/<h[2:4]>/<full_sha256>
        Quarantine layout: quarantine/<h[:2]>/<h[2:4]>/<full_sha256>
        """
        pass

    @abstractmethod
    def put_stream(
        self,
        stream: BinaryIO,
        content_hash: str,
        file_size: int,
        mime_type: str,
        metadata: Optional[Dict[str, str]] = None,
        is_quarantined: bool = False,
        filename: Optional[str] = None,
    ) -> str:
        """
        Store binary stream into CAS under its deterministic content hash key.
        
        Returns:
            storage_uri: Canonical URI (e.g. s3://bucket/key or file:///path).
            
        Raises:
            StorageImmutabilityViolation: If key already exists with conflicting bytes.
            StorageIntegrityError: If upload or verification fails.
        """
        pass

    @abstractmethod
    def get_stream(self, storage_uri_or_key: str) -> BinaryIO:
        """
        Open a readable binary stream for the given storage URI or key.
        
        Raises:
            StorageNotFoundError: If object does not exist.
        """
        pass

    @abstractmethod
    def get_bytes(self, storage_uri_or_key: str) -> bytes:
        """
        Retrieve complete bytes for the given storage URI or key.
        For large artifacts, prefer get_stream.
        """
        pass

    @abstractmethod
    def head(self, storage_uri_or_key: str) -> Optional[StorageObjectMetadata]:
        """
        Retrieve object metadata without downloading full payload.
        Returns None if object does not exist.
        """
        pass

    @abstractmethod
    def exists(self, storage_uri_or_key: str) -> bool:
        """Check if an object exists on storage."""
        pass

    @abstractmethod
    def verify(self, storage_uri_or_key: str, expected_hash: str) -> StorageVerificationResult:
        """
        Stream object from storage, incrementally compute SHA-256, and verify
        against expected_hash. Memory usage must remain bounded.
        """
        pass

    @abstractmethod
    def quarantine(
        self,
        stream: BinaryIO,
        content_hash: str,
        file_size: int,
        mime_type: str,
        reason: str,
        metadata: Optional[Dict[str, str]] = None,
        filename: Optional[str] = None,
    ) -> str:
        """
        Isolate an unverified or corrupted artifact into quarantine storage.
        Preserves forensic evidence bytes while preventing normal investigative ingestion.
        """
        pass

    @abstractmethod
    def delete_if_uncommitted(self, storage_uri_or_key: str) -> bool:
        """
        Compensating deletion allowed ONLY when a surrounding transaction aborted
        prior to metadata commitment. Normal evidence deletion is forbidden.
        """
        pass

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """Verify storage backend availability and connectivity."""
        pass
