"""
Tests for Section 2.1: Entity Resolution, Identifier Normalization, Conflict Detection,
Investigator Decision Management, and Telecom/Temporal Reasoning Preconditions.
"""

import pytest
from tarka.contracts.canonical_v1 import (
    EntityType,
    AmbiguityType,
    EntityProvenance,
    CanonicalEntity,
    CanonicalRelationship,
    ReviewState,
)
from tarka.core.entity_resolution import (
    normalize_ip,
    normalize_bank_account,
    normalize_upi_id,
    normalize_msisdn,
    normalize_imei,
    EntityProfile,
    ExaminerReviewState,
    IdentityConflictType,
    IdentityConflictDetector,
    DecisionType,
    EntityDecision,
    EntityDecisionManager,
    HardVetoViolationError,
)
from tarka.core.cgnat_attribution import (
    enforce_cgnat_inadmissibility_guardrail,
)
from tarka.core.timeline_reconstruction import (
    ForensicTimelineEvent,
    TimelineEventType,
)


def test_canonical_entity_types_and_ambiguity_contracts():
    """Verify all 2.1 canonical entity types, ambiguity categories, and provenance schemas."""
    # Canonical Entity Types
    assert EntityType.PERSON == "PERSON"
    assert EntityType.BANK_ACCOUNT == "BANK_ACCOUNT"
    assert EntityType.UPI_ID == "UPI_ID"
    assert EntityType.PHONE_NUMBER == "PHONE_NUMBER"
    assert EntityType.DEVICE == "DEVICE"
    assert EntityType.IP_ADDRESS == "IP_ADDRESS"
    assert EntityType.MERCHANT == "MERCHANT"

    # Ambiguity Types
    assert AmbiguityType.SHARED_HOTSPOT == "SHARED_HOTSPOT"
    assert AmbiguityType.CGNAT_POOL == "CGNAT_POOL"
    assert AmbiguityType.PUBLIC_WIFI == "PUBLIC_WIFI"
    assert AmbiguityType.CELL_TOWER_SECTOR == "CELL_TOWER_SECTOR"
    assert AmbiguityType.MULTI_USER_DEVICE == "MULTI_USER_DEVICE"

    # Provenance Schema
    prov = EntityProvenance(
        source_evidence_id="EXH-BANK-001",
        attribute_name="account_number",
        observed_raw_value="00000123456789",
        normalized_value="123456789",
        confidence_score=1.0,
        timestamp_utc="2026-02-14T05:30:00Z",
    )
    assert prov.source_evidence_id == "EXH-BANK-001"
    assert prov.normalized_value == "123456789"

    # Canonical Entity with Provenance & Historical Identifiers
    entity = CanonicalEntity(
        entity_id="ENT-MULE-01",
        entity_type=EntityType.PERSON,
        canonical_name="Ramesh Kumar",
        normalised_identifiers={"msisdn": "+919876543210"},
        entity_provenance=[prov],
        historical_identifiers={"msisdn": [{"value": "+919111111111", "valid_until": "2025-12-31"}]},
    )
    assert entity.entity_id == "ENT-MULE-01"
    assert len(entity.entity_provenance) == 1
    assert "msisdn" in entity.historical_identifiers

    # Canonical Relationship with Ambiguity Guardrail
    rel = CanonicalRelationship(
        relationship_id="REL-001",
        source_entity_id="ENT-01",
        target_entity_id="ENT-02",
        relationship_type="CO_LOCATED_IP",
        ambiguity_type=AmbiguityType.CGNAT_POOL,
        ambiguity_caution_notice="DoT Clause 39.20: Co-location via CGNAT pool does not imply common ownership.",
    )
    assert rel.ambiguity_type == AmbiguityType.CGNAT_POOL
    assert "DoT Clause 39.20" in (rel.ambiguity_caution_notice or "")


