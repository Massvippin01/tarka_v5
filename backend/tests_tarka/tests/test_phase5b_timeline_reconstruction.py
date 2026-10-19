"""Unit and integration test suite for TARKA Phase 5B: Timeline Reconstruction & Event Reasoning Engine."""

import pytest
from fastapi.testclient import TestClient

from tarka.core.canonical_fact import CanonicalFact, CanonicalFactKind, TimezoneProvenance
from tarka.core.evidence_dna import Artifact
from tarka.core.models import TrustTier, AuthType
from tarka.core.timeline_reconstruction import (
    TimelineReconstructionEngine,
    TimelineEventType,
    EventStatus,
    TemporalResolutionPriority,
)
from tarka.core.investigation_graph import (
    InvestigationGraphBuilder,
    ForensicNodeType,
    ForensicEdgeType,
)
from tarka.core.cross_source_correlation import CorrelationEngine
from tarka.api.server import app, case_store


@pytest.fixture
def test_client():
    return TestClient(app)


@pytest.fixture
def sample_artifacts():
    return [
        Artifact(
            artifact_id="ART-001-BANK",
            case_id="case_timeline_test",
            filename="bank_statement.csv",
            sha256="1111111111111111111111111111111111111111111111111111111111111111",
            file_size_bytes=1024,
            mime_type="text/csv",
            source_tier="T1",
            intake_officer="Officer Test",
            intake_timestamp_iso="2026-02-14T05:00:00Z",
            custody_chain_sequence=1,
            storage_path="/vault/bank_statement.csv",
        ),
        Artifact(
            artifact_id="ART-002-CHAT",
            case_id="case_timeline_test",
            filename="whatsapp_chat.txt",
            sha256="2222222222222222222222222222222222222222222222222222222222222222",
            file_size_bytes=2048,
            mime_type="text/plain",
            source_tier="T2",
            intake_officer="Officer Test",
            intake_timestamp_iso="2026-02-14T05:00:00Z",
            custody_chain_sequence=2,
            storage_path="/vault/whatsapp_chat.txt",
        ),
        Artifact(
            artifact_id="ART-003-SCREEN",
            case_id="case_timeline_test",
            filename="screenshot_claim.json",
            sha256="3333333333333333333333333333333333333333333333333333333333333333",
            file_size_bytes=4096,
            mime_type="application/json",
            source_tier="T3",
            intake_officer="Officer Test",
            intake_timestamp_iso="2026-02-14T05:00:00Z",
            custody_chain_sequence=3,
            storage_path="/vault/screenshot_claim.json",
        ),
    ]


