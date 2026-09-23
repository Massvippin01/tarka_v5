from __future__ import annotations

import io
import shutil
import tempfile
import time
from pathlib import Path

import pytest
from app.domain.canonical_evidence_ir import (
    CorroborationLevel,
    CustodyEventType,
    EpistemicStatus,
    EvidenceArtifact,
    EvidenceFact,
    EvidenceObservation,
    EvidenceSourceType,
    IntegrityStatus,
    SourceProvenanceType,
    SourceReliability,
    generate_uuid7,
)
from app.repositories.unified_store import UnifiedStore
from app.services.evidence_gateway import EvidenceGateway


@pytest.fixture
def temp_storage():
    temp_dir = tempfile.mkdtemp(prefix="sentinelx_evidence_test_")
    store = UnifiedStore.get_instance()
    store.clear()
    gateway = EvidenceGateway(storage_root=temp_dir, store=store)
    yield gateway, store, temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


def test_uuid7_time_ordered_properties():
    # 1. Generate multiple IDs sequentially
    id1 = generate_uuid7()
    time.sleep(0.002)  # ensure ms advance
    id2 = generate_uuid7()
    time.sleep(0.002)
    id3 = generate_uuid7()

    # 2. Verify RFC 9562 Version 7 and Variant
    import uuid
    u1 = uuid.UUID(id1)
    u2 = uuid.UUID(id2)
    u3 = uuid.UUID(id3)

    assert u1.version == 7
    assert u2.version == 7
    assert u3.version == 7

    # 3. Verify monotonic time-ordering (lexicographically sortable)
    assert id1 < id2 < id3

    # 4. Mandatory Rule: Artifact ID != Content Hash
    # UUIDv7 is 36 chars with hyphens; SHA-256 is 64 hex chars
    assert len(id1) == 36
    assert "-" in id1


def test_evidence_gateway_streaming_sha256_and_mime(temp_storage):
    gateway, store, _ = temp_storage

    content = b'{"fir_number": "FIR-2026-001", "incident": "Cyber heist", "loss_inr": 1250000}'
    import hashlib
    expected_hash = hashlib.sha256(content).hexdigest()

    artifact = gateway.ingest_artifact(
        content=content,
        filename="fir_report.json",
        case_id="CASE-2026-001",
        source_id="SRC-CCTNS-DELHI",
        source_type=EvidenceSourceType.CCTNS_FIR,
        provenance_type=SourceProvenanceType.SIMULATED_AUTHORIZED_SOURCE,
        record_id="FIR-2026-001",
        operator_id="OFFICER-771",
        jurisdiction="Delhi North",
    )

    assert artifact.content_hash == expected_hash
    assert artifact.file_size_bytes == len(content)
    assert artifact.mime_type == "application/json"
    assert artifact.integrity_status == IntegrityStatus.VERIFIED
    assert len(artifact.custody_chain) == 1
    assert artifact.custody_chain[0].event_type == CustodyEventType.INGESTION_RECEIPT
    assert artifact.custody_chain[0].content_hash_at_event == expected_hash

    # Verify registration in store
    retrieved = store.get_artifact(artifact.artifact_id)
    assert retrieved is not None
    assert retrieved.content_hash == expected_hash

    by_hash = store.get_artifact_by_hash(expected_hash)
    assert by_hash is not None
    assert by_hash.artifact_id == artifact.artifact_id


def test_evidence_gateway_immutable_storage(temp_storage):
    gateway, store, storage_dir = temp_storage

    content = b"TELECOM_OPERATOR_CDR_EXTRACT_RECORD_10129"
    artifact = gateway.ingest_artifact(
        content=content,
        filename="cdr_extract.txt",
        case_id="CASE-2026-001",
        source_id="SRC-AIRTEL-CDR",
        source_type=EvidenceSourceType.CDR_TELECOM,
        record_id="CDR-LOG-9921",
    )

    # Verify on-disk presence
    shard1 = artifact.content_hash[:2]
    shard2 = artifact.content_hash[2:4]
    stored_path = Path(storage_dir) / shard1 / shard2 / f"{artifact.content_hash}_cdr_extract.txt"
    assert stored_path.exists()
    assert stored_path.read_bytes() == content

    # Verify integrity verification passes
    status = gateway.verify_artifact_integrity(artifact.artifact_id)
    assert status["verified"] is True
    assert status["integrity_status"] == "VERIFIED"


def test_evidence_gateway_checksum_mismatch_and_quarantine(temp_storage):
    gateway, store, storage_dir = temp_storage

    content = b"CORRUPTED_OR_TAMPERED_FORENSIC_STREAM"
    bogus_expected_hash = "0000000000000000000000000000000000000000000000000000000000000000"

    artifact = gateway.ingest_artifact(
        content=content,
        filename="tampered_evidence.bin",
        case_id="CASE-2026-001",
        source_id="SRC-FIELD-SEIZURE",
        source_type=EvidenceSourceType.MOBILE_FORENSIC_EXPORT,
        record_id="EXTRACTION-009",
        expected_sha256=bogus_expected_hash,
    )

    # Must be quarantined
    assert artifact.integrity_status == IntegrityStatus.MISMATCH
    assert artifact.custody_chain[0].event_type == CustodyEventType.QUARANTINE
    assert "QUARANTINED_" in artifact.storage_uri


