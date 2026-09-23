from __future__ import annotations

import pytest
from app.adapters.adapter_context import AdapterContext
from app.adapters.adapter_registry import SourceAdapterRegistry
from app.adapters.adapter_result import AdapterResult
from app.adapters.source_adapter import SourceAdapter
from app.domain.canonical_evidence_ir import (
    CorroborationLevel,
    EpistemicStatus,
    EvidenceArtifact,
    EvidenceFact,
    EvidenceObservation,
    EvidenceSourceType,
    SourceProvenanceType,
    SourceReliability,
    generate_uuid7,
)
from app.repositories.unified_store import UnifiedStore
from app.services.evidence_gateway import EvidenceGateway
from app.services.evidence_integrity_validator import EvidenceIntegrityValidator


def test_registry_registers_exactly_11_families():
    registry = SourceAdapterRegistry.get_instance()
    assert registry.count() == 11

    expected_families = {
        EvidenceSourceType.CCTNS_FIR,
        EvidenceSourceType.ICJS_RECORD,
        EvidenceSourceType.EFSL_REPORT,
        EvidenceSourceType.CDR_TELECOM,
        EvidenceSourceType.FINANCIAL_TRANSACTION,
        EvidenceSourceType.MOBILE_FORENSIC_EXPORT,
        EvidenceSourceType.COMPUTER_FORENSIC_EXPORT,
        EvidenceSourceType.CLOUD_AUDIT_LOG,
        EvidenceSourceType.CCTV_ANPR,
        EvidenceSourceType.NETWORK_PCAP_LOG,
        EvidenceSourceType.FORENSIC_DOCUMENT,
    }

    registered_types = {adapter.source_type for adapter in registry._adapters.values()}
    assert registered_types == expected_families


def test_adapter_result_contract_consistency():
    registry = SourceAdapterRegistry.get_instance()
    for source_type in EvidenceSourceType:
        adapter = registry.get(source_type)
        assert adapter is not None
        assert isinstance(adapter, SourceAdapter)
        assert adapter.adapter_id is not None
        assert adapter.adapter_version is not None
        assert isinstance(adapter.capabilities(), list)
        assert adapter.health()["status"] == "HEALTHY"
        assert "version" in adapter.schema()


def test_evidence_integrity_validator_detects_orphans():
    store = UnifiedStore.get_instance()
    store.clear()

    # 1. Test orphan observation (references non-existent artifact)
    orphan_obs = EvidenceObservation(
        artifact_id="BOGUS-NON-EXISTENT-ARTIFACT-ID",
        case_id="CASE-2026-001",
        source_location="line=1",
        observation_type="PHONE_CALL",
    )
    val_obs = EvidenceIntegrityValidator.validate_observation(orphan_obs, store)
    assert val_obs.is_valid is False
    assert val_obs.is_orphan is True
    assert "does not exist in store" in val_obs.errors[0]

    # 2. Test orphan fact (references non-existent artifact)
    orphan_fact = EvidenceFact(
        case_id="CASE-2026-001",
        subject="P001",
        predicate="OWNS",
        object="V188",
        source_artifact_id="BOGUS-NON-EXISTENT-ARTIFACT-ID",
        source_location="line=1",
    )
    val_fact = EvidenceIntegrityValidator.validate_fact(orphan_fact, store)
    assert val_fact.is_valid is False
    assert val_fact.is_orphan is True

    # 3. Test orphan event
    orphan_event = {
        "event_type": "ORPHAN_EVENT",
        "source_artifact_id": "BOGUS-NON-EXISTENT-ARTIFACT-ID",
    }
    val_event = EvidenceIntegrityValidator.validate_event(orphan_event, store)
    assert val_event.is_valid is False
    assert val_event.is_orphan is True

    # 4. Now ingest a real artifact and verify valid fact passes
    import tempfile, shutil
    temp_dir = tempfile.mkdtemp()
    try:
        gateway = EvidenceGateway(storage_root=temp_dir, store=store)
        art = gateway.ingest_artifact(
            content=b'{"sample": "data"}',
            filename="valid_test.json",
            case_id="CASE-2026-001",
            source_id="TEST-SOURCE",
            source_type=EvidenceSourceType.CCTNS_FIR,
            record_id="REC-001",
        )

        valid_fact = EvidenceFact(
            case_id="CASE-2026-001",
            subject="P001",
            predicate="ACCUSED_IN",
            object="CASE-2026-001",
            source_artifact_id=art.artifact_id,
            source_location="sample=data",
        )
        store.save_fact(valid_fact)

        val_valid = EvidenceIntegrityValidator.validate_fact(valid_fact, store)
        assert val_valid.is_valid is True
        assert val_valid.is_orphan is False
        assert val_valid.content_hash == art.content_hash
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