@pytest.fixture
def sample_facts():
    # Chat at 10:19:30 IST (1771044570.0)
    fact_chat = CanonicalFact(
        fact_id="FACT-CHAT-01",
        case_id="case_timeline_test",
        artifact_id="ART-002-CHAT",
        evidence_id="EVI-CHAT-01",
        kind=CanonicalFactKind.CHAT_MESSAGE,
        source_filename="whatsapp_chat.txt",
        source_location="Line 14",
        sha256="2222222222222222222222222222222222222222222222222222222222222222",
        trust_tier=TrustTier.T2,
        auth_track=AuthType.ACTIVE,
        time_provenance=TimezoneProvenance(
            recorded_time="14/02/2026, 10:19:30",
            stated_timezone="IST",
            assumed_timezone="Asia/Kolkata (UTC+05:30)",
            utc_iso="2026-02-14T04:49:30Z",
            utc_epoch=1771044570.0,
            conversion_rationale="WhatsApp IST message timestamp",
        ),
        primary_entity="Amit Sharma",
        secondary_entity="merchant.pay@okaxis",
        amount=25000.0,
        currency="INR",
        identifiers={"rrn": "202602148891", "vpa": "merchant.pay@okaxis"},
        summary="Please transfer Rs 25,000 urgently to merchant.pay@okaxis for clearance (RRN: 202602148891)",
        raw_source_snippet="[14/02/26, 10:19:30 AM] Amit Sharma: Please transfer Rs 25,000 urgently",
    )

    # Bank debit at 10:24:00 IST (1771044840.0)
    fact_bank = CanonicalFact(
        fact_id="FACT-BANK-01",
        case_id="case_timeline_test",
        artifact_id="ART-001-BANK",
        evidence_id="EVI-BANK-01",
        kind=CanonicalFactKind.BANK_TRANSACTION,
        source_filename="bank_statement.csv",
        source_location="Row 4",
        sha256="1111111111111111111111111111111111111111111111111111111111111111",
        trust_tier=TrustTier.T1,
        auth_track=AuthType.ACTIVE,
        time_provenance=TimezoneProvenance(
            recorded_time="2026-02-14 10:24:00",
            stated_timezone="IST",
            assumed_timezone="Asia/Kolkata (UTC+05:30)",
            utc_iso="2026-02-14T04:54:00Z",
            utc_epoch=1771044840.0,
            conversion_rationale="Core banking ledger IST",
        ),
        primary_entity="HDFC Bank",
        secondary_entity="merchant.pay@okaxis",
        amount=25000.0,
        currency="INR",
        identifiers={"rrn": "202602148891", "vpa": "merchant.pay@okaxis", "account_suffix": "9012"},
        summary="UPI Debit to merchant.pay@okaxis Rs 25,000 under RRN 202602148891",
        raw_source_snippet="14-02-2026,UPI/202602148891/merchant.pay@okaxis,25000.00,DR",
    )

    # Screenshot claim at 10:26:00 IST (1771044960.0) alleging Rs 15,000 under the same RRN
    fact_screen = CanonicalFact(
        fact_id="FACT-SCREEN-01",
        case_id="case_timeline_test",
        artifact_id="ART-003-SCREEN",
        evidence_id="EVI-SCREEN-01",
        kind=CanonicalFactKind.MEDIA_METADATA,
        source_filename="screenshot_claim.json",
        source_location="Field: claimed_details",
        sha256="3333333333333333333333333333333333333333333333333333333333333333",
        trust_tier=TrustTier.T3,
        auth_track=AuthType.PASSIVE,
        time_provenance=TimezoneProvenance(
            recorded_time="2026-02-14 10:26:00",
            stated_timezone="IST",
            assumed_timezone="Asia/Kolkata (UTC+05:30)",
            utc_iso="2026-02-14T04:56:00Z",
            utc_epoch=1771044960.0,
            conversion_rationale="Screenshot EXIF time",
        ),
        primary_entity="Victim Handset",
        amount=15000.0,
        currency="INR",
        identifiers={"rrn": "202602148891"},
        summary="Receipt screenshot claims payment of Rs 15,000 with RRN 202602148891",
        raw_source_snippet='{"amount": 15000.0, "rrn": "202602148891", "status": "SUCCESS"}',
        is_contradiction=True,
    )

    return [fact_chat, fact_bank, fact_screen]


def test_event_creation_from_transaction(sample_facts, sample_artifacts):
    """Scenario 1: Bank transaction produces PAYMENT_COMPLETED with amount and RRN."""
    engine = TimelineReconstructionEngine()
    artifacts_map = {a.artifact_id: a for a in sample_artifacts}
    bank_fact = sample_facts[1]

    event = engine.extract_event_from_fact(bank_fact, 1, artifacts_map)

    assert event.event_type == TimelineEventType.PAYMENT_COMPLETED
    assert event.amount == 25000.0
    assert event.identifiers.get("rrn") == "202602148891"
    assert event.temporal_priority == TemporalResolutionPriority.EXACT_SOURCE.value
    assert "25,000" in event.title
    assert event.status == EventStatus.ACTIVE.value
    assert event.source_artifact_ids == ["ART-001-BANK"]
    assert event.supporting_fact_ids == ["FACT-BANK-01"]


