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


class EvidenceGateway:
    """
    Dedicated Evidence Ingestion Gateway.
    
    Responsibilities:
    - Secure streaming acquisition of digital artifacts
    - Deterministic SHA-256 content hashing (full 64-char digest)
    - MIME type detection and byte-level validation
    - Checksum verification & quarantine of corrupted or mismatched artifacts
    - Immutable, content-addressed storage (append-only)
    - UUIDv7 artifact identity generation (Artifact ID != Content Hash)
    - Chain-of-custody event generation and integrity tracking
    - Immutable artifact registration in UnifiedStore
    """

    _instance: Optional[EvidenceGateway] = None

    def __init__(self, storage_root: Optional[Union[str, Path]] = None, store: Optional[UnifiedStore] = None):
        if storage_root is None:
            # Default to data/storage/artifacts in project root
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
            self.storage_root = base_dir / "data" / "storage" / "artifacts"
        else:
            self.storage_root = Path(storage_root)

        self.storage_root.mkdir(parents=True, exist_ok=True)
        self.store = store or UnifiedStore.get_instance()

    @classmethod
    def get_instance(cls) -> EvidenceGateway:
        if cls._instance is None:
            cls._instance = EvidenceGateway()
        return cls._instance

    def compute_stream_sha256(self, stream: BinaryIO, chunk_size: int = 65536) -> Tuple[str, int]:
        """
        Compute SHA-256 hash and byte length of a binary stream without loading full file in memory.
        Resets stream pointer to 0 if seekable.
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

        return hasher.hexdigest(), total_bytes

    def detect_mime_type(self, filename: str, sample_bytes: bytes) -> str:
        """
        Detect MIME type using filename hints and file magic/signatures.
        """
        # Signature detection
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

        # Fallback to mimetypes library
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
    ) -> EvidenceArtifact:
        """
        Ingest an artifact into the platform with strict forensic controls:
        1. Streaming SHA-256 calculation
        2. Expected hash verification
        3. Quarantine on checksum failure
        4. Immutable content-addressed filesystem storage
        5. UUIDv7 artifact identity assignment
        6. Chain-of-custody creation
        7. UnifiedStore registration
        """
        # Convert bytes to stream if needed
        if isinstance(content, bytes):
            stream = io.BytesIO(content)
        else:
            stream = content

        # 1. Compute SHA-256 and size
        content_hash, file_size = self.compute_stream_sha256(stream)

        # 2. Peek initial bytes for MIME detection
        sample_bytes = stream.read(512)
        if stream.seekable():
            stream.seek(0)
        mime_type = self.detect_mime_type(filename, sample_bytes)

        # 3. Verify against expected checksum
        integrity_status = IntegrityStatus.VERIFIED
        is_quarantined = False

        if expected_sha256:
            clean_expected = expected_sha256.lower().strip()
            if content_hash != clean_expected:
                integrity_status = IntegrityStatus.MISMATCH
                is_quarantined = True

        # 4. Determine storage path
        # Sharded by first 4 characters of hash: storage/artifacts/ab/cd/{sha256}_{filename}
        shard1 = content_hash[:2]
        shard2 = content_hash[2:4]
        target_dir = self.storage_root / shard1 / shard2
        target_dir.mkdir(parents=True, exist_ok=True)
        
        target_filename = f"{content_hash}_{filename}"
        if is_quarantined:
            target_filename = f"QUARANTINED_{content_hash}_{filename}"
            
        target_path = target_dir / target_filename

        # Write immutable content if not already present
        if not target_path.exists():
            with open(target_path, "wb") as f_out:
                if stream.seekable():
                    stream.seek(0)
                while True:
                    chunk = stream.read(65536)
                    if not chunk:
                        break
                    f_out.write(chunk)

        # 5. Generate distinct UUIDv7 Artifact ID
        artifact_id = generate_uuid7()

        # 6. Create initial Chain-of-Custody Event
        custody_event = EvidenceCustodyEvent(
            artifact_id=artifact_id,
            event_type=CustodyEventType.QUARANTINE if is_quarantined else CustodyEventType.INGESTION_RECEIPT,
            timestamp=datetime.now(UTC).isoformat(),
            actor_id=operator_id,
            actor_role="EVIDENCE_ACQUISITION_OFFICER",
            action_description=(
                f"Artifact '{filename}' received by Evidence Gateway. "
                f"Calculated SHA-256: {content_hash}. Status: {integrity_status.value}."
            ),
            content_hash_at_event=content_hash,
            storage_location=str(target_path.as_posix()),
            previous_event_id=None,
        )

        # 7. Assemble EvidenceArtifact
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
            storage_uri=f"file://{target_path.as_posix()}",
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

        # 8. Record Provenance
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
                }
            ],
        )

        # 9. Persist in UnifiedStore (Append-only)
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
        Recompute on-disk content hash and verify against recorded EvidenceArtifact hash.
        """
        artifact = self.store.get_artifact(artifact_id)
        if not artifact:
            return {"verified": False, "reason": "Artifact not found"}

        # Extract file path from storage URI
        uri = artifact.storage_uri
        if uri.startswith("file://"):
            file_path = Path(uri.replace("file://", ""))
        else:
            file_path = Path(uri)

        if not file_path.exists():
            return {
                "verified": False,
                "reason": f"Artifact payload missing on storage at {file_path}",
                "recorded_hash": artifact.content_hash,
            }

        with open(file_path, "rb") as f:
            current_hash, _ = self.compute_stream_sha256(f)

        is_match = (current_hash == artifact.content_hash)
        return {
            "verified": is_match,
            "recorded_hash": artifact.content_hash,
            "storage_hash": current_hash,
            "integrity_status": "VERIFIED" if is_match else "TAMPERED_OR_CORRUPT",
            "file_size_bytes": file_path.stat().st_size,
        }
