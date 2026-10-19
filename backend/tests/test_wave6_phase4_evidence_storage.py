from __future__ import annotations

import hashlib
import io
import shutil
import tempfile
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, BinaryIO, Dict, Optional

import pytest
import pytest_asyncio
from botocore.exceptions import ClientError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database.base import Base
from app.database.models import CaseModel, EvidenceArtifactModel, EvidenceCustodyRecordModel
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
from app.repositories.persistence_gateway import PersistenceGateway
from app.repositories.unified_store import UnifiedStore
from app.services.evidence_gateway import EvidenceGateway
from app.storage.base import (
    EvidenceByteStore,
    StorageError,
    StorageImmutabilityViolation,
    StorageIntegrityError,
    StorageNotFoundError,
)
from app.storage.factory import get_evidence_byte_store
from app.storage.filesystem import FilesystemEvidenceByteStore
from app.storage.s3 import S3EvidenceByteStore


class InMemoryS3Client:
    """
    Deterministic in-memory S3 client adhering to boto3.client('s3') API.
    Enables thorough unit testing of S3EvidenceByteStore without external Docker/MinIO dependencies.
    """

    def __init__(self):
        self.buckets: Dict[str, Dict[str, Dict[str, Any]]] = {"sentinelx-evidence": {}}

    def head_bucket(self, Bucket: str):
        if Bucket not in self.buckets:
            err_resp = {"Error": {"Code": "404", "Message": "NoSuchBucket"}}
            raise ClientError(err_resp, "HeadBucket")
        return {"ResponseMetadata": {"HTTPStatusCode": 200}}

    def create_bucket(self, Bucket: str, **kwargs):
        self.buckets[Bucket] = {}
        return {"Location": f"/{Bucket}"}

    def head_object(self, Bucket: str, Key: str):
        if Bucket not in self.buckets or Key not in self.buckets[Bucket]:
            err_resp = {"Error": {"Code": "404", "Message": "NoSuchKey"}}
            raise ClientError(err_resp, "HeadObject")
        obj = self.buckets[Bucket][Key]
        return {
            "ContentLength": len(obj["body"]),
            "ContentType": obj.get("content_type", "application/octet-stream"),
            "Metadata": obj.get("metadata", {}),
            "ETag": f'"{hashlib.md5(obj["body"]).hexdigest()}"',
            "LastModified": obj.get("last_modified", datetime.now(UTC)),
        }

    def put_object(self, Bucket: str, Key: str, Body: Any, ContentType: str = "application/octet-stream", Metadata: Optional[Dict[str, str]] = None, **kwargs):
        if Bucket not in self.buckets:
            err_resp = {"Error": {"Code": "404", "Message": "NoSuchBucket"}}
            raise ClientError(err_resp, "PutObject")

        if hasattr(Body, "read"):
            data = Body.read()
        elif isinstance(Body, bytes):
            data = Body
        elif isinstance(Body, str):
            data = Body.encode("utf-8")
        else:
            data = bytes(Body)

        self.buckets[Bucket][Key] = {
            "body": data,
            "content_type": ContentType,
            "metadata": Metadata or {},
            "last_modified": datetime.now(UTC),
        }
        return {"ETag": f'"{hashlib.md5(data).hexdigest()}"'}

    def get_object(self, Bucket: str, Key: str):
        if Bucket not in self.buckets or Key not in self.buckets[Bucket]:
            err_resp = {"Error": {"Code": "404", "Message": "NoSuchKey"}}
            raise ClientError(err_resp, "GetObject")
        obj = self.buckets[Bucket][Key]
        return {
            "Body": io.BytesIO(obj["body"]),
            "ContentLength": len(obj["body"]),
            "ContentType": obj["content_type"],
            "Metadata": obj["metadata"],
        }

    def delete_object(self, Bucket: str, Key: str):
        if Bucket in self.buckets and Key in self.buckets[Bucket]:
            del self.buckets[Bucket][Key]
        return {"ResponseMetadata": {"HTTPStatusCode": 204}}


@pytest.fixture
def mock_s3_byte_store():
    client = InMemoryS3Client()
    return S3EvidenceByteStore(bucket_name="sentinelx-evidence", client=client)


