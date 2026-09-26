from __future__ import annotations

import hashlib
import io
import os
import shutil
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, BinaryIO, Dict, Optional

from app.storage.base import (
    EvidenceByteStore,
    StorageError,
    StorageImmutabilityViolation,
    StorageIntegrityError,
    StorageNotFoundError,
    StorageObjectMetadata,
    StorageVerificationResult,
)


class FilesystemEvidenceByteStore(EvidenceByteStore):
    """
    Local filesystem content-addressed storage (CAS) implementation.
    
    Used for local development, deterministic test execution, and offline environments.
    Guarantees atomic writes (via tempfile + replace), streaming bounded-memory hashing,
    and fail-closed immutability.
    """

    def __init__(
        self,
        root_dir: Optional[Path | str] = None,
        legacy_naming: bool = False,
    ):
        if root_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
            self.root_dir = base_dir / "data" / "storage" / "artifacts"
        else:
            self.root_dir = Path(root_dir)

        self.legacy_naming = legacy_naming
        self.root_dir.mkdir(parents=True, exist_ok=True)

    def _clean_path_from_uri(self, uri_or_key: str) -> Path:
        """Resolve a storage URI or relative key to a filesystem Path."""
        clean = uri_or_key
        if clean.startswith("file:///"):
            clean = clean[7:]  # Keep leading slash or Windows drive
        elif clean.startswith("file://"):
            clean = clean[7:]

        # Handle Windows drive paths like /C:/...
        p = Path(clean)
        if not p.is_absolute():
            p = self.root_dir / p
        return p

    def compute_cas_key(
        self,
        content_hash: str,
        is_quarantined: bool = False,
        filename: Optional[str] = None,
    ) -> str:
        clean_hash = content_hash.lower().strip()
        shard1 = clean_hash[:2]
        shard2 = clean_hash[2:4]

        if self.legacy_naming and filename:
            name = f"QUARANTINED_{clean_hash}_{filename}" if is_quarantined else f"{clean_hash}_{filename}"
            return f"{shard1}/{shard2}/{name}"

        prefix = "quarantine" if is_quarantined else "sha256"
        name = f"QUARANTINED_{clean_hash}" if is_quarantined else clean_hash
        if filename:
            name = f"{name}_{filename}"
        return f"{prefix}/{shard1}/{shard2}/{name}"

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
        clean_hash = content_hash.lower().strip()
        rel_key = self.compute_cas_key(clean_hash, is_quarantined=is_quarantined, filename=filename)
        target_path = self.root_dir / rel_key
        target_dir = target_path.parent
        target_dir.mkdir(parents=True, exist_ok=True)

        storage_uri = f"file://{target_path.as_posix()}"

        # 1. Immutability check if object already exists
        if target_path.exists():
            stat = target_path.stat()
            if stat.st_size != file_size:
                raise StorageImmutabilityViolation(
                    f"CAS collision error: Object exists at '{target_path.name}' "
                    f"with size {stat.st_size} bytes vs declared {file_size} bytes."
                )

            existing_verify = self.verify(str(target_path), clean_hash)
            if not existing_verify.verified:
                raise StorageImmutabilityViolation(
                    f"CAS collision error: Object exists at '{target_path.name}' "
                    f"with differing hash '{existing_verify.storage_hash}' vs expected '{clean_hash}'."
                )

            # Verify that incoming stream matches declared content hash
            hasher = hashlib.sha256()
            stream_bytes = 0
            if stream.seekable():
                stream.seek(0)
            while True:
                chunk = stream.read(65536)
                if not chunk:
                    break
                hasher.update(chunk)
                stream_bytes += len(chunk)
            if stream.seekable():
                stream.seek(0)

            computed_stream_hash = hasher.hexdigest().lower()
            if computed_stream_hash != clean_hash:
                raise StorageIntegrityError(
                    f"Supplied stream hash '{computed_stream_hash}' does not match declared hash '{clean_hash}'."
                )
            if stream_bytes != file_size:
                raise StorageIntegrityError(
                    f"Supplied stream size {stream_bytes} does not match declared size {file_size}."
                )

            # Idempotent re-put of verified identical content
            return storage_uri

        # 2. Write to atomic temporary file in same directory
        temp_filename = f".tmp_{uuid.uuid4().hex}"
        temp_path = target_dir / temp_filename

        hasher = hashlib.sha256()
        bytes_written = 0

        try:
            if stream.seekable():
                stream.seek(0)

            with open(temp_path, "wb") as f_out:
                while True:
                    chunk = stream.read(65536)
                    if not chunk:
                        break
                    f_out.write(chunk)
                    hasher.update(chunk)
                    bytes_written += len(chunk)
                f_out.flush()
                os.fsync(f_out.fileno())

            computed_hash = hasher.hexdigest().lower()

            # For unquarantined writes, verify integrity before moving to final destination
            if not is_quarantined:
                if computed_hash != clean_hash:
                    raise StorageIntegrityError(
                        f"Streaming hash mismatch during write. Declared: {clean_hash}, Computed: {computed_hash}"
                    )
                if bytes_written != file_size:
                    raise StorageIntegrityError(
                        f"Stream size mismatch during write. Declared: {file_size}, Written: {bytes_written}"
                    )

            # Atomic rename
            os.replace(temp_path, target_path)

        except Exception:
            if temp_path.exists():
                temp_path.unlink(missing_ok=True)
            raise

        return storage_uri

    def get_stream(self, storage_uri_or_key: str) -> BinaryIO:
        target_path = self._clean_path_from_uri(storage_uri_or_key)
        if not target_path.exists() or not target_path.is_file():
            raise StorageNotFoundError(f"Artifact payload missing on filesystem at {target_path}")
        return open(target_path, "rb")

    def get_bytes(self, storage_uri_or_key: str) -> bytes:
        with self.get_stream(storage_uri_or_key) as s:
            return s.read()

    def head(self, storage_uri_or_key: str) -> Optional[StorageObjectMetadata]:
        target_path = self._clean_path_from_uri(storage_uri_or_key)
        if not target_path.exists() or not target_path.is_file():
            return None

        stat = target_path.stat()
        verify_res = self.verify(str(target_path), "")
        return StorageObjectMetadata(
            content_hash=verify_res.storage_hash or "",
            size_bytes=stat.st_size,
            mime_type="application/octet-stream",
            storage_uri=f"file://{target_path.as_posix()}",
            created_at=datetime.fromtimestamp(stat.st_ctime, tz=UTC).isoformat(),
        )

    def exists(self, storage_uri_or_key: str) -> bool:
        target_path = self._clean_path_from_uri(storage_uri_or_key)
        return target_path.exists() and target_path.is_file()

    def verify(self, storage_uri_or_key: str, expected_hash: str) -> StorageVerificationResult:
        target_path = self._clean_path_from_uri(storage_uri_or_key)
        if not target_path.exists() or not target_path.is_file():
            return StorageVerificationResult(
                verified=False,
                recorded_hash=expected_hash,
                storage_hash=None,
                size_bytes=0,
                error=f"Artifact payload missing on storage at {target_path}",
            )

        hasher = hashlib.sha256()
        total_bytes = 0
        with open(target_path, "rb") as f:
            while True:
                chunk = f.read(65536)
                if not chunk:
                    break
                hasher.update(chunk)
                total_bytes += len(chunk)

        computed_hash = hasher.hexdigest().lower()
        clean_expected = expected_hash.lower().strip() if expected_hash else ""

        is_match = (computed_hash == clean_expected) if clean_expected else True
        err = None if is_match else f"Hash mismatch: storage={computed_hash} != expected={clean_expected}"

        return StorageVerificationResult(
            verified=is_match,
            recorded_hash=clean_expected,
            storage_hash=computed_hash,
            size_bytes=total_bytes,
            error=err,
        )

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
        q_meta = dict(metadata or {})
        q_meta["quarantine_reason"] = reason
        q_meta["quarantined_at"] = datetime.now(UTC).isoformat()

        return self.put_stream(
            stream=stream,
            content_hash=content_hash,
            file_size=file_size,
            mime_type=mime_type,
            metadata=q_meta,
            is_quarantined=True,
            filename=filename,
        )

    def delete_if_uncommitted(self, storage_uri_or_key: str) -> bool:
        target_path = self._clean_path_from_uri(storage_uri_or_key)
        if target_path.exists():
            target_path.unlink()
            return True
        return False

    def health_check(self) -> Dict[str, Any]:
        try:
            test_file = self.root_dir / f".health_{uuid.uuid4().hex}.tmp"
            test_file.write_bytes(b"HEALTHCHECK")
            test_file.unlink()
            return {
                "status": "HEALTHY",
                "backend": "filesystem",
                "root_dir": str(self.root_dir),
            }
        except Exception as e:
            return {
                "status": "UNHEALTHY",
                "backend": "filesystem",
                "root_dir": str(self.root_dir),
                "error": str(e),
            }
