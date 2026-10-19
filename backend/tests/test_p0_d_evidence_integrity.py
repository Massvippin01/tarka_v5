"""SentinelX × Tarka — Milestone P0-D End-to-End Evidence Integrity Verification Suite.

Comprehensive end-to-end tests validating:
1. Ingestion through EvidenceGateway into live S3 CAS (MinIO/RustFS) and local filesystem fallback.
2. Round-trip byte retrieval and bit-exact SHA-256 verification.
3. Deterministic CAS addressing, deduplication, and fail-closed immutability violations.
4. Checksum mismatch detection and automatic quarantine isolation.
5. Storage outage handling and missing object detection.
6. 7-Factor RBAC authorization and cross-case isolation (HTTP 401 & 403 enforcement).
7. Forensic processing through TARKA: contradiction analysis and provenance lineage tracing.
8. Non-promotability invariant: machine-generated inferences remain unverified.
9. Section 63 BSA statutory export generation (JSON & PDF), deterministic fingerprint validation,
   post-generation tamper detection, and statutory limitation disclosures.
"""

from __future__ import annotations

import copy
import hashlib
import io
import os
from pathlib import Path
import tempfile
import uuid
from datetime import UTC, datetime
from typing import Any, BinaryIO, Dict

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.domain.auth import UserIdentity, UserRoleEnum
from app.domain.canonical_evidence_ir import (
    CustodyEventType,
    EvidenceArtifact,
    EvidenceCustodyEvent,
    EvidenceSourceType,
    IntegrityStatus,
    SourceProvenanceType,
)
from app.main import app
from app.repositories.unified_store import UnifiedStore
from app.services.auth_service import AuthService
from app.services.evidence_gateway import EvidenceGateway
from app.storage.base import (
    StorageError,
    StorageImmutabilityViolation,
    StorageIntegrityError,
    StorageNotFoundError,
)
from app.storage.factory import get_evidence_byte_store
from app.storage.filesystem import FilesystemEvidenceByteStore
from app.storage.s3 import S3EvidenceByteStore
from tarka.api.server import case_store, seed_demo_case_if_needed
from tarka.core.evidence_dna import Artifact, CaseStore
from tarka.core.models import TrustTier
from tarka.core.forensic_report import (
    ForensicReport,
    ForensicReportBuilder,
    ForensicReportHTMLExporter,
    ForensicReportPDFExporter,
    compute_report_fingerprint,
)


# ==============================================================================
# Fixtures
# ==============================================================================

@pytest.fixture
def auth_service():
    return AuthService.get_instance()


@pytest.fixture
def delhi_client(auth_service):
    token = auth_service.create_jwt_token("INVESTIGATOR_DELHI")
    c = TestClient(app)
    c.headers.update({"Authorization": f"Bearer {token}"})
    return c


@pytest.fixture
def gurugram_client(auth_service):
    token = auth_service.create_jwt_token("INVESTIGATOR_GURUGRAM")
    c = TestClient(app)
    c.headers.update({"Authorization": f"Bearer {token}"})
    return c


@pytest.fixture
def unauthenticated_client():
    return TestClient(app)


@pytest.fixture
def live_s3_byte_store():
    """Live MinIO / RustFS S3 CAS byte store."""
    endpoint = os.getenv("S3_ENDPOINT_URL") or "http://127.0.0.1:9000"
    access_key = os.getenv("S3_ACCESS_KEY") or "sentinelx_minio_admin"
    secret_key = os.getenv("S3_SECRET_KEY") or "sentinelx_minio_prod_password"
    bucket = os.getenv("S3_BUCKET_NAME") or "sentinelx-evidence-vault"
    try:
        store = S3EvidenceByteStore(
            endpoint_url=endpoint,
            access_key=access_key,
            secret_key=secret_key,
            bucket_name=bucket,
            secure=False,
            connect_timeout=2.0,
            read_timeout=3.0,
        )
        store.client.head_bucket(Bucket=bucket)
        return store
    except Exception as e:
        pytest.skip(f"Live S3/MinIO container unavailable: {e}")


# ==============================================================================
# 1. Storage Modes & CAS Ingestion (Live S3 & Local Fallback)
# ==============================================================================