def test_identifier_normalisation():
    """Verify normalization of IP (IPv4, IPv6, CGNAT), Bank Account (CBS & IFSC), and UPI IDs."""
    # CGNAT IPv4
    res_cgnat = normalize_ip("100.64.12.34:8080")
    assert res_cgnat is not None
    assert res_cgnat["canonical_ip"] == "100.64.12.34"
    assert res_cgnat["port"] == 8080
    assert res_cgnat["is_cgnat"] is True
    assert res_cgnat["requires_port_translation"] is True
    assert "RFC 6598 CGNAT" in res_cgnat["statutory_caution"]

    # Public IPv4 without port
    res_pub = normalize_ip("103.21.144.92")
    assert res_pub is not None
    assert res_pub["canonical_ip"] == "103.21.144.92"
    assert res_pub["port"] is None
    assert res_pub["requires_port_translation"] is True

    # Bank Account & IFSC
    res_acc = normalize_bank_account("9876543210123", ifsc="SBIN0001234")
    assert res_acc is not None
    assert res_acc["account_number"] == "9876543210123"
    assert res_acc["ifsc"] == "SBIN0001234"
    assert res_acc["bank_code"] == "SBIN"
    assert res_acc["composite_key"] == "SBIN0001234:9876543210123"
    assert res_acc["suffix_last4"] == "0123"

    # UPI ID / VPA
    res_vpa = normalize_upi_id("payee.merchant99@oksbi")
    assert res_vpa is not None
    assert res_vpa["canonical_vpa"] == "payee.merchant99@oksbi"
    assert res_vpa["username"] == "payee.merchant99"
    assert res_vpa["psp_handle"] == "oksbi"

    # Invalid UPI ID
    assert normalize_upi_id("not-a-vpa") is None


def test_identity_conflict_detector():
    """Verify conflict detection for incomplete identity, name mismatch, and shared device ambiguity."""
    p_incomplete = EntityProfile(
        entity_id="ENT_INC_01",
        canonical_name="Unknown Suspect",
    )
    p1 = EntityProfile(
        entity_id="ENT_01",
        canonical_name="Vikram Singh",
        normalized_phone="+919876543210",
        normalized_device_imei="860123456789012",
        associated_evidence_ids=["EXH-01"],
    )
    p2 = EntityProfile(
        entity_id="ENT_02",
        canonical_name="Rajesh Gupta",
        normalized_phone="+919876543210",  # Same phone, different name!
        normalized_device_imei="860123456789012",  # Same device!
        associated_evidence_ids=["EXH-02"],
    )

    conflicts = IdentityConflictDetector.detect_conflicts(
        profiles=[p_incomplete, p1, p2],
        records=[
            {"vpa": "orphan.vpa@ybl", "evidence_id": "EXH-ORPHAN"},
            {"ip_address": "100.64.0.1", "evidence_id": "EXH-CGNAT"},
        ],
    )

    conflict_types = [c.conflict_type for c in conflicts]
    assert IdentityConflictType.INCOMPLETE_IDENTIFIERS in conflict_types
    assert IdentityConflictType.NAME_MISMATCH in conflict_types
    assert IdentityConflictType.SHARED_DEVICE_AMBIGUITY in conflict_types
    assert IdentityConflictType.ORPHAN_VPA in conflict_types
    assert IdentityConflictType.SHARED_CGNAT_AMBIGUITY in conflict_types


def test_entity_decision_manager_and_hard_veto():
    """Verify human investigator decisions and constitutional hard veto enforcement."""
    mgr = EntityDecisionManager()

    p_a = EntityProfile(
        entity_id="ENT_A",
        canonical_name="Amit Shah",
        normalized_phone="+919876543210",
    )
    p_b = EntityProfile(
        entity_id="ENT_B",
        canonical_name="Suresh Patel",
        normalized_phone="+919123456789",  # Conflicting phone!
    )

    # 1. Attempting merge without override must raise HardVetoViolationError
    dec_unauthorized = EntityDecision(
        decision_id="DEC-001",
        decision_type=DecisionType.MERGE_ENTITIES,
        target_entity_ids=["ENT_A", "ENT_B"],
        investigator_id="INV-404",
        justification="Believed to be same person based on gut feeling",
        hard_veto_override=False,
    )
    with pytest.raises(HardVetoViolationError) as exc_info:
        mgr.apply_merge(dec_unauthorized, p_a, p_b)
    assert "Constitutional Veto" in str(exc_info.value)

    # 2. Attempting override without supervisor signoff must also fail
    dec_no_signoff = EntityDecision(
        decision_id="DEC-002",
        decision_type=DecisionType.MERGE_ENTITIES,
        target_entity_ids=["ENT_A", "ENT_B"],
        investigator_id="INV-404",
        justification="High suspicion",
        hard_veto_override=True,
        supervisor_signoff=None,
    )
    with pytest.raises(HardVetoViolationError) as exc_info:
        mgr.apply_merge(dec_no_signoff, p_a, p_b)
    assert "supervisor_signoff" in str(exc_info.value)

    # 3. Legitimate merge with matching identifiers
    p_c = EntityProfile(
        entity_id="ENT_C",
        canonical_name="Amit K. Shah",
        normalized_phone="+919876543210",  # Same phone
        normalized_account_number="9876543210123",
        associated_evidence_ids=["EXH-C"],
    )
    dec_legit = EntityDecision(
        decision_id="DEC-003",
        decision_type=DecisionType.MERGE_ENTITIES,
        target_entity_ids=["ENT_A", "ENT_C"],
        investigator_id="INV-101",
        justification="Corroborated by identical bank registered phone number and CDR logs",
    )
    merged = mgr.apply_merge(dec_legit, p_a, p_c)
    assert merged.entity_id == "ENT_MERGED_ENT_A_ENT_C"
    assert merged.normalized_account_number == "9876543210123"
    assert merged.review_state == ExaminerReviewState.CONFIRMED
    assert len(mgr.decision_history) == 1

    # 4. Split operation
    dec_split = EntityDecision(
        decision_id="DEC-004",
        decision_type=DecisionType.SPLIT_ENTITY,
        target_entity_ids=[merged.entity_id],
        investigator_id="INV-101",
        justification="Splitting account number due to family joint account finding",
    )
    p_split1, p_split2 = mgr.apply_split(dec_split, merged, "9876543210123")
    assert p_split1.normalized_account_number is None
    assert p_split2.normalized_account_number == "9876543210123"