def test_chat_message_generates_event(sample_facts, sample_artifacts):
    """Scenario 2: WhatsApp chat produces PAYMENT_REQUEST with amounts and VPA."""
    engine = TimelineReconstructionEngine()
    artifacts_map = {a.artifact_id: a for a in sample_artifacts}
    chat_fact = sample_facts[0]

    event = engine.extract_event_from_fact(chat_fact, 1, artifacts_map)

    assert event.event_type == TimelineEventType.PAYMENT_REQUEST
    assert event.amount == 25000.0
    assert event.identifiers.get("rrn") == "202602148891"
    assert event.temporal_priority == TemporalResolutionPriority.EVIDENCE_SOURCE.value
    assert "Payment Request" in event.title
    assert "Amit Sharma" in event.description


def test_events_sorted_by_timestamp(sample_facts, sample_artifacts):
    """Scenario 3: Events are chronologically sorted by normalized UTC timestamp."""
    engine = TimelineReconstructionEngine()
    # Shuffle facts to test sorting
    shuffled_facts = [sample_facts[2], sample_facts[0], sample_facts[1]]

    timeline = engine.build_timeline("case_timeline_test", shuffled_facts, sample_artifacts)

    assert timeline.total_events == 3
    # Chat at 10:19:30 should be first
    assert timeline.events[0].supporting_fact_ids == ["FACT-CHAT-01"]
    assert timeline.events[0].event_type == TimelineEventType.PAYMENT_REQUEST
    # Bank debit at 10:24:00 should be second
    assert timeline.events[1].supporting_fact_ids == ["FACT-BANK-01"]
    assert timeline.events[1].event_type == TimelineEventType.PAYMENT_COMPLETED
    # Screenshot at 10:26:00 should be third
    assert timeline.events[2].supporting_fact_ids == ["FACT-SCREEN-01"]
    assert timeline.events[2].event_type == TimelineEventType.DOCUMENTED_TRANSACTION_STATE

    # Monotonic epoch timestamps
    assert timeline.events[0].timestamp_epoch <= timeline.events[1].timestamp_epoch
    assert timeline.events[1].timestamp_epoch <= timeline.events[2].timestamp_epoch


def test_timestamp_conflict_detection(sample_facts, sample_artifacts):
    """Scenario 4: Contradictory amount under shared RRN flagged as CONFLICT without silent smoothing."""
    engine = TimelineReconstructionEngine()
    timeline = engine.build_timeline("case_timeline_test", sample_facts, sample_artifacts)

    # 1. Timeline should report conflict count >= 1
    assert timeline.conflicts_count >= 1
    assert len(timeline.temporal_conflicts) >= 1

    conflict = timeline.temporal_conflicts[0]
    assert conflict["conflict_type"] == "AMOUNT_AND_STATE_MISMATCH"
    assert conflict["rrn"] == "202602148891"
    assert conflict["delta_amount"] == 10000.0

    # 2. Both bank event and screenshot event should be marked with status="CONFLICT"
    bank_event = next(e for e in timeline.events if e.supporting_fact_ids == ["FACT-BANK-01"])
    screen_event = next(e for e in timeline.events if e.supporting_fact_ids == ["FACT-SCREEN-01"])

    assert bank_event.status == EventStatus.CONFLICT.value
    assert screen_event.status == EventStatus.CONFLICT.value
    assert screen_event.event_id in bank_event.conflicting_event_ids
    assert bank_event.event_id in screen_event.conflicting_event_ids
    assert "Discrepancy: ₹10,000.00" in bank_event.conflict_explanation


def test_event_provenance_links(sample_facts, sample_artifacts):
    """Scenario 5: Provenance links point directly to underlying artifact, fact, and evidence."""
    engine = TimelineReconstructionEngine()
    timeline = engine.build_timeline("case_timeline_test", sample_facts, sample_artifacts)

    for evt in timeline.events:
        assert len(evt.provenance_links) >= 2
        assert any(link.startswith("ART-") for link in evt.provenance_links)
        assert any(link.startswith("FACT-") for link in evt.provenance_links)
        assert evt.evidence["sha256"] is not None