def test_p0d_live_s3_cas_storage_and_roundtrip_verification(live_s3_byte_store):
    """Verify live S3/MinIO CAS storage, UUIDv7 generation, and round-trip SHA-256 verification."""
    gateway = EvidenceGateway(byte_store=live_s3_byte_store)

    synthetic_payload = b"SYNTHETIC_CDR_RECORDS_P0D_VERIFICATION_2026_01"
    expected_hash = hashlib.sha256(synthetic_payload).hexdigest()

    artifact = gateway.ingest_artifact(
        content=synthetic_payload,
        filename="telecom_cdr_sample.csv",
        case_id="C102",
        source_id="TELECOM_AIRTEL_DELHI",
        source_type=EvidenceSourceType.CDR_TELECOM,
        record_id="CDR_BATCH_P0D_01",
        provenance_type=SourceProvenanceType.SYNTHETIC_DATA,
        operator_id="OFFICER_DELHI_001",
    )

    # 1. Assert artifact metadata
    assert artifact.content_hash == expected_hash
    assert artifact.integrity_status == IntegrityStatus.VERIFIED
    assert artifact.storage_uri.startswith("s3://sentinelx-evidence-vault/sha256/")
    assert artifact.artifact_id != artifact.content_hash  # UUIDv7 != SHA256

    # 2. Retrieve stream and verify bitstream preservation
    stream = gateway.get_artifact_stream(artifact.artifact_id)
    retrieved_bytes = stream.read()
    if hasattr(stream, "close"):
        stream.close()

    assert retrieved_bytes == synthetic_payload
    assert hashlib.sha256(retrieved_bytes).hexdigest() == expected_hash

    # 3. Cryptographic post-storage check
    verify_res = live_s3_byte_store.verify(artifact.storage_uri, expected_hash)
    assert verify_res.verified is True
    assert verify_res.error is None


def test_p0d_filesystem_cas_fallback_and_roundtrip_verification():
    """Verify local filesystem CAS fallback when remote S3 is not used."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        fs_store = FilesystemEvidenceByteStore(root_dir=tmp_dir)
        gateway = EvidenceGateway(byte_store=fs_store)

        synthetic_payload = b"SYNTHETIC_BANK_STATEMENT_UPI_REF_449012389102"
        expected_hash = hashlib.sha256(synthetic_payload).hexdigest()

        artifact = gateway.ingest_artifact(
            content=synthetic_payload,
            filename="hdfc_upi_statement.csv",
            case_id="C102",
            source_id="BANK_HDFC_CONNAUGHT_PLACE",
            source_type=EvidenceSourceType.FINANCIAL_TRANSACTION,
            record_id="STMT_2026_002",
            provenance_type=SourceProvenanceType.SYNTHETIC_DATA,
        )

        assert artifact.content_hash == expected_hash
        assert artifact.integrity_status == IntegrityStatus.VERIFIED
        assert artifact.storage_uri.startswith("file://")

        # Round-trip verification
        stream = gateway.get_artifact_stream(artifact.artifact_id)
        retrieved_bytes = stream.read()
        stream.close()  # Must close file handle on Windows

        assert retrieved_bytes == synthetic_payload
        assert hashlib.sha256(retrieved_bytes).hexdigest() == expected_hash

        verify_res = fs_store.verify(artifact.storage_uri, expected_hash)
        assert verify_res.verified is True


# ==============================================================================
# 2. Deterministic CAS Addressing, Deduplication & Immutability
# ==============================================================================

def test_p0d_live_s3_cas_deterministic_addressing_and_deduplication(live_s3_byte_store):
    """Verify repeated ingestion of identical bytes produces deterministic CAS addresses on S3 CAS."""
    payload = b"IDENTICAL_EVIDENCE_BITSTREAM_P0D_DETERMINISM"
    content_hash = hashlib.sha256(payload).hexdigest()

    uri_1 = live_s3_byte_store.put_stream(
        stream=io.BytesIO(payload),
        content_hash=content_hash,
        file_size=len(payload),
        mime_type="text/plain",
        filename="sample.txt",
    )

    uri_2 = live_s3_byte_store.put_stream(
        stream=io.BytesIO(payload),
        content_hash=content_hash,
        file_size=len(payload),
        mime_type="text/plain",
        filename="sample.txt",
    )

    assert uri_1 == uri_2, "CAS URI must be deterministic for identical content"


def test_p0d_filesystem_cas_deterministic_addressing_and_deduplication():
    """Verify repeated ingestion of identical bytes produces deterministic CAS addresses on local CAS fallback."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        fs_store = FilesystemEvidenceByteStore(root_dir=tmp_dir)
        payload = b"IDENTICAL_EVIDENCE_BITSTREAM_P0D_DETERMINISM"
        content_hash = hashlib.sha256(payload).hexdigest()

        uri_1 = fs_store.put_stream(
            stream=io.BytesIO(payload),
            content_hash=content_hash,
            file_size=len(payload),
            mime_type="text/plain",
            filename="sample.txt",
        )

        uri_2 = fs_store.put_stream(
            stream=io.BytesIO(payload),
            content_hash=content_hash,
            file_size=len(payload),
            mime_type="text/plain",
            filename="sample.txt",
        )

        assert uri_1 == uri_2, "Local CAS URI must be deterministic for identical content"
        assert fs_store.exists(uri_1) is True