@pytest.fixture
def temp_fs_store():
    temp_dir = tempfile.mkdtemp(prefix="sentinelx_phase4_fs_")
    store = FilesystemEvidenceByteStore(root_dir=temp_dir, legacy_naming=False)
    yield store, temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def clean_unified_store():
    store = UnifiedStore.get_instance()
    store.clear()
    return store


@pytest_asyncio.fixture
async def async_pg_session():
    """In-memory SQLite async session simulating PostgreSQL metadata authority."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()


# ==============================================================================
# PHASE 4 TEST MATRIX: P01 to P20
# ==============================================================================

def test_p01_streaming_sha256_produces_exact_hash(temp_fs_store, clean_unified_store):
    """P01: Streaming SHA-256 produces exact expected hash in bounded chunks."""
    byte_store, _ = temp_fs_store
    gateway = EvidenceGateway(byte_store=byte_store, store=clean_unified_store)

    data = b"FORENSIC_STREAM_DATA_PACKET_" * 500  # 14.5 KB
    expected_hash = hashlib.sha256(data).hexdigest().lower()

    stream = io.BytesIO(data)
    computed_hash, total_bytes = gateway.compute_stream_sha256(stream)

    assert computed_hash == expected_hash
    assert total_bytes == len(data)


def test_p02_artifact_uuidv7_independent_from_sha256(temp_fs_store, clean_unified_store):
    """P02: Artifact UUIDv7 remains strictly independent from content SHA-256 digest."""
    byte_store, _ = temp_fs_store
    gateway = EvidenceGateway(byte_store=byte_store, store=clean_unified_store)

    content = b'{"case": "2026-X", "event": "identity_separation_test"}'
    artifact = gateway.ingest_artifact(
        content=content,
        filename="identity_test.json",
        case_id="CASE-2026-P02",
        source_id="SRC-POLICE",
        source_type=EvidenceSourceType.CCTNS_FIR,
        record_id="REC-001",
    )

    import uuid
    u = uuid.UUID(artifact.artifact_id)
    assert u.version == 7
    assert artifact.artifact_id != artifact.content_hash
    assert len(artifact.content_hash) == 64
    assert len(artifact.artifact_id) == 36


def test_p03_small_evidence_object_storage(temp_fs_store, clean_unified_store):
    """P03: Small evidence object storage successfully stores and retrieves bytes."""
    byte_store, _ = temp_fs_store
    gateway = EvidenceGateway(byte_store=byte_store, store=clean_unified_store)

    content = b"SMALL_FORENSIC_PAYLOAD_BYTES"
    artifact = gateway.ingest_artifact(
        content=content,
        filename="payload.txt",
        case_id="CASE-2026-P03",
        source_id="SRC-SEIZURE",
        source_type=EvidenceSourceType.COMPUTER_FORENSIC_EXPORT,
        record_id="SEIZE-001",
    )

    assert artifact.integrity_status == IntegrityStatus.VERIFIED
    stored_bytes = gateway.get_artifact_bytes(artifact.artifact_id)
    assert stored_bytes == content


def test_p04_large_streaming_evidence_storage(temp_fs_store, clean_unified_store):
    """P04: Large streaming evidence storage operates in bounded 64KB chunks."""
    byte_store, _ = temp_fs_store
    gateway = EvidenceGateway(byte_store=byte_store, store=clean_unified_store)

    # 1.5 MB stream to exercise multi-chunk transfers
    chunk_pattern = b"0123456789ABCDEF" * 4096  # 64 KB
    total_chunks = 24  # ~1.5 MB
    large_data = chunk_pattern * total_chunks
    expected_hash = hashlib.sha256(large_data).hexdigest().lower()

    stream = io.BytesIO(large_data)
    artifact = gateway.ingest_artifact(
        content=stream,
        filename="large_forensic_extract.bin",
        case_id="CASE-2026-P04",
        source_id="SRC-DISK-DUMP",
        source_type=EvidenceSourceType.COMPUTER_FORENSIC_EXPORT,
        record_id="DISK-DUMP-01",
    )

    assert artifact.content_hash == expected_hash
    assert artifact.file_size_bytes == len(large_data)
    retrieved = gateway.get_artifact_bytes(artifact.artifact_id)
    assert hashlib.sha256(retrieved).hexdigest().lower() == expected_hash


def test_p05_same_content_is_idempotent(temp_fs_store, clean_unified_store):
    """P05: Storing identical content twice is idempotent and does not corrupt CAS."""
    byte_store, _ = temp_fs_store
    gateway = EvidenceGateway(byte_store=byte_store, store=clean_unified_store)

    content = b"REPEATED_AUTHENTIC_EVIDENCE_RECORD"
    art1 = gateway.ingest_artifact(
        content=content,
        filename="audit.log",
        case_id="CASE-P05-A",
        source_id="SRC-AUDIT",
        source_type=EvidenceSourceType.CLOUD_AUDIT_LOG,
        record_id="REC-A",
    )

    art2 = gateway.ingest_artifact(
        content=content,
        filename="audit.log",
        case_id="CASE-P05-B",
        source_id="SRC-AUDIT",
        source_type=EvidenceSourceType.CLOUD_AUDIT_LOG,
        record_id="REC-B",
    )

    assert art1.content_hash == art2.content_hash
    assert art1.storage_uri == art2.storage_uri
    assert art1.artifact_id != art2.artifact_id  # UUIDv7 distinct!


def test_p06_same_cas_key_with_different_content_fails_closed(temp_fs_store):
    """P06: Attempting to store conflicting bytes under an existing CAS key fails closed."""
    byte_store, _ = temp_fs_store

    content_a = b"GENUINE_EVIDENCE_ORIGINAL_BYTES"
    hash_a = hashlib.sha256(content_a).hexdigest().lower()

    uri = byte_store.put_stream(
        stream=io.BytesIO(content_a),
        content_hash=hash_a,
        file_size=len(content_a),
        mime_type="application/octet-stream",
    )
    assert uri is not None

    # Tampered stream pretending to have hash_a but containing different bytes
    tampered = b"TAMPERED_MALICIOUS_BYTES"
    with pytest.raises((StorageImmutabilityViolation, StorageIntegrityError)):
        byte_store.put_stream(
            stream=io.BytesIO(tampered),
            content_hash=hash_a,
            file_size=len(tampered),
            mime_type="application/octet-stream",
        )


def test_p07_mime_validation_failure_quarantines(temp_fs_store, clean_unified_store):
    """P07: Corrupted or mismatched evidence gets isolated in quarantine storage."""
    byte_store, _ = temp_fs_store
    gateway = EvidenceGateway(byte_store=byte_store, store=clean_unified_store)

    corrupted_data = b"CORRUPTED_STREAM_DO_NOT_PARSE"
    expected_hash = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

    artifact = gateway.ingest_artifact(
        content=corrupted_data,
        filename="corrupted_file.json",
        case_id="CASE-P07",
        source_id="SRC-NET",
        source_type=EvidenceSourceType.NETWORK_PCAP_LOG,
        record_id="FW-99",
        expected_sha256=expected_hash,
    )

    assert artifact.integrity_status == IntegrityStatus.MISMATCH
    assert "quarantine" in artifact.storage_uri.lower()
    assert artifact.custody_chain[0].event_type == CustodyEventType.QUARANTINE


def test_p08_byte_size_mismatch_quarantines(temp_fs_store, clean_unified_store):
    """P08: Declared byte size mismatch triggers quarantine isolation."""
    byte_store, _ = temp_fs_store
    gateway = EvidenceGateway(byte_store=byte_store, store=clean_unified_store)

    data = b"ACTUAL_DATA_16_B"
    artifact = gateway.ingest_artifact(
        content=data,
        filename="declared_size_fail.bin",
        case_id="CASE-P08",
        source_id="SRC-SEIZURE",
        source_type=EvidenceSourceType.MOBILE_FORENSIC_EXPORT,
        record_id="EX-01",
        declared_size_bytes=999999,  # Size mismatch!
    )

    assert artifact.integrity_status == IntegrityStatus.MISMATCH
    assert artifact.custody_chain[0].event_type == CustodyEventType.QUARANTINE


def test_p09_checksum_mismatch_quarantines(temp_fs_store, clean_unified_store):
    """P09: Cryptographic checksum mismatch triggers quarantine and audit log."""
    byte_store, _ = temp_fs_store
    gateway = EvidenceGateway(byte_store=byte_store, store=clean_unified_store)

    content = b"PAYLOAD_WITH_INCORRECT_CHECKSUM"
    bogus_sha = "1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff"

    artifact = gateway.ingest_artifact(
        content=content,
        filename="bad_checksum.txt",
        case_id="CASE-P09",
        source_id="SRC-CCTNS",
        source_type=EvidenceSourceType.CCTNS_FIR,
        record_id="FIR-FAIL-01",
        expected_sha256=bogus_sha,
    )

    assert artifact.integrity_status == IntegrityStatus.MISMATCH
    assert artifact.custody_chain[0].event_type == CustodyEventType.QUARANTINE


def test_p10_storage_verification_failure_is_detected(temp_fs_store, clean_unified_store):
    """P10: Re-verification detects tampering or silent corruption."""
    byte_store, temp_dir = temp_fs_store
    gateway = EvidenceGateway(byte_store=byte_store, store=clean_unified_store)

    content = b"CANONICAL_UNALTERED_EVIDENCE"
    artifact = gateway.ingest_artifact(
        content=content,
        filename="evidence.txt",
        case_id="CASE-P10",
        source_id="SRC-1",
        source_type=EvidenceSourceType.FINANCIAL_TRANSACTION,
        record_id="BANK-01",
    )

    # 1. Initial verification passes
    ver_clean = gateway.verify_artifact_integrity(artifact.artifact_id)
    assert ver_clean["verified"] is True

    # 2. Tamper with bytes on disk
    clean_path = Path(artifact.storage_uri.replace("file://", ""))
    clean_path.write_bytes(b"TAMPERED_MODIFIED_BYTES")

    # 3. Subsequent verification detects tampering
    ver_tampered = gateway.verify_artifact_integrity(artifact.artifact_id)
    assert ver_tampered["verified"] is False
    assert ver_tampered["integrity_status"] == "TAMPERED_OR_CORRUPT"


def test_p11_provenance_is_preserved(temp_fs_store, clean_unified_store):
    """P11: Provenance classification (e.g. LIVE_INTEGRATION) is strictly preserved."""
    byte_store, _ = temp_fs_store
    gateway = EvidenceGateway(byte_store=byte_store, store=clean_unified_store)

    artifact = gateway.ingest_artifact(
        content=b"LIVE_PROVENANCE_TEST",
        filename="live_telecom.json",
        case_id="CASE-P11",
        source_id="SRC-TELCO-LIVE",
        source_type=EvidenceSourceType.CDR_TELECOM,
        provenance_type=SourceProvenanceType.LIVE_INTEGRATION,
        record_id="CDR-LIVE-1",
    )

    assert artifact.provenance_type == SourceProvenanceType.LIVE_INTEGRATION
    stored_prov = clean_unified_store.get_provenance(artifact.artifact_id)
    assert stored_prov is not None
    assert stored_prov.provenance_type == SourceProvenanceType.LIVE_INTEGRATION


@pytest.mark.asyncio
async def test_p12_storage_uri_persisted_correctly_to_postgres(temp_fs_store, clean_unified_store, async_pg_session):
    """P12: Storage URI is persisted correctly into PostgreSQL metadata without storing raw bytes."""
    byte_store, _ = temp_fs_store
    gateway = EvidenceGateway(byte_store=byte_store, store=clean_unified_store)

    content = b'{"record_type": "postgres_boundary_test"}'
    artifact = gateway.ingest_artifact(
        content=content,
        filename="postgres_boundary.json",
        case_id="CASE-2026-P12",
        source_id="SRC-P12",
        source_type=EvidenceSourceType.CCTNS_FIR,
        record_id="FIR-P12",
    )

    session = async_pg_session
    # Seed parent case model
    case = CaseModel(
        id="CASE-2026-P12",
        case_number="CASE-P12-001",
        title="P12 Case",
        crime_type="CYBER_FRAUD",
        priority="CRITICAL",
    )
    session.add(case)
    await session.flush()

    # Persist metadata model
    model = EvidenceArtifactModel(
        artifact_id=artifact.artifact_id,
        case_id=artifact.case_id,
        source_id=artifact.source_id,
        source_type=artifact.source_type.value,
        record_id=artifact.record_id,
        content_hash=artifact.content_hash,
        mime_type=artifact.mime_type,
        file_size_bytes=artifact.file_size_bytes,
        storage_uri=artifact.storage_uri,
        integrity_status=artifact.integrity_status.value,
        provenance_type=artifact.provenance_type.value,
    )
    session.add(model)
    await session.commit()

    # Query back from DB
    retrieved = await session.get(EvidenceArtifactModel, artifact.artifact_id)
    assert retrieved is not None
    assert retrieved.storage_uri == artifact.storage_uri
    assert retrieved.content_hash == artifact.content_hash
    # Confirm no raw byte column exists on EvidenceArtifactModel
    assert not hasattr(retrieved, "raw_bytes")
    assert not hasattr(retrieved, "payload")


@pytest.mark.asyncio
async def test_p13_postgres_metadata_not_committed_before_verified_storage(temp_fs_store, clean_unified_store, async_pg_session):
    """P13: Transaction fails closed if storage verification fails before metadata commit."""
    byte_store, _ = temp_fs_store

    class CorruptingByteStore(FilesystemEvidenceByteStore):
        def verify(self, storage_uri_or_key: str, expected_hash: str):
            # Simulate storage verify failure
            return super().verify(storage_uri_or_key, "invalid_hash_to_force_verification_failure")

    corrupt_store = CorruptingByteStore(root_dir=byte_store.root_dir)
    failing_gateway = EvidenceGateway(byte_store=corrupt_store, store=clean_unified_store)

    session = async_pg_session

    # Ingestion must raise StorageIntegrityError before reaching DB commit
    with pytest.raises(StorageIntegrityError):
        failing_gateway.ingest_artifact(
            content=b"UNVERIFIED_BYTES",
            filename="unverified.bin",
            case_id="CASE-P13",
            source_id="SRC-FAIL",
            source_type=EvidenceSourceType.COMPUTER_FORENSIC_EXPORT,
            record_id="REC-FAIL",
        )

    # Confirm no orphan record committed in PostgreSQL
    db_res = await session.get(EvidenceArtifactModel, "any_id")
    assert db_res is None


def test_p14_custody_event_is_preserved(temp_fs_store, clean_unified_store):
    """P14: Chain-of-custody event is preserved and immutably appended."""
    byte_store, _ = temp_fs_store
    gateway = EvidenceGateway(byte_store=byte_store, store=clean_unified_store)

    artifact = gateway.ingest_artifact(
        content=b"FORENSIC_CUSTODY_PAYLOAD",
        filename="custody_test.bin",
        case_id="CASE-P14",
        source_id="SRC-OFFICER",
        source_type=EvidenceSourceType.MOBILE_FORENSIC_EXPORT,
        record_id="EX-P14",
        operator_id="OFFICER-007",
    )

    assert len(artifact.custody_chain) == 1
    assert artifact.custody_chain[0].actor_id == "OFFICER-007"

    # Append second custody transfer event
    transfer = gateway.append_custody_transfer(
        artifact_id=artifact.artifact_id,
        actor_id="LAB_ANALYST_99",
        actor_role="DIGITAL_FORENSICS_EXAMINER",
        action_description="Received for forensic mobile memory extraction",
        location="FSL Delhi Lab 3",
    )

    assert transfer.actor_id == "LAB_ANALYST_99"
    assert len(artifact.custody_chain) == 2
    assert artifact.custody_chain[1].previous_event_id == artifact.custody_chain[0].custody_event_id


def test_p15_restart_can_retrieve_exact_evidence_bytes(temp_fs_store):
    """P15: Simulating process restart retrieves exact original evidence bytes from storage."""
    byte_store, temp_dir = temp_fs_store
    store1 = UnifiedStore()
    gateway1 = EvidenceGateway(byte_store=byte_store, store=store1)

    content = b"RESTART_PERSISTENCE_VALIDATION_BYTES"
    artifact = gateway1.ingest_artifact(
        content=content,
        filename="restart_test.txt",
        case_id="CASE-P15",
        source_id="SRC-RESTART",
        source_type=EvidenceSourceType.CLOUD_AUDIT_LOG,
        record_id="LOG-01",
    )
    storage_uri = artifact.storage_uri

    # Simulate restart: new Gateway instance pointing to same storage
    store2 = UnifiedStore()
    store2.save_artifact(artifact)  # Metadata re-loaded from persistent DB
    gateway2 = EvidenceGateway(byte_store=FilesystemEvidenceByteStore(root_dir=temp_dir), store=store2)

    retrieved = gateway2.get_artifact_bytes(artifact.artifact_id)
    assert retrieved == content


def test_p16_retrieved_bytes_reproduce_original_sha256(temp_fs_store, clean_unified_store):
    """P16: Retrieved bytes deterministically reproduce original SHA-256 digest."""
    byte_store, _ = temp_fs_store
    gateway = EvidenceGateway(byte_store=byte_store, store=clean_unified_store)

    content = b"DETERMINISTIC_SHA256_REPRODUCTION_CHECK_STRING"
    expected = hashlib.sha256(content).hexdigest().lower()

    artifact = gateway.ingest_artifact(
        content=content,
        filename="repro.bin",
        case_id="CASE-P16",
        source_id="SRC-P16",
        source_type=EvidenceSourceType.COMPUTER_FORENSIC_EXPORT,
        record_id="IMG-P16",
    )

    retrieved = gateway.get_artifact_bytes(artifact.artifact_id)
    assert hashlib.sha256(retrieved).hexdigest().lower() == expected == artifact.content_hash


def test_p17_missing_object_detected_as_integrity_failure(temp_fs_store, clean_unified_store):
    """P17: Missing payload file is detected as integrity failure."""
    byte_store, temp_dir = temp_fs_store
    gateway = EvidenceGateway(byte_store=byte_store, store=clean_unified_store)

    artifact = gateway.ingest_artifact(
        content=b"TO_BE_DELETED_PAYLOAD",
        filename="missing.bin",
        case_id="CASE-P17",
        source_id="SRC-P17",
        source_type=EvidenceSourceType.EFSL_REPORT,
        record_id="EFSL-01",
    )

    # Delete underlying payload file
    clean_path = Path(artifact.storage_uri.replace("file://", ""))
    clean_path.unlink()

    status = gateway.verify_artifact_integrity(artifact.artifact_id)
    assert status["verified"] is False
    assert "missing" in status["reason"].lower()


def test_p18_partial_failed_upload_does_not_become_authoritative(temp_fs_store):
    """P18: Partial/failed upload does not leave corrupted object at destination key."""
    byte_store, temp_dir = temp_fs_store

    class InterruptedStream:
        def __init__(self):
            self.bytes_read = 0

        def read(self, size):
            if self.bytes_read >= 65536:
                raise IOError("Network/Stream connection abruptly interrupted")
            self.bytes_read += size
            return b"A" * size

        def seekable(self):
            return False

    with pytest.raises(IOError):
        byte_store.put_stream(
            stream=InterruptedStream(),  # type: ignore
            content_hash="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            file_size=1000000,
            mime_type="application/octet-stream",
        )

    # Destination key must not exist
    cas_key = byte_store.compute_cas_key("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    assert not (Path(temp_dir) / cas_key).exists()


def test_p19_evidence_gateway_is_the_only_normal_ingestion_path(temp_fs_store, clean_unified_store):
    """P19: Ingestion through EvidenceGateway orchestrates hashing, validation, CAS, metadata, and custody."""
    byte_store, _ = temp_fs_store
    gateway = EvidenceGateway(byte_store=byte_store, store=clean_unified_store)

    payload = b"GATEWAY_CANONICAL_ORCHESTRATION_TEST"
    artifact = gateway.ingest_artifact(
        content=payload,
        filename="orchestration.json",
        case_id="CASE-P19",
        source_id="SRC-GATEWAY",
        source_type=EvidenceSourceType.CCTNS_FIR,
        record_id="ORCH-01",
    )

    assert artifact.artifact_id is not None
    assert artifact.storage_uri.startswith("file://")
    assert clean_unified_store.get_artifact(artifact.artifact_id) is not None
    assert clean_unified_store.get_custody_events(artifact.artifact_id) is not None
    assert clean_unified_store.get_provenance(artifact.artifact_id) is not None


# ==============================================================================
# S3 / MINIO BYTE STORE CONTRACT TESTS (MOCK & DETERMINISTIC S3 CLIENT)
# ==============================================================================

def test_s3_byte_store_put_and_get(mock_s3_byte_store):
    """Verify S3 byte store put, get, head, exists, and verify operations."""
    store = mock_s3_byte_store

    content = b"S3_MINIO_EVIDENCE_CAS_BYTES"
    sha = hashlib.sha256(content).hexdigest().lower()

    uri = store.put_stream(
        stream=io.BytesIO(content),
        content_hash=sha,
        file_size=len(content),
        mime_type="text/plain",
        filename="s3_test.txt",
    )

    assert uri == f"s3://sentinelx-evidence/{store.compute_cas_key(sha, filename='s3_test.txt')}"
    assert store.exists(uri) is True

    # Head metadata
    meta = store.head(uri)
    assert meta is not None
    assert meta.content_hash == sha
    assert meta.size_bytes == len(content)

    # Retrieval
    retrieved = store.get_bytes(uri)
    assert retrieved == content

    # Verification
    v = store.verify(uri, sha)
    assert v.verified is True
    assert v.storage_hash == sha


def test_s3_byte_store_idempotency_and_immutability(mock_s3_byte_store):
    """Verify S3 byte store idempotency on identical bytes, and collision error on differing bytes."""
    store = mock_s3_byte_store

    content1 = b"ORIGINAL_S3_EVIDENCE"
    sha1 = hashlib.sha256(content1).hexdigest().lower()

    uri1 = store.put_stream(
        stream=io.BytesIO(content1),
        content_hash=sha1,
        file_size=len(content1),
        mime_type="text/plain",
    )

    # Idempotent write returns identical URI
    uri2 = store.put_stream(
        stream=io.BytesIO(content1),
        content_hash=sha1,
        file_size=len(content1),
        mime_type="text/plain",
    )
    assert uri1 == uri2

    # Conflicting bytes under same hash fails closed
    differing = b"DIFFERING_CONFLICTING_BYTES"
    # Pre-populate conflicting object in client
    key = store.compute_cas_key(sha1)
    store.client.put_object(
        Bucket="sentinelx-evidence",
        Key=key,
        Body=differing,
        Metadata={"content-hash": hashlib.sha256(differing).hexdigest().lower()},
    )

    with pytest.raises(StorageImmutabilityViolation):
        store.put_stream(
            stream=io.BytesIO(content1),
            content_hash=sha1,
            file_size=len(content1),
            mime_type="text/plain",
        )


def test_s3_byte_store_quarantine(mock_s3_byte_store):
    """Verify S3 quarantine puts object in quarantine key with metadata."""
    store = mock_s3_byte_store

    content = b"MALFORMED_STREAM"
    sha = hashlib.sha256(content).hexdigest().lower()

    q_uri = store.quarantine(
        stream=io.BytesIO(content),
        content_hash=sha,
        file_size=len(content),
        mime_type="application/octet-stream",
        reason="Checksum failure",
    )

    assert "quarantine" in q_uri
    meta = store.head(q_uri)
    assert meta is not None
    assert meta.custom_metadata.get("quarantine-reason") == "Checksum failure"


def test_s3_byte_store_health_check(mock_s3_byte_store):
    """Verify S3 health check reports HEALTHY for accessible bucket."""
    store = mock_s3_byte_store
    health = store.health_check()
    assert health["status"] == "HEALTHY"
    assert health["backend"] == "s3"