def test_cgnat_inadmissibility_guardrail():
    """Verify DoT Clause 39.20 statutory guardrail for CGNAT / Gateway IPs."""
    # Without NAT translation -> Inadmissible
    res_inadmissible = enforce_cgnat_inadmissibility_guardrail(
        ip_address="100.64.50.12",
        source_port=None,
        has_isp_nat_translation=False,
    )
    assert res_inadmissible.is_admissible_for_individual_attribution is False
    assert res_inadmissible.status == "INSUFFICIENT_EVIDENCE_SHARED_GATEWAY"
    assert "Section 91 CrPC" in (res_inadmissible.required_action or "")

    # With NAT translation -> Admissible
    res_admissible = enforce_cgnat_inadmissibility_guardrail(
        ip_address="100.64.50.12",
        source_port=49152,
        has_isp_nat_translation=True,
    )
    assert res_admissible.is_admissible_for_individual_attribution is True
    assert res_admissible.status == "PORT_MAPPED_VERIFIED"


def test_timeline_clock_drift_uncertainty():
    """Verify causal ordering under clock drift bounds [t - delta, t + delta]."""
    evt_a = ForensicTimelineEvent(
        event_id="EVT-A",
        timestamp="2026-02-14 10:00:00 IST",
        timestamp_iso="2026-02-14T04:30:00Z",
        timestamp_epoch=1771043400.0,
        event_type=TimelineEventType.PAYMENT_COMPLETED,
        title="Payment 1",
        description="Transfer 1",
        clock_drift_uncertainty_sec=5.0,  # [t-5, t+5] -> [1771043395, 1771043405]
    )

    # Event B occurs 4 seconds later (within uncertainty)
    evt_b_concurrent = ForensicTimelineEvent(
        event_id="EVT-B",
        timestamp="2026-02-14 10:00:04 IST",
        timestamp_iso="2026-02-14T04:30:04Z",
        timestamp_epoch=1771043404.0,
        event_type=TimelineEventType.CALL_EVENT,
        title="Call 1",
        description="Call event",
        clock_drift_uncertainty_sec=5.0,  # [1771043399, 1771043409]
    )

    # Event C occurs 30 seconds later (strictly causal)
    evt_c_causal = ForensicTimelineEvent(
        event_id="EVT-C",
        timestamp="2026-02-14 10:00:30 IST",
        timestamp_iso="2026-02-14T04:30:30Z",
        timestamp_epoch=1771043430.0,
        event_type=TimelineEventType.PAYMENT_COMPLETED,
        title="Payment 2",
        description="Transfer 2",
        clock_drift_uncertainty_sec=5.0,  # [1771043425, 1771043435]
    )

    # Evt A and Evt B have temporal overlap (uncertain causal order)
    assert evt_a.has_temporal_overlap(evt_b_concurrent) is True
    assert evt_a.is_causally_before(evt_b_concurrent) is False

    # Evt A strictly precedes Evt C (causally determined beyond uncertainty)
    assert evt_a.has_temporal_overlap(evt_c_causal) is False
    assert evt_a.is_causally_before(evt_c_causal) is True