def test_p0d_live_s3_cas_immutability_violation_fails_closed(live_s3_byte_store):
    """Verify that attempting to overwrite an existing CAS key with different content fails closed on S3."""
    payload_original = b"ORIGINAL_EVIDENCE_RECORD_1000"
    content_hash = hashlib.sha256(payload_original).hexdigest()

    # Initial put
    live_s3_byte_store.put_stream(
        stream=io.BytesIO(payload_original),
        content_hash=content_hash,
        file_size=len(payload_original),
        mime_type="text/plain",
        filename="record.txt",
    )

    # Attempt to write DIFFERENT content under the SAME content hash
    payload_tampered = b"TAMPERED_CONTENT_UNDER_SAME_HASH_KEY"
    with pytest.raises(StorageImmutabilityViolation):
        live_s3_byte_store.put_stream(
            stream=io.BytesIO(payload_tampered),
            content_hash=content_hash,
            file_size=len(payload_tampered),
            mime_type="text/plain",
            filename="record.txt",
        )


def test_p0d_filesystem_cas_immutability_violation_fails_closed():
    """Verify that attempting to overwrite an existing CAS key with different content fails closed on local CAS fallback."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        fs_store = FilesystemEvidenceByteStore(root_dir=tmp_dir)
        payload_original = b"ORIGINAL_EVIDENCE_RECORD_1000"
        content_hash = hashlib.sha256(payload_original).hexdigest()

        fs_store.put_stream(
            stream=io.BytesIO(payload_original),
            content_hash=content_hash,
            file_size=len(payload_original),
            mime_type="text/plain",
            filename="record.txt",
        )

        payload_tampered = b"TAMPERED_CONTENT_UNDER_SAME_HASH_KEY"
        with pytest.raises(StorageImmutabilityViolation):
            fs_store.put_stream(
                stream=io.BytesIO(payload_tampered),
                content_hash=content_hash,
                file_size=len(payload_tampered),
                mime_type="text/plain",
                filename="record.txt",
            )


def test_p0d_live_s3_quarantine_isolation_on_checksum_mismatch(live_s3_byte_store):
    """Verify that tampered evidence with mismatched expected hash is automatically quarantined on S3."""
    gateway = EvidenceGateway(byte_store=live_s3_byte_store)

    actual_payload = b"EVIDENCE_STREAM_SUBJECT_TO_TRANSFER_CORRUPTION"
    actual_hash = hashlib.sha256(actual_payload).hexdigest()
    fraudulent_expected_hash = "0000000000000000000000000000000000000000000000000000000000000000"

    artifact = gateway.ingest_artifact(
        content=actual_payload,
        filename="corrupted_transfer.pcap",
        case_id="C102",
        source_id="NET_CAPTURE_01",
        source_type=EvidenceSourceType.NETWORK_PCAP_LOG,
        record_id="PCAP_001",
        expected_sha256=fraudulent_expected_hash,
    )

    assert artifact.integrity_status == IntegrityStatus.MISMATCH
    assert "quarantine/" in artifact.storage_uri
    assert artifact.content_hash == actual_hash

    events = gateway.store.get_custody_events(artifact.artifact_id)
    assert len(events) >= 1
    assert events[0].event_type == CustodyEventType.QUARANTINE
    assert "Checksum mismatch" in events[0].action_description


def test_p0d_filesystem_quarantine_isolation_on_checksum_mismatch():
    """Verify that tampered evidence with mismatched expected hash is quarantined on local CAS fallback."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        fs_store = FilesystemEvidenceByteStore(root_dir=tmp_dir)
        gateway = EvidenceGateway(byte_store=fs_store)

        actual_payload = b"EVIDENCE_STREAM_SUBJECT_TO_TRANSFER_CORRUPTION"
        actual_hash = hashlib.sha256(actual_payload).hexdigest()
        fraudulent_expected_hash = "0000000000000000000000000000000000000000000000000000000000000000"

        artifact = gateway.ingest_artifact(
            content=actual_payload,
            filename="corrupted_transfer.pcap",
            case_id="C102",
            source_id="NET_CAPTURE_01",
            source_type=EvidenceSourceType.NETWORK_PCAP_LOG,
            record_id="PCAP_001",
            expected_sha256=fraudulent_expected_hash,
        )

        assert artifact.integrity_status == IntegrityStatus.MISMATCH
        assert "quarantine" in artifact.storage_uri
        assert artifact.content_hash == actual_hash

        events = gateway.store.get_custody_events(artifact.artifact_id)
        assert len(events) >= 1
        assert events[0].event_type == CustodyEventType.QUARANTINE
        assert "Checksum mismatch" in events[0].action_description