def test_evidence_chain_of_custody_progression(temp_storage):
    gateway, store, _ = temp_storage

    artifact = gateway.ingest_artifact(
        content=b"FSL_BALLISTICS_REPORT_SCAN_IMAGE_DATA",
        filename="fsl_report.pdf",
        case_id="CASE-2026-001",
        source_id="SRC-EFSL-DELHI",
        source_type=EvidenceSourceType.EFSL_REPORT,
        record_id="FSL-2026-881",
        operator_id="SEIZING_OFFICER_12",
    )

    initial_event_id = artifact.custody_chain[0].custody_event_id

    # Record Forensic Lab Handoff
    custody_2 = gateway.append_custody_transfer(
        artifact_id=artifact.artifact_id,
        actor_id="FSL_DIRECTOR_SHARMA",
        actor_role="CHIEF_FORENSIC_EXAMINER",
        action_description="Received sealed envelope in Vault B for ballistic chemical analysis",
        location="FSL Sector 14 Rohini Delhi",
        event_type=CustodyEventType.TRANSFER_CUSTODY,
    )

    assert custody_2.previous_event_id == initial_event_id
    assert custody_2.content_hash_at_event == artifact.content_hash
    assert len(artifact.custody_chain) == 2

    # Verify custody chain in store
    events = store.get_custody_events(artifact.artifact_id)
    assert len(events) == 2
    assert events[1].custody_event_id == custody_2.custody_event_id


def test_end_to_end_traceability_chain(temp_storage):
    """
    Demonstrate:
    SOURCE -> ARTIFACT -> HASH -> PROVENANCE -> CUSTODY -> OBSERVATION -> FACT
    """
    gateway, store, _ = temp_storage

    raw_payload = b'{"timestamp": "2026-09-22T09:17:00Z", "caller": "+919999011223", "receiver": "+919888044556", "duration": 340}'
    
    # 1. Source & Artifact Ingestion
    artifact = gateway.ingest_artifact(
        content=raw_payload,
        filename="cdr_log_001.json",
        case_id="CASE-2026-001",
        source_id="TELECOM_CDR_AIRTEL",
        source_type=EvidenceSourceType.CDR_TELECOM,
        provenance_type=SourceProvenanceType.SIMULATED_AUTHORIZED_SOURCE,
        record_id="CDR-LOG-REC-001",
        operator_id="INVESTIGATOR_PATEL",
    )

    # 2. Observation extracted from artifact
    obs = EvidenceObservation(
        artifact_id=artifact.artifact_id,
        case_id=artifact.case_id,
        source_location="record_index=0; byte_range=0-108",
        observation_type="PHONE_CALL_RECORD",
        observed_at="2026-09-22T09:17:00Z",
        location_label="South Delhi Cell Tower TOWER-DEL-08",
        raw_data={"caller": "+919999011223", "receiver": "+919888044556", "duration": 340},
        extraction_method="CDR_PARSER_JSON_V1",
        parser_version="1.0.0",
    )
    store.save_observation(obs)

    # 3. Derived Immutable Fact
    fact = EvidenceFact(
        case_id=artifact.case_id,
        subject="PH001",
        predicate="CONTACTED",
        object="PH002",
        source_artifact_id=artifact.artifact_id,
        source_observation_id=obs.observation_id,
        source_location=obs.source_location,
        observed_at=obs.observed_at,
        valid_from="2026-09-22T09:17:00Z",
        valid_to="2026-09-22T09:22:40Z",
        extraction_method="CDR_PARSER_DETERMINISTIC",
        extraction_confidence=1.0,
        source_reliability=SourceReliability.A_COMPLETELY_RELIABLE,
        corroboration_level=CorroborationLevel.CORROBORATED,
        epistemic_status=EpistemicStatus.FACT,
        supporting_evidence_ids=[artifact.artifact_id],
        contradicting_evidence_ids=[],
    )
    store.save_fact(fact)

    # 4. Backward Traceability Verification
    # Given fact -> trace to observation -> trace to artifact -> trace to hash and custody
    assert fact.source_artifact_id == artifact.artifact_id
    assert fact.source_observation_id == obs.observation_id

    retrieved_obs = store.get_observation(fact.source_observation_id)
    assert retrieved_obs is not None
    assert retrieved_obs.artifact_id == artifact.artifact_id

    retrieved_art = store.get_artifact(fact.source_artifact_id)
    assert retrieved_art is not None
    assert retrieved_art.content_hash == artifact.content_hash

    custody = store.get_custody_events(artifact.artifact_id)
    assert len(custody) >= 1
    assert custody[0].content_hash_at_event == retrieved_art.content_hash

    provenance = store.get_provenance(artifact.artifact_id)
    assert provenance is not None
    assert provenance.root_artifact_hash == retrieved_art.content_hash
    assert provenance.provenance_type == SourceProvenanceType.SIMULATED_AUTHORIZED_SOURCE

    # Verify queryability from subject
    subject_facts = store.get_facts_by_subject("PH001")
    assert len(subject_facts) == 1
    assert subject_facts[0].object == "PH002"
    assert subject_facts[0].predicate == "CONTACTED"
