from __future__ import annotations

import hashlib
import io
import mimetypes
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, BinaryIO, Dict, Optional, Tuple, Union

from app.domain.canonical_evidence_ir import (
    CustodyEventType,
    EvidenceArtifact,
    EvidenceCustodyEvent,
    EvidenceProvenance,
    EvidenceSourceType,
    IntegrityStatus,
    SourceProvenanceType,
    generate_uuid7,
)
from app.repositories.unified_store import UnifiedStore
from app.storage.base import (
    EvidenceByteStore,
    StorageError,
    StorageImmutabilityViolation,
    StorageIntegrityError,
    StorageNotFoundError,
)
from app.storage.factory import get_default_byte_store
from app.storage.filesystem import FilesystemEvidenceByteStore


class EvidenceGateway:
    """
    Dedicated Evidence Ingestion Gateway.
    
    Wave 6 Target Architecture:
    - Secure streaming acquisition of digital forensic artifacts
    - Deterministic streaming SHA-256 content hashing in 64KB bounded chunks
    - MIME type sniffing and byte-level validation
    - Checksum & size validation with automatic quarantine isolation
    - Authoritative handoff to EvidenceByteStore (S3/MinIO CAS or Filesystem CAS)
    - Immediate post-storage cryptographic verification
    - Monotonic UUIDv7 artifact identity generation (Artifact ID != Content Hash)
    - Immutable chain-of-custody tracking & provenance preservation
    - Append-only artifact registration in UnifiedStore and PostgreSQL
    """

    _instance: Optional[EvidenceGateway] = None

    def __init__(
        self,
        storage_root: Optional[Union[str, Path]] = None,
        store: Optional[UnifiedStore] = None,
        byte_store: Optional[EvidenceByteStore] = None,
    ):
        if byte_store is not None:
            self.byte_store = byte_store
        elif storage_root is not None:
            # Preserves legacy filesystem test fixtures with filename layout
            self.byte_store = FilesystemEvidenceByteStore(root_dir=storage_root, legacy_naming=True)
        else:
            self.byte_store = get_default_byte_store()

        # Expose storage_root if backed by filesystem for compatibility
        if isinstance(self.byte_store, FilesystemEvidenceByteStore):
            self.storage_root = self.byte_store.root_dir
        else:
            self.storage_root = None

        self.store = store or UnifiedStore.get_instance()

    @classmethod
    def get_instance(cls) -> EvidenceGateway:
        if cls._instance is None:
            cls._instance = EvidenceGateway()
        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """Reset singleton instance (used in tests)."""
        cls._instance = None

    def compute_stream_sha256(self, stream: BinaryIO, chunk_size: int = 65536) -> Tuple[str, int]:
        """
        Compute SHA-256 hash and byte length of a binary stream without loading full file into memory.
        Bounded memory usage guaranteed. Resets stream pointer to 0 if seekable.
        """
        hasher = hashlib.sha256()
        total_bytes = 0

        if stream.seekable():
            stream.seek(0)

        while True:
            chunk = stream.read(chunk_size)
            if not chunk:
                break
            total_bytes += len(chunk)
            hasher.update(chunk)

        if stream.seekable():
            stream.seek(0)

        return hasher.hexdigest().lower(), total_bytes

    def detect_mime_type(self, filename: str, sample_bytes: bytes) -> str:
        """
        Detect MIME type using file signatures (magic bytes) with fallback to mimetypes table.
        """
        if sample_bytes.startswith(b"%PDF"):
            return "application/pdf"
        elif sample_bytes.startswith(b"PK\x03\x04"):
            return "application/zip"
        elif sample_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png"
        elif sample_bytes.startswith(b"\xff\xd8\xff"):
            return "image/jpeg"
        elif sample_bytes.startswith(b"{\n") or sample_bytes.startswith(b'{"') or sample_bytes.startswith(b"[{"):
            return "application/json"
        elif sample_bytes.startswith(b"<?xml") or sample_bytes.startswith(b"<"):
            return "application/xml"

        guessed, _ = mimetypes.guess_type(filename)
        return guessed or "application/octet-stream"

    def ingest_artifact(
        self,
        content: Union[bytes, BinaryIO],
        filename: str,
        case_id: str,
        source_id: str,
        source_type: EvidenceSourceType,
        record_id: str,
        provenance_type: SourceProvenanceType = SourceProvenanceType.SYNTHETIC_DATA,
        artifact_type: str = "RAW_EXPORT",
        expected_sha256: Optional[str] = None,
        operator_id: str = "OFFICER_IN_CHARGE",
        jurisdiction: str = "Delhi NCR",
        classification: str = "CONFIDENTIAL_LAW_ENFORCEMENT",
        observed_at: Optional[str] = None,
        parent_artifact_id: Optional[str] = None,
        parser: Optional[str] = None,
        parser_version: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        declared_size_bytes: Optional[int] = None,
    ) -> EvidenceArtifact:
        """
        Ingest an artifact into the platform through the canonical evidence path:
        1. Streaming SHA-256 calculation (bounded memory)
        2. Header sniffing for MIME detection
        3. Checksum & declared size verification
        4. Quarantine decision if corrupt or mismatched
        5. Authoritative byte store handoff (S3/MinIO CAS or Filesystem CAS)
        6. Immediate post-storage cryptographic verification
        7. Monotonic UUIDv7 artifact identity assignment (UUIDv7 != SHA-256)
        8. Initial chain-of-custody event generation
        9. Provenance lineage recording
        10. UnifiedStore registration
        """
        # Convert bytes to seekable stream if needed
        if isinstance(content, bytes):
            stream: BinaryIO = io.BytesIO(content)
        else:
            stream = content

        # 1. Compute streaming SHA-256 and byte length
        content_hash, file_size = self.compute_stream_sha256(stream)

        # 2. Peek initial bytes for MIME detection
        sample_bytes = stream.read(512)
        if stream.seekable():
            stream.seek(0)
        mime_type = self.detect_mime_type(filename, sample_bytes)

        # 3. Checksum & byte-size verification
        integrity_status = IntegrityStatus.VERIFIED
        is_quarantined = False
        quarantine_reasons = []

        if expected_sha256:
            clean_expected = expected_sha256.lower().strip()
            if content_hash != clean_expected:
                integrity_status = IntegrityStatus.MISMATCH
                is_quarantined = True
                quarantine_reasons.append(
                    f"Checksum mismatch: expected {clean_expected}, observed {content_hash}"
                )

        if declared_size_bytes is not None:
            if file_size != declared_size_bytes:
                integrity_status = IntegrityStatus.MISMATCH
                is_quarantined = True
                quarantine_reasons.append(
                    f"Byte size mismatch: declared {declared_size_bytes}, observed {file_size}"
                )

        # 4. Storage handoff
        if is_quarantined:
            quarantine_reason_str = "; ".join(quarantine_reasons)
            storage_uri = self.byte_store.quarantine(
                stream=stream,
                content_hash=content_hash,
                file_size=file_size,
                mime_type=mime_type,
                reason=quarantine_reason_str,
                metadata=metadata,
                filename=filename,
            )
        else:
            storage_uri = self.byte_store.put_stream(
                stream=stream,
                content_hash=content_hash,
                file_size=file_size,
                mime_type=mime_type,
                metadata=metadata,
                filename=filename,
            )

        # 5. Immediate post-storage verification
        if not is_quarantined:
            verify_res = self.byte_store.verify(storage_uri, content_hash)
            if not verify_res.verified:
                raise StorageIntegrityError(
                    f"Post-storage verification failed for '{storage_uri}': {verify_res.error}"
                )

        # 6. Generate distinct UUIDv7 Artifact ID
        artifact_id = generate_uuid7()

        # 7. Create initial Chain-of-Custody Event
        event_type = CustodyEventType.QUARANTINE if is_quarantined else CustodyEventType.INGESTION_RECEIPT
        action_desc = (
            f"Artifact '{filename}' quarantined by Evidence Gateway. Reasons: {'; '.join(quarantine_reasons)}."
            if is_quarantined
            else f"Artifact '{filename}' received by Evidence Gateway. Calculated SHA-256: {content_hash}. Status: VERIFIED."
        )

        custody_event = EvidenceCustodyEvent(
            artifact_id=artifact_id,
            event_type=event_type,
            timestamp=datetime.now(UTC).isoformat(),
            actor_id=operator_id,
            actor_role="EVIDENCE_ACQUISITION_OFFICER",
            action_description=action_desc,
            content_hash_at_event=content_hash,
            storage_location=storage_uri,
            previous_event_id=None,
        )

        # 8. Assemble EvidenceArtifact
        artifact = EvidenceArtifact(
            artifact_id=artifact_id,
            case_id=case_id,
            source_id=source_id,
            source_type=source_type,
            provenance_type=provenance_type,
            record_id=record_id,
            artifact_type=artifact_type,
            content_hash=content_hash,
            hash_algorithm="SHA-256",
            file_size_bytes=file_size,
            mime_type=mime_type,
            storage_uri=storage_uri,
            created_at=datetime.now(UTC).isoformat(),
            observed_at=observed_at or datetime.now(UTC).isoformat(),
            acquired_at=datetime.now(UTC).isoformat(),
            acquisition_method="STREAMING_GATEWAY_INGEST",
            operator_id=operator_id,
            jurisdiction=jurisdiction,
            classification=classification,
            parent_artifact_id=parent_artifact_id,
            parser=parser,
            parser_version=parser_version,
            integrity_status=integrity_status,
            custody_chain=[custody_event],
            metadata=metadata or {},
        )

        # 9. Record Provenance
        provenance = EvidenceProvenance(
            artifact_id=artifact.artifact_id,
            root_artifact_hash=content_hash,
            provenance_type=provenance_type,
            source_system=source_type.value,
            acquisition_audit_id=custody_event.custody_event_id,
            lineage_steps=[
                {
                    "step": "ACQUIRED_BY_GATEWAY",
                    "timestamp": datetime.now(UTC).isoformat(),
                    "actor": operator_id,
                    "hash": content_hash,
                    "storage_uri": storage_uri,
                }
            ],
        )

        # 10. Persist metadata in UnifiedStore (Append-only)
        self.store.save_artifact(artifact)
        self.store.save_custody_event(custody_event)
        self.store.save_provenance(provenance)

        return artifact

    def append_custody_transfer(
        self,
        artifact_id: str,
        actor_id: str,
        actor_role: str,
        action_description: str,
        location: str,
        event_type: CustodyEventType = CustodyEventType.TRANSFER_CUSTODY,
    ) -> EvidenceCustodyEvent:
        """
        Record a verifiable custody transfer or forensic handoff in the immutable custody chain.
        """
        artifact = self.store.get_artifact(artifact_id)
        if not artifact:
            raise ValueError(f"Artifact {artifact_id} not found in store")

        previous_event_id = artifact.custody_chain[-1].custody_event_id if artifact.custody_chain else None

        event = EvidenceCustodyEvent(
            artifact_id=artifact_id,
            event_type=event_type,
            timestamp=datetime.now(UTC).isoformat(),
            actor_id=actor_id,
            actor_role=actor_role,
            action_description=action_description,
            content_hash_at_event=artifact.content_hash,
            storage_location=location,
            previous_event_id=previous_event_id,
        )

        # Append to artifact chain and store
        artifact.custody_chain.append(event)
        self.store.save_custody_event(event)
        return event

    def verify_artifact_integrity(self, artifact_id: str) -> Dict[str, Any]:
        """
        Recompute storage content hash and verify against recorded EvidenceArtifact hash.
        Delegates verification to EvidenceByteStore.
        """
        artifact = self.store.get_artifact(artifact_id)
        if not artifact:
            return {"verified": False, "reason": "Artifact not found"}

        res = self.byte_store.verify(artifact.storage_uri, artifact.content_hash)
        return {
            "verified": res.verified,
            "recorded_hash": artifact.content_hash,
            "storage_hash": res.storage_hash,
            "integrity_status": "VERIFIED" if res.verified else "TAMPERED_OR_CORRUPT",
            "file_size_bytes": res.size_bytes,
            "reason": res.error,
        }

    def get_artifact_stream(self, artifact_id: str) -> BinaryIO:
        """Retrieve a readable binary stream for the artifact's raw evidence bytes."""
        artifact = self.store.get_artifact(artifact_id)
        if not artifact:
            raise StorageNotFoundError(f"Artifact '{artifact_id}' not found in store.")
        return self.byte_store.get_stream(artifact.storage_uri)

    def get_artifact_bytes(self, artifact_id: str) -> bytes:
        """Retrieve raw evidence bytes for an artifact."""
        artifact = self.store.get_artifact(artifact_id)
        if not artifact:
            raise StorageNotFoundError(f"Artifact '{artifact_id}' not found in store.")
        return self.byte_store.get_bytes(artifact.storage_uri)