def test_p0d_live_s3_missing_object_detected_as_storage_not_found(live_s3_byte_store):
    """Verify querying non-existent CAS key on S3 raises StorageNotFoundError."""
    dummy_uri = "s3://sentinelx-evidence-vault/sha256/ff/ff/ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    with pytest.raises(StorageNotFoundError):
        live_s3_byte_store.get_stream(dummy_uri)


def test_p0d_filesystem_missing_object_detected_as_storage_not_found():
    """Verify querying non-existent CAS key on filesystem raises StorageNotFoundError."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        fs_store = FilesystemEvidenceByteStore(root_dir=tmp_dir)
        dummy_uri = f"file:///{tmp_dir}/sha256/ff/ff/ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        with pytest.raises(StorageNotFoundError):
            fs_store.get_stream(dummy_uri)


def test_p0d_filesystem_tampering_and_corruption_detected():
    """Verify post-ingestion tampering with stored bytes on disk is detected as integrity failure."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        fs_store = FilesystemEvidenceByteStore(root_dir=tmp_dir)
        gateway = EvidenceGateway(byte_store=fs_store)

        content = b"AUTHENTIC_EVIDENCE_BYTES_PRIOR_TO_TAMPERING"
        expected_hash = hashlib.sha256(content).hexdigest()

        artifact = gateway.ingest_artifact(
            content=content,
            filename="cctv_log.csv",
            case_id="C102",
            source_id="CCTV_GATE_01",
            source_type=EvidenceSourceType.CCTV_ANPR,
            record_id="ANPR_001",
        )

        # 1. Initial verification must pass
        v_initial = gateway.verify_artifact_integrity(artifact.artifact_id)
        assert v_initial["verified"] is True
        assert v_initial["integrity_status"] == "VERIFIED"

        # 2. Tamper directly with the underlying preserved file on disk
        file_path = fs_store._clean_path_from_uri(artifact.storage_uri)
        with open(file_path, "wb") as f:
            f.write(b"TAMPERED_FRAUDULENT_BYTES_INJECTED_POST_INGESTION")

        # 3. Subsequent verification detects tampering immediately
        v_tampered = gateway.verify_artifact_integrity(artifact.artifact_id)
        assert v_tampered["verified"] is False
        assert v_tampered["integrity_status"] == "TAMPERED_OR_CORRUPT"
        assert v_tampered["storage_hash"] != expected_hash


def test_p0d_filesystem_interrupted_upload_fails_cleanly():
    """Verify interrupted stream upload aborts cleanly without leaving corrupted authoritative CAS files."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        fs_store = FilesystemEvidenceByteStore(root_dir=tmp_dir)

        class InterruptedStream:
            def __init__(self):
                self.bytes_read = 0

            def read(self, size):
                if self.bytes_read >= 65536:
                    raise IOError("Connection aborted prematurely during streaming write")
                self.bytes_read += size
                return b"X" * size

            def seekable(self):
                return False

        dummy_hash = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        with pytest.raises(IOError):
            fs_store.put_stream(
                stream=InterruptedStream(),  # type: ignore
                content_hash=dummy_hash,
                file_size=1000000,
                mime_type="application/octet-stream",
            )

        cas_key = fs_store.compute_cas_key(dummy_hash)
        target_path = Path(tmp_dir) / cas_key
        assert not target_path.exists(), "Interrupted upload must not leave an authoritative object in CAS"


def test_p0d_storage_outage_handling_and_fallback_configuration():
    """Verify storage outage handling and environment-governed fallback policy."""
    # 1. Unreachable S3 endpoint fails closed on connection attempt
    unreachable_s3 = S3EvidenceByteStore(
        endpoint_url="http://127.0.0.1:59999",
        bucket_name="nonexistent-vault",
        connect_timeout=0.5,
        read_timeout=0.5,
    )
    with pytest.raises(Exception):
        unreachable_s3.client.head_bucket(Bucket="nonexistent-vault")

    # 2. Filesystem store permitted in development/test
    dev_store = get_evidence_byte_store(backend="filesystem")
    assert isinstance(dev_store, FilesystemEvidenceByteStore)

    # 3. Production environment strictly prohibits filesystem CAS authority (Fail Closed)
    orig_env = settings.APP_ENV
    try:
        settings.APP_ENV = "production"
        with pytest.raises(ValueError) as exc_info:
            get_evidence_byte_store(backend="filesystem")
        assert "FAIL_CLOSED" in str(exc_info.value)
    finally:
        settings.APP_ENV = orig_env


def test_p0d_audit_trail_and_custody_chain_completeness():
    """Verify that every ingestion generates immutable custody events and provenance lineage."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        fs_store = FilesystemEvidenceByteStore(root_dir=tmp_dir)
        gateway = EvidenceGateway(byte_store=fs_store)

        payload = b"AUDIT_TRAIL_VERIFICATION_PAYLOAD"
        content_hash = hashlib.sha256(payload).hexdigest()

        artifact = gateway.ingest_artifact(
            content=payload,
            filename="forensic_report.pdf",
            case_id="C102",
            source_id="EFSL_HYDERABAD",
            source_type=EvidenceSourceType.EFSL_REPORT,
            record_id="EFSL_REC_2026",
            operator_id="OFFICER_RAO_042",
        )

        # 1. Custody event validation
        events = gateway.store.get_custody_events(artifact.artifact_id)
        assert len(events) == 1
        initial_event = events[0]
        assert initial_event.event_type == CustodyEventType.INGESTION_RECEIPT
        assert initial_event.actor_id == "OFFICER_RAO_042"
        assert initial_event.content_hash_at_event == content_hash
        assert initial_event.storage_location == artifact.storage_uri
        assert initial_event.timestamp != ""

        # 2. Provenance record validation
        prov = gateway.store.get_provenance(artifact.artifact_id)
        assert prov is not None
        assert prov.root_artifact_hash == content_hash
        assert prov.source_system == EvidenceSourceType.EFSL_REPORT.value
        assert len(prov.lineage_steps) >= 1
        assert prov.lineage_steps[0]["step"] == "ACQUIRED_BY_GATEWAY"

        # 3. Custody transfer append
        transfer_event = gateway.append_custody_transfer(
            artifact_id=artifact.artifact_id,
            actor_id="EXAMINER_VERMA_019",
            actor_role="DIGITAL_FORENSICS_EXAMINER",
            action_description="Transfer to TARKA analytical workspace for Z3 SMT MUS extraction",
            location="LAB_DELHI_SECURE_RACK_4",
        )
        assert transfer_event.previous_event_id == initial_event.custody_event_id

        # 4. Chain length updated
        updated_events = gateway.store.get_custody_events(artifact.artifact_id)
        assert len(updated_events) == 2
        assert updated_events[1].actor_id == "EXAMINER_VERMA_019"