def test_counterfactual_event_deactivation(sample_facts, sample_artifacts):
    """Scenario 6: Counterfactual exclusion of screenshot deactivates screenshot event with reason,
    while independent bank and chat events survive."""
    engine = TimelineReconstructionEngine()

    from tarka.core.analysis_run import AnalysisRun
    counterfactual_run = AnalysisRun(
        run_id="RUN_EXCLUDE_SCREEN",
        case_id="case_timeline_test",
        title="Exclude Challenged Screenshot",
        excluded_artifact_ids=["ART-003-SCREEN"],
        created_at_iso="2026-02-14T06:00:00Z",
        analysis_fingerprint="abc1234567890def",
    )

    timeline = engine.build_timeline(
        case_id="case_timeline_test",
        facts=sample_facts,
        artifacts=sample_artifacts,
        run=counterfactual_run,
    )

    assert timeline.total_events == 3
    assert timeline.active_events_count == 2
    assert timeline.inactive_events_count == 1

    # Inactive event inspection
    inactive_evt = next(e for e in timeline.events if e.status == EventStatus.INACTIVE.value)
    assert inactive_evt.supporting_fact_ids == ["FACT-SCREEN-01"]
    assert "Derived from excluded artifact ART-003-SCREEN" in inactive_evt.inactive_reason

    # Surviving events inspection
    active_evts = [e for e in timeline.events if e.status == EventStatus.ACTIVE.value]
    assert len(active_evts) == 2
    active_fact_ids = [e.supporting_fact_ids[0] for e in active_evts]
    assert "FACT-CHAT-01" in active_fact_ids
    assert "FACT-BANK-01" in active_fact_ids


def test_graph_integration_with_timeline(sample_facts, sample_artifacts):
    """Tests that timeline events and PRECEDES / CONFLICTS_WITH edges are populated into InvestigationGraph."""
    engine = TimelineReconstructionEngine()
    timeline = engine.build_timeline("case_timeline_test", sample_facts, sample_artifacts)

    correlations, _ = CorrelationEngine().correlate_case(sample_facts)
    base_graph = InvestigationGraphBuilder.build_case_graph(
        "case_timeline_test",
        sample_artifacts,
        sample_facts,
        correlations,
    )

    augmented_graph = engine.integrate_timeline_into_graph(base_graph, timeline)

    # 1. Check EVENT nodes exist
    event_nodes = [n for n in augmented_graph.nodes if n.node_type == ForensicNodeType.EVENT]
    assert len(event_nodes) == 3

    # 2. Check PRECEDES edges exist
    precedes_edges = [e for e in augmented_graph.edges if e.edge_type == ForensicEdgeType.PRECEDES]
    assert len(precedes_edges) >= 1

    # 3. Check SUPPORTED_BY edges exist
    supported_by_edges = [e for e in augmented_graph.edges if e.edge_type == ForensicEdgeType.SUPPORTED_BY]
    assert len(supported_by_edges) == 3

    # 4. Check CONFLICTS_WITH edges exist
    conflict_edges = [e for e in augmented_graph.edges if e.edge_type == ForensicEdgeType.CONFLICTS_WITH]
    assert len(conflict_edges) >= 1


def test_api_timeline_endpoint(test_client):
    """Scenario 7: GET /api/cases/{case_id}/timeline returns deterministic reconstructed timeline."""
    response = test_client.get("/api/cases/upi_payment_discrepancy/timeline")
    assert response.status_code == 200

    data = response.json()
    assert data["case_id"] == "upi_payment_discrepancy"
    assert data["total_events"] > 0
    assert len(data["events"]) == data["total_events"]
    assert "fingerprint" in data
    assert len(data["fingerprint"]) == 64  # SHA-256 hex string

    # Verify event structure
    first_event = data["events"][0]
    assert "id" in first_event
    assert "timestamp" in first_event
    assert "timestamp_iso" in first_event
    assert "type" in first_event
    assert "status" in first_event
    assert "temporal_priority" in first_event
    assert "evidence" in first_event

    # Test with baseline run
    resp_baseline = test_client.get("/api/cases/upi_payment_discrepancy/timeline?run_id=baseline")
    assert resp_baseline.status_code == 200
    assert resp_baseline.json()["case_id"] == "upi_payment_discrepancy"
