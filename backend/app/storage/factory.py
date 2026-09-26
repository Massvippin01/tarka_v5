from __future__ import annotations

from typing import Any, Optional

from app.core.config import settings
from app.storage.base import EvidenceByteStore
from app.storage.filesystem import FilesystemEvidenceByteStore
from app.storage.s3 import S3EvidenceByteStore

_default_store: Optional[EvidenceByteStore] = None


def get_evidence_byte_store(backend: Optional[str] = None, **kwargs: Any) -> EvidenceByteStore:
    """
    Factory function for instantiating the appropriate EvidenceByteStore.
    
    Fail-closed rule: Production requires S3-compatible storage authority.
    Filesystem storage is permitted only in development and test environments.
    """
    selected_backend = backend or settings.STORAGE_BACKEND

    if selected_backend == "filesystem":
        if settings.APP_ENV == "production":
            raise ValueError(
                "FAIL_CLOSED: Filesystem storage backend is strictly prohibited in PRODUCTION. "
                "S3-compatible CAS authority (AWS S3, MinIO) required."
            )
        return FilesystemEvidenceByteStore(**kwargs)

    elif selected_backend == "s3":
        return S3EvidenceByteStore(**kwargs)

    else:
        raise ValueError(f"Unknown storage backend: '{selected_backend}'. Expected 'filesystem' or 's3'.")


def get_default_byte_store() -> EvidenceByteStore:
    """Get or initialize process-wide default EvidenceByteStore singleton."""
    global _default_store
    if _default_store is None:
        _default_store = get_evidence_byte_store()
    return _default_store


def reset_default_byte_store() -> None:
    """Reset singleton instance (used in tests)."""
    global _default_store
    _default_store = None