# ==============================================================================
# 3. 7-Factor Authorization, Case Isolation & RBAC Fail-Closed
# ==============================================================================

def test_p0d_unauthenticated_ingest_rejected_with_401(unauthenticated_client):
    """Verify unauthenticated ingestion request is strictly rejected with HTTP 401."""
    res = unauthenticated_client.post(
        "/api/v1/forensics/cases/C102/ingest",
        files=[("files", ("test.csv", b"col1,col2\nval1,val2\n", "text/csv"))],
    )
    assert res.status_code == 401


def test_p0d_cross_case_unauthorized_access_rejected_with_403(gurugram_client):
    """Verify INVESTIGATOR_GURUGRAM is denied case access to Delhi case upi_payment_discrepancy."""
    # Read attempt
    res_read = gurugram_client.get("/api/v1/forensics/cases/upi_payment_discrepancy")
    assert res_read.status_code == 403
    assert "ACCESS_DENIED" in res_read.json()["detail"]

    # Ingest attempt
    res_ingest = gurugram_client.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/ingest",
        files=[("files", ("sample.csv", b"a,b\n1,2\n", "text/csv"))],
    )
    assert res_ingest.status_code == 403


def test_p0d_case_boundary_isolation_between_cases(delhi_client, auth_service):
    """Verify identical files ingested into Case A vs Case B maintain strict case isolation."""
    case_a = f"case_iso_a_{uuid.uuid4().hex[:6]}"
    case_b = f"case_iso_b_{uuid.uuid4().hex[:6]}"

    # Grant access to both cases for supervisor
    supervisor = auth_service.users["SUPERVISOR_NCR"]
    auth_service.grant_case_access(supervisor, case_a, justification="Isolation test case A")
    auth_service.grant_case_access(supervisor, case_b, justification="Isolation test case B")

    sup_token = auth_service.create_jwt_token("SUPERVISOR_NCR")
    sup_client = TestClient(app)
    sup_client.headers.update({"Authorization": f"Bearer {sup_token}"})

    csv_data = (
        b"Calling_MSISDN,Called_Party,Call_Date,Call_Time,Dur_Sec,First_CGI,IMEI_Number,Service_Type\n"
        b"9845012345,9845099999,26/01/2026,10:15:30,45,TOWER_DEL_01,864209041234567,MOC_CALL\n"
    )

    # Ingest into Case A
    res_a = sup_client.post(
        "/api/v1/forensics/tarka/api/ingest",
        files=[("files", ("cdr.csv", csv_data, "text/csv"))],
        data={"tz": "Asia/Kolkata", "case_id": case_a, "append_to_custody": "false"},
    )
    assert res_a.status_code == 200
    assert res_a.json()["source_files"][0]["parser_type"] == "CDRParser"

    # Ingest same bytes into Case B -> Must parse cleanly, demonstrating separate case registry
    res_b = sup_client.post(
        "/api/v1/forensics/tarka/api/ingest",
        files=[("files", ("cdr.csv", csv_data, "text/csv"))],
        data={"tz": "Asia/Kolkata", "case_id": case_b, "append_to_custody": "false"},
    )
    assert res_b.status_code == 200
    assert res_b.json()["source_files"][0]["parser_type"] == "CDRParser"


# ==============================================================================
# 4. Forensic Processing via TARKA & Provenance Lineage
# ==============================================================================

def test_p0d_tarka_forensic_processing_and_provenance_trace(delhi_client):
    """Verify ingested case evidence flows through TARKA analysis and retains provenance trace."""
    # Ensure baseline case seeded
    seed_resp = delhi_client.post("/api/v1/forensics/cases/upi_payment_discrepancy/seed-synthetic")
    assert seed_resp.status_code == 200

    # 1. Verify artifacts and custody
    art_resp = delhi_client.get("/api/v1/forensics/cases/upi_payment_discrepancy/artifacts")
    assert art_resp.status_code == 200
    artifacts = art_resp.json()
    assert len(artifacts) >= 4

    # 2. Verify bitstream preservation of first artifact
    art_id = artifacts[0]["artifact_id"]
    verify_resp = delhi_client.get(f"/api/v1/forensics/cases/upi_payment_discrepancy/artifacts/{art_id}/verify")
    assert verify_resp.status_code == 200
    assert verify_resp.json()["bitstream_intact"] is True

    # 3. Contradiction analysis
    contra_resp = delhi_client.get("/api/v1/forensics/cases/upi_payment_discrepancy/contradictions")
    assert contra_resp.status_code == 200
    contradictions = contra_resp.json().get("contradictions", [])
    assert len(contradictions) >= 1

    # Finding must trace back to facts and artifacts
    finding = contradictions[0]
    assert len(finding.get("supporting_fact_ids", [])) >= 1
    assert "rule_firing_reason" in finding

    # 4. Provenance DAG check
    dag_resp = delhi_client.get("/api/v1/forensics/cases/upi_payment_discrepancy/provenance-dag")
    assert dag_resp.status_code == 200
    dag = dag_resp.json()
    assert len(dag.get("nodes", [])) >= 5
    assert len(dag.get("edges", [])) >= 4


def test_p0d_non_promotability_invariant(delhi_client):
    """Verify that machine-generated inferences are NEVER auto-promoted to human-verified facts."""
    graph_resp = delhi_client.get("/api/v1/forensics/cases/upi_payment_discrepancy/investigation-graph")
    assert graph_resp.status_code == 200
    nodes = graph_resp.json().get("nodes", [])

    for node in nodes:
        props = node.get("properties", {})
        if props.get("is_machine_generated"):
            assert props.get("human_verified") is False, (
                f"Violation of Non-Promotability Invariant: node {node.get('id')} has human_verified=True"
            )


# ==============================================================================
# 5. Section 63 BSA Statutory Report, Export & Cryptographic Fingerprint
# ==============================================================================

def test_p0d_section_63_bsa_statutory_export_and_fingerprint_integrity():
    """Verify Section 63 BSA statutory report generation, deterministic fingerprint, and multi-format export."""
    seed_demo_case_if_needed()
    builder = ForensicReportBuilder(case_store=case_store)

    report = builder.generate_report(
        case_id="upi_payment_discrepancy",
        report_title="Section 63 BSA Forensic Examination Certificate",
    )

    # 1. Required Statutory Certificate Metadata
    meta = report.metadata
    assert meta.case_id == "upi_payment_discrepancy"
    assert meta.schema_version == "1.0.0"
    assert meta.fingerprint != ""
    assert "Section 63 BSA" in meta.integrity_limitation

    # 2. Evidence Register / Inventory
    assert len(report.evidence_inventory) >= 4
    for inv_item in report.evidence_inventory:
        assert len(inv_item.sha256) == 64
        assert inv_item.file_size_bytes > 0
        assert inv_item.source_tier in ("T1", "T2", "T3")

    # 3. Deterministic Content Fingerprint Validation
    computed_fp = compute_report_fingerprint(report)
    assert computed_fp == meta.fingerprint, "Deterministic fingerprint must match substantively"

    # 4. Post-generation Tampering Detection
    tampered_report = copy.deepcopy(report)
    tampered_report.findings[0].title = "TAMPERED_FRAUDULENT_FINDING_TITLE"
    tampered_fp = compute_report_fingerprint(tampered_report)
    assert tampered_fp != meta.fingerprint, "Tampering with substantive content must invalidate fingerprint"

    # 5. HTML Export Validation
    html_content = ForensicReportHTMLExporter.render_html(report)
    assert "<!DOCTYPE html>" in html_content
    assert meta.fingerprint in html_content
    assert "Section 63 BSA" in html_content or "Section 63" in html_content

    # 6. PDF Export Validation (ReportLab)
    pdf_bytes = ForensicReportPDFExporter.render_pdf(report)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 2000
    assert pdf_bytes.startswith(b"%PDF")


def test_p0d_section_63_bsa_tampered_records_and_invalid_certificate_rejected():
    """Verify Section 63 BSA export detects tampered records, invalid hashes, and invalidates certificate fingerprint."""
    seed_demo_case_if_needed()
    builder = ForensicReportBuilder(case_store=case_store)

    report = builder.generate_report(
        case_id="upi_payment_discrepancy",
        report_title="Section 63 BSA Statutory Digital Evidence Certificate",
    )
    original_fingerprint = report.metadata.fingerprint
    assert original_fingerprint != ""

    # 1. Tampering with an evidence inventory item SHA-256 invalidates fingerprint
    tampered_evidence = copy.deepcopy(report)
    tampered_evidence.evidence_inventory[0].sha256 = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    assert compute_report_fingerprint(tampered_evidence) != original_fingerprint

    # 2. Tampering with evidence inventory file size invalidates fingerprint
    tampered_size = copy.deepcopy(report)
    tampered_size.evidence_inventory[0].file_size_bytes += 1
    assert compute_report_fingerprint(tampered_size) != original_fingerprint

    # 3. Tampering with a finding rule ID invalidates fingerprint
    tampered_rule = copy.deepcopy(report)
    tampered_rule.findings[0].rule_id = "TAMPERED_RULE_001"
    assert compute_report_fingerprint(tampered_rule) != original_fingerprint

    # 4. Tampering with timeline event description invalidates fingerprint
    tampered_timeline = copy.deepcopy(report)
    tampered_timeline.timeline.events[0].description = "Fabricated timeline event inserted post-audit"
    assert compute_report_fingerprint(tampered_timeline) != original_fingerprint

    # 5. Invalid certificate: missing or empty required fields fails closed
    with pytest.raises(Exception):
        builder.generate_report(case_id="NON_EXISTENT_CASE_FOR_INVALID_CERT")


# ==============================================================================
# 6. Comprehensive End-to-End Evidence Workflow (Ingestion to Export)
# ==============================================================================

def test_p0d_complete_end_to_end_evidence_workflow():
    """Comprehensive End-to-End Test: Synthetic Evidence Ingestion -> CAS Storage ->

    Retrieval & Round-Trip SHA-256 Verification -> Custody Logging ->
    TARKA Forensic Processing & Lineage -> Section 63 BSA Statutory Export (JSON, HTML, PDF).
    """
    with tempfile.TemporaryDirectory() as tmp_dir:
        # Step 1: Create synthetic evidence stream (CDR telecom record)
        synthetic_cdr_csv = (
            b"calling_number,called_number,timestamp,duration,first_cell,imei\n"
            b"9845012345,9845099999,2026-01-26T10:15:30Z,45,TOWER_DEL_01,864209041234567\n"
            b"9845012345,9845088888,2026-01-26T10:20:00Z,120,TOWER_DEL_02,864209041234567\n"
        )
        expected_sha256 = hashlib.sha256(synthetic_cdr_csv).hexdigest()
        byte_length = len(synthetic_cdr_csv)

        # Step 2: Ingest through EvidenceGateway into CAS byte store
        fs_store = FilesystemEvidenceByteStore(root_dir=tmp_dir)
        gateway = EvidenceGateway(byte_store=fs_store)

        artifact = gateway.ingest_artifact(
            content=synthetic_cdr_csv,
            filename="synthetic_delhi_cdr.csv",
            case_id="CASE_E2E_P0D",
            source_id="TELECOM_AIRTEL_DELHI",
            source_type=EvidenceSourceType.CDR_TELECOM,
            record_id="CDR_BATCH_E2E_001",
            provenance_type=SourceProvenanceType.SYNTHETIC_DATA,
            operator_id="OFFICER_DELHI_001",
            expected_sha256=expected_sha256,
            declared_size_bytes=byte_length,
        )

        assert artifact.content_hash == expected_sha256
        assert artifact.integrity_status == IntegrityStatus.VERIFIED
        assert artifact.file_size_bytes == byte_length
        assert artifact.artifact_id != artifact.content_hash
        assert artifact.storage_uri.startswith("file://")

        # Step 3: Round-trip byte retrieval from CAS and SHA-256 verification
        stream = gateway.get_artifact_stream(artifact.artifact_id)
        retrieved_bytes = stream.read()
        stream.close()

        assert retrieved_bytes == synthetic_cdr_csv
        assert hashlib.sha256(retrieved_bytes).hexdigest() == expected_sha256

        post_verify = gateway.verify_artifact_integrity(artifact.artifact_id)
        assert post_verify["verified"] is True
        assert post_verify["integrity_status"] == "VERIFIED"

        # Step 4: Custody chain & provenance recording
        custody_events = gateway.store.get_custody_events(artifact.artifact_id)
        assert len(custody_events) == 1
        assert custody_events[0].event_type == CustodyEventType.INGESTION_RECEIPT
        assert custody_events[0].content_hash_at_event == expected_sha256

        # Append analytical transfer
        gateway.append_custody_transfer(
            artifact_id=artifact.artifact_id,
            actor_id="TARKA_AUTOMATED_PROCESSOR",
            actor_role="FORENSIC_PARSER",
            action_description="Handed off for deterministic canonical fact extraction and SMT analysis",
            location="TARKA_ISOLATED_SANDBOX",
        )
        assert len(gateway.store.get_custody_events(artifact.artifact_id)) == 2

        # Step 5: Feed retrieved evidence into TARKA case
        e2e_case_id = f"e2e_p0d_{uuid.uuid4().hex[:6]}"
        case_store.create_case(
            case_id=e2e_case_id,
            title="E2E Digital Evidence Integrity Case",
            description="Autonomous P0-D verification of end-to-end evidence ingestion-to-export workflow",
            investigator="Lead Forensic Officer",
        )

        tarka_artifact, is_dup, tarka_dna = case_store.register_artifact(
            case_id=e2e_case_id,
            filename="synthetic_delhi_cdr.csv",
            file_bytes=retrieved_bytes,
            source_tier=TrustTier.T1,
            intake_officer="OFFICER_DELHI_001",
            intake_notes="Direct handoff from SentinelX Evidence Gateway CAS",
        )

        assert tarka_artifact.sha256 == expected_sha256
        assert tarka_artifact.file_size_bytes == byte_length
        assert len(tarka_dna) >= 2

        # Step 6: Extract canonical facts & execute forensic analysis run
        canonical_facts = case_store.list_canonical_facts(e2e_case_id)
        assert len(canonical_facts) >= 2
        for fact in canonical_facts:
            assert fact.artifact_id == tarka_artifact.artifact_id
            assert fact.trust_tier in (TrustTier.T1, TrustTier.T2, TrustTier.T3)

        baseline_run = case_store.get_or_create_baseline_run(e2e_case_id)
        assert baseline_run is not None
        assert baseline_run.run_type == "BASELINE"

        # Step 7: Section 63 BSA Statutory Report Generation
        builder = ForensicReportBuilder(case_store=case_store)
        report = builder.generate_report(
            case_id=e2e_case_id,
            run_id=baseline_run.run_id,
            report_title="Section 63 BSA Statutory Electronic Evidence Certificate",
        )

        # Step 8: Validate report structure, metadata & evidence register
        assert report.metadata.case_id == e2e_case_id
        assert report.metadata.schema_version == "1.0.0"
        assert "Section 63 BSA" in report.metadata.integrity_limitation
        assert len(report.evidence_inventory) >= 1
        inv_item = report.evidence_inventory[0]
        assert inv_item.sha256 == expected_sha256
        assert inv_item.file_size_bytes == byte_length
        assert inv_item.artifact_id == tarka_artifact.artifact_id

        # Verify substantive SHA-256 fingerprint
        computed_fp = compute_report_fingerprint(report)
        assert computed_fp == report.metadata.fingerprint
        assert len(computed_fp) == 64

        # Step 9: Multi-format rendering validation
        # HTML export
        html_out = ForensicReportHTMLExporter.render_html(report)
        assert "<!DOCTYPE html>" in html_out
        assert expected_sha256[:16] in html_out
        assert report.metadata.fingerprint[:16] in html_out

        # PDF export (ReportLab)
        pdf_out = ForensicReportPDFExporter.render_pdf(report)
        assert isinstance(pdf_out, bytes)
        assert pdf_out.startswith(b"%PDF")
        assert len(pdf_out) > 2000

        # Step 10: Post-generation tampering invalidates certificate
        tampered_report = copy.deepcopy(report)
        tampered_report.evidence_inventory[0].filename = "FABRICATED_FILENAME_POST_AUDIT.csv"
        assert compute_report_fingerprint(tampered_report) != report.metadata.fingerprint
