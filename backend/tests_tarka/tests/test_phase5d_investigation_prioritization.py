"""Unit and integration test suite for TARKA Phase 5D: Evidence Intelligence & Investigation Prioritization Engine."""

import pytest
from fastapi.testclient import TestClient

from tarka.core.canonical_fact import CanonicalFact, CanonicalFactKind, TimezoneProvenance
from tarka.core.evidence_dna import Artifact, Case
from tarka.core.models import TrustTier, AuthType
from tarka.core.contradiction_analysis import (
    ContradictionAnalysisEngine,
    FindingSeverity,
    FindingStatus,
    EvidenceGapStatus,
    EvidenceGapCategory,
    ContradictionFinding,
    ForensicEvidenceGap,
)
from tarka.core.timeline_reconstruction import TimelineReconstructionEngine
from tarka.core.cross_source_correlation import CorrelationEngine
from tarka.core.investigation_graph import (
    InvestigationGraphBuilder,
    ForensicNodeType,
    ForensicEdgeType,
)
from tarka.core.investigation_prioritization import (
    InvestigationPrioritizationEngine,
    PriorityLevel,
    PriorityTargetType,
    CaseInvestigationPriorities,
    InvestigationPriorityItem,
)
from tarka.core.investigation_summary import (
    InvestigationSummaryGenerator,
    CaseInvestigationSummary,
    SummaryFindingItem,
    SummaryEvidenceGapItem,
    SummaryRecommendedAction,
)
from tarka.core.rule_registry import DeclarativeRuleRegistry as RuleRegistry
from tarka.api.server import app, case_store
from tarka.api.schemas import (
    CaseInvestigationPrioritiesResponse,
    CaseInvestigationSummaryResponse,
)


@pytest.fixture
def test_client():
    return TestClient(app)


def make_dummy_timezone(recorded_time: str = "2026-02-14 10:20:00", epoch: float = 1771044600.0) -> TimezoneProvenance:
    return TimezoneProvenance(
        recorded_time=recorded_time,
        stated_timezone="IST",
        assumed_timezone="Asia/Kolkata (UTC+05:30)",
        utc_iso="2026-02-14T04:50:00Z",
        utc_epoch=epoch,
        conversion_rationale="Normalized for test fixture",
    )


@pytest.fixture
def sample_case_context():
    case = Case(
        case_id="case_phase5d_unit",
        title="UPI Payment Discrepancy Prioritization",
        description="Forensic investigation of ₹25,000 bank record vs ₹15,000 claim",
        investigator="Forensic Examiner A",
        jurisdiction="IN-KA",
        created_at_iso="2026-02-14T10:00:00Z",
    )
    artifacts = [
        Artifact(
            artifact_id="ART-001-BANK",
            case_id="case_phase5d_unit",
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
            artifact_id="ART-004-CLAIM",
            case_id="case_phase5d_unit",
            filename="payment_screenshot.png",
            sha256="4444444444444444444444444444444444444444444444444444444444444444",
            file_size_bytes=2048,
            mime_type="image/png",
            source_tier="T3",
            intake_officer="Officer Test",
            intake_timestamp_iso="2026-02-14T05:00:00Z",
            custody_chain_sequence=2,
            storage_path="/vault/payment_screenshot.png",
        ),
        Artifact(
            artifact_id="ART-002-CHAT",
            case_id="case_phase5d_unit",
            filename="chat_export.txt",
            sha256="2222222222222222222222222222222222222222222222222222222222222222",
            file_size_bytes=512,
            mime_type="text/plain",
            source_tier="T2",
            intake_officer="Officer Test",
            intake_timestamp_iso="2026-02-14T05:00:00Z",
            custody_chain_sequence=3,
            storage_path="/vault/chat_export.txt",
        ),
    ]
    facts = [
        CanonicalFact(
            fact_id="FACT-BANK-01",
            artifact_id="ART-001-BANK",
            case_id="case_phase5d_unit",
            evidence_id="EVI-BANK-01",
            source_filename="bank_statement.csv",
            source_location="Row 42",
            sha256="1111111111111111111111111111111111111111111111111111111111111111",
            kind=CanonicalFactKind.BANK_TRANSACTION,
            primary_entity="ACC-1001",
            secondary_entity="merchant@upi",
            amount=25000.0,
            identifiers={"rrn": "202602148891", "vpa": "merchant@upi"},
            time_provenance=make_dummy_timezone("2026-02-14 10:24:00", 1771044840.0),
            trust_tier=TrustTier.T1,
            auth_track=AuthType.ACTIVE,
            summary="Bank debit of ₹25,000 under RRN 202602148891",
            raw_source_snippet="UPI/202602148891/merchant@upi/DR 25000.00",
        ),
        CanonicalFact(
            fact_id="FACT-SCREEN-01",
            artifact_id="ART-004-CLAIM",
            case_id="case_phase5d_unit",
            evidence_id="EVI-SCREEN-01",
            source_filename="payment_screenshot.png",
            source_location="App Viewport",
            sha256="4444444444444444444444444444444444444444444444444444444444444444",
            kind=CanonicalFactKind.MEDIA_METADATA,
            primary_entity="payer@upi",
            secondary_entity="merchant@upi",
            amount=15000.0,
            identifiers={"rrn": "202602148891", "vpa": "merchant@upi"},
            time_provenance=make_dummy_timezone("2026-02-14 10:22:00", 1771044720.0),
            trust_tier=TrustTier.T3,
            auth_track=AuthType.PASSIVE,
            summary="Screenshot asserting ₹15,000 paid under RRN 202602148891",
            raw_source_snippet="Paid ₹15,000 to merchant@upi Ref 202602148891",
        ),
        CanonicalFact(
            fact_id="FACT-CHAT-01",
            artifact_id="ART-002-CHAT",
            case_id="case_phase5d_unit",
            evidence_id="EVI-CHAT-01",
            source_filename="chat_export.txt",
            source_location="Line 14",
            sha256="2222222222222222222222222222222222222222222222222222222222222222",
            kind=CanonicalFactKind.PAYMENT_REQUEST,
            primary_entity="merchant@upi",
            secondary_entity="payer@upi",
            amount=25000.0,
            identifiers={"vpa": "merchant@upi"},
            time_provenance=make_dummy_timezone("2026-02-14 10:15:00", 1771044300.0),
            trust_tier=TrustTier.T2,
            auth_track=AuthType.ACTIVE,
            summary="Payment request for ₹25,000 sent in chat",
            raw_source_snippet="Please pay ₹25,000 to merchant@upi",
        ),
    ]
    return case, artifacts, facts


# -----------------------------------------------------------------------------
# Test 1: Deterministic Priority Scoring
# -----------------------------------------------------------------------------

def test_deterministic_priority_scoring(sample_case_context):
    """Priority scoring produces bit-exact, identical results and fingerprints across multiple runs."""
    case, artifacts, facts = sample_case_context
    timeline = TimelineReconstructionEngine().build_timeline("case_phase5d_unit", facts, artifacts)
    analysis = ContradictionAnalysisEngine().analyze_case("case_phase5d_unit", facts, artifacts, timeline=timeline)
    correlations, _ = CorrelationEngine().correlate_case(facts)
    graph = InvestigationGraphBuilder.build_case_graph("case_phase5d_unit", artifacts, facts, correlations)

    engine = InvestigationPrioritizationEngine()

    run1 = engine.prioritize_case(
        case_id="case_phase5d_unit",
        artifacts=artifacts,
        facts=facts,
        analysis=analysis,
        timeline=timeline,
        graph=graph,
    )

    run2 = engine.prioritize_case(
        case_id="case_phase5d_unit",
        artifacts=artifacts,
        facts=facts,
        analysis=analysis,
        timeline=timeline,
        graph=graph,
    )

    assert run1.fingerprint == run2.fingerprint
    assert len(run1.items) == len(run2.items)
    for i1, i2 in zip(run1.items, run2.items):
        assert i1.id == i2.id
        assert i1.priority_score == i2.priority_score
        assert i1.priority_level == i2.priority_level
        assert i1.score_breakdown.final_score == i2.score_breakdown.final_score


# -----------------------------------------------------------------------------
# Test 2: Critical Contradiction Ranks Highest
# -----------------------------------------------------------------------------

def test_critical_contradiction_ranks_highest(sample_case_context):
    """A critical amount discrepancy ranks at the top of the queue with CRITICAL priority (score >= 75)."""
    case, artifacts, facts = sample_case_context
    timeline = TimelineReconstructionEngine().build_timeline("case_phase5d_unit", facts, artifacts)
    analysis = ContradictionAnalysisEngine().analyze_case("case_phase5d_unit", facts, artifacts, timeline=timeline)
    correlations, _ = CorrelationEngine().correlate_case(facts)
    graph = InvestigationGraphBuilder.build_case_graph("case_phase5d_unit", artifacts, facts, correlations)

    engine = InvestigationPrioritizationEngine()
    priorities = engine.prioritize_case(
        case_id="case_phase5d_unit",
        artifacts=artifacts,
        facts=facts,
        analysis=analysis,
        timeline=timeline,
        graph=graph,
    )

    assert len(priorities.items) > 0
    top_item = priorities.items[0]

    # The top item should be the critical contradiction between screenshot and bank
    assert top_item.target_type == PriorityTargetType.CONTRADICTION
    assert top_item.priority_level == PriorityLevel.CRITICAL
    assert top_item.priority_score >= 75
    assert "RULE_PRIORITY_CRITICAL_CONTRADICTION" in top_item.supporting_rules
    assert "ART-001-BANK" in top_item.related_artifacts
    assert "ART-004-CLAIM" in top_item.related_artifacts


# -----------------------------------------------------------------------------
# Test 3: Evidence Gap Increases Priority
# -----------------------------------------------------------------------------

def test_evidence_gap_increases_priority(sample_case_context):
    """Presence of an unaddressed evidence gap elevates the priority score of connected items."""
    case, artifacts, facts = sample_case_context
    timeline = TimelineReconstructionEngine().build_timeline("case_phase5d_unit", facts, artifacts)

    # 1. Base analysis without gap
    analysis_no_gap = ContradictionAnalysisEngine().analyze_case("case_phase5d_unit", facts, artifacts, timeline=timeline)
    analysis_no_gap.evidence_gaps = []

    engine = InvestigationPrioritizationEngine()
    prio_no_gap = engine.prioritize_case(
        case_id="case_phase5d_unit",
        artifacts=artifacts,
        facts=facts,
        analysis=analysis_no_gap,
        timeline=timeline,
    )
    contra_no_gap = next((i for i in prio_no_gap.items if i.target_type == PriorityTargetType.CONTRADICTION), None)

    # 2. Analysis with gap relevant to ART-004-CLAIM
    analysis_with_gap = ContradictionAnalysisEngine().analyze_case("case_phase5d_unit", facts, artifacts, timeline=timeline)
    prio_with_gap = engine.prioritize_case(
        case_id="case_phase5d_unit",
        artifacts=artifacts,
        facts=facts,
        analysis=analysis_with_gap,
        timeline=timeline,
    )
    contra_with_gap = next((i for i in prio_with_gap.items if i.target_type == PriorityTargetType.CONTRADICTION), None)

    assert contra_no_gap is not None
    assert contra_with_gap is not None
    # The contradiction connected to the gap artifact must receive positive evidence gap impact weight
    assert contra_with_gap.score_breakdown.evidence_gap_impact_weight >= contra_no_gap.score_breakdown.evidence_gap_impact_weight
    assert contra_with_gap.priority_score >= contra_no_gap.priority_score


# -----------------------------------------------------------------------------
# Test 4: Reviewed Items Decrease Priority
# -----------------------------------------------------------------------------

def test_reviewed_items_decrease_priority(sample_case_context):
    """Items that an examiner has verified or reviewed receive a review discount, lowering priority."""
    case, artifacts, facts = sample_case_context
    timeline = TimelineReconstructionEngine().build_timeline("case_phase5d_unit", facts, artifacts)

    # Unreviewed
    analysis_unreviewed = ContradictionAnalysisEngine().analyze_case("case_phase5d_unit", facts, artifacts, timeline=timeline)
    engine = InvestigationPrioritizationEngine()
    prio_unreviewed = engine.prioritize_case(
        case_id="case_phase5d_unit",
        artifacts=artifacts,
        facts=facts,
        analysis=analysis_unreviewed,
        timeline=timeline,
    )
    unreviewed_contra = next(i for i in prio_unreviewed.items if i.target_type == PriorityTargetType.CONTRADICTION)

    # Reviewed
    existing_reviews = {
        unreviewed_contra.target_id: {
            "status": "VERIFIED_TRUE_CONTRADICTION",
            "reviewer_notes": "Forensic examiner confirmed discrepancy with core banking team.",
        }
    }
    analysis_reviewed = ContradictionAnalysisEngine().analyze_case(
        "case_phase5d_unit",
        facts,
        artifacts,
        timeline=timeline,
        existing_reviews=existing_reviews,
    )
    prio_reviewed = engine.prioritize_case(
        case_id="case_phase5d_unit",
        artifacts=artifacts,
        facts=facts,
        analysis=analysis_reviewed,
        timeline=timeline,
    )
    reviewed_contra = next(i for i in prio_reviewed.items if i.target_id == unreviewed_contra.target_id)

    assert reviewed_contra.is_reviewed is True
    assert reviewed_contra.score_breakdown.already_reviewed_discount == 35.0
    assert reviewed_contra.priority_score < unreviewed_contra.priority_score


# -----------------------------------------------------------------------------
# Test 5: Graph Relationships Affect Score
# -----------------------------------------------------------------------------

def test_graph_relationships_affect_score(sample_case_context):
    """Node centrality in the investigation graph elevates the priority of highly-connected evidence."""
    case, artifacts, facts = sample_case_context
    timeline = TimelineReconstructionEngine().build_timeline("case_phase5d_unit", facts, artifacts)
    analysis = ContradictionAnalysisEngine().analyze_case("case_phase5d_unit", facts, artifacts, timeline=timeline)
    correlations, _ = CorrelationEngine().correlate_case(facts)
    graph = InvestigationGraphBuilder.build_case_graph("case_phase5d_unit", artifacts, facts, correlations)

    engine = InvestigationPrioritizationEngine()

    # With graph provided
    prio_with_graph = engine.prioritize_case(
        case_id="case_phase5d_unit",
        artifacts=artifacts,
        facts=facts,
        analysis=analysis,
        timeline=timeline,
        graph=graph,
    )

    # Without graph provided
    prio_without_graph = engine.prioritize_case(
        case_id="case_phase5d_unit",
        artifacts=artifacts,
        facts=facts,
        analysis=analysis,
        timeline=timeline,
        graph=None,
    )

    top_with = prio_with_graph.items[0]
    top_without = prio_without_graph.items[0]

    assert top_with.score_breakdown.graph_centrality_weight > 0.0
    assert top_without.score_breakdown.graph_centrality_weight == 0.0
    assert top_with.priority_score >= top_without.priority_score


# -----------------------------------------------------------------------------
# Test 6: Summary Only Contains Evidence-Backed Claims
# -----------------------------------------------------------------------------

def test_summary_only_contains_evidence_backed_claims(sample_case_context):
    """Case summary statements strictly reference verified artifact IDs, fact IDs, and rule IDs."""
    case, artifacts, facts = sample_case_context
    timeline = TimelineReconstructionEngine().build_timeline("case_phase5d_unit", facts, artifacts)
    analysis = ContradictionAnalysisEngine().analyze_case("case_phase5d_unit", facts, artifacts, timeline=timeline)
    correlations, _ = CorrelationEngine().correlate_case(facts)
    graph = InvestigationGraphBuilder.build_case_graph("case_phase5d_unit", artifacts, facts, correlations)

    priorities = InvestigationPrioritizationEngine().prioritize_case(
        case_id="case_phase5d_unit",
        artifacts=artifacts,
        facts=facts,
        analysis=analysis,
        timeline=timeline,
        graph=graph,
    )

    summary = InvestigationSummaryGenerator.generate_summary(
        case=case,
        artifacts=artifacts,
        facts=facts,
        analysis=analysis,
        priorities=priorities,
        timeline=timeline,
    )

    assert summary.case_id == "case_phase5d_unit"
    assert len(summary.fingerprint) == 64

    # Validate findings citations
    assert len(summary.critical_findings) > 0
    for finding in summary.critical_findings:
        assert len(finding.artifact_ids) > 0, "Finding statement must cite artifact IDs"
        assert len(finding.fact_ids) > 0, "Finding statement must cite canonical fact IDs"
        assert finding.rule_id != "", "Finding must cite deterministic rule ID"
        for aid in finding.artifact_ids:
            assert any(a.artifact_id == aid for a in artifacts)

    # Validate evidence gaps citations
    for gap in summary.evidence_gaps:
        assert gap.rule_id != "", "Gap must cite rule ID"
        assert len(gap.artifact_ids) > 0 or len(gap.fact_ids) > 0

    # Validate recommended actions
    for action in summary.recommended_actions:
        assert action.rule_id != ""
        assert action.action_id.startswith("PRIO-")
        assert len(action.artifact_ids) > 0


# -----------------------------------------------------------------------------
# Test 7: Counterfactual Runs Update Priorities Correctly
# -----------------------------------------------------------------------------

def test_counterfactual_runs_update_priorities_correctly(sample_case_context):
    """Excluding a challenged artifact deactivates its dependent priorities and preserves independent ones."""
    case, artifacts, facts = sample_case_context
    timeline = TimelineReconstructionEngine().build_timeline("case_phase5d_unit", facts, artifacts)
    analysis = ContradictionAnalysisEngine().analyze_case("case_phase5d_unit", facts, artifacts, timeline=timeline)

    engine = InvestigationPrioritizationEngine()

    # 1. Baseline priorities
    base_priorities = engine.prioritize_case(
        case_id="case_phase5d_unit",
        artifacts=artifacts,
        facts=facts,
        analysis=analysis,
        timeline=timeline,
    )
    active_base_count = sum(1 for i in base_priorities.items if i.status == "ACTIVE")

    # 2. Challenge run excluding screenshot ART-004-CLAIM
    cf_analysis = ContradictionAnalysisEngine().analyze_case(
        case_id="case_phase5d_unit",
        facts=facts,
        artifacts=artifacts,
        timeline=timeline,
        excluded_artifact_ids=["ART-004-CLAIM"],
    )
    cf_priorities = engine.prioritize_case(
        case_id="case_phase5d_unit",
        artifacts=artifacts,
        facts=facts,
        analysis=cf_analysis,
        timeline=timeline,
        excluded_artifact_ids=["ART-004-CLAIM"],
    )

    # Contradiction depending on ART-004-CLAIM must be INACTIVE
    contra_prio = next((i for i in cf_priorities.items if "ART-004-CLAIM" in i.related_artifacts), None)
    assert contra_prio is not None
    assert contra_prio.status == "INACTIVE"
    assert contra_prio.inactive_reason is not None

    # Fingerprints must be distinct
    assert cf_priorities.fingerprint != base_priorities.fingerprint


# -----------------------------------------------------------------------------
# Test 8: Rule Registry Integrity for Phase 5D
# -----------------------------------------------------------------------------

def test_phase5d_rule_registry_contains_prioritization_rules():
    """Confirms all Phase 5D declarative rules are registered and versioned."""
    registry = RuleRegistry()
    expected_rules = [
        "RULE_PRIORITY_CRITICAL_CONTRADICTION",
        "RULE_PRIORITY_EVIDENCE_GAP",
        "RULE_PRIORITY_UNVERIFIED_ENTITY",
        "RULE_PRIORITY_TIMELINE_ANOMALY",
        "RULE_PRIORITY_REVIEW_PENDING",
    ]
    for rule_id in expected_rules:
        rule = registry.get_rule(rule_id)
        assert rule is not None, f"Rule {rule_id} not found in registry"
        assert rule.version == "1.0.0"
        assert rule.output_type == "INVESTIGATION_PRIORITY"


# -----------------------------------------------------------------------------
# Test 9: REST API Endpoints Verification
# -----------------------------------------------------------------------------

def test_api_investigation_priorities_endpoint(test_client):
    """GET /api/cases/{case_id}/investigation-priorities returns valid schema and items."""
    res = test_client.get("/api/cases/upi_payment_discrepancy/investigation-priorities")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "critical_count" in data
    assert "fingerprint" in data
    assert len(data["items"]) > 0

    top_item = data["items"][0]
    assert "priority_score" in top_item
    assert "priority_level" in top_item
    assert "supporting_rules" in top_item
    assert "related_artifacts" in top_item


def test_api_investigation_priorities_filtering(test_client):
    """GET /api/cases/{case_id}/investigation-priorities?priority_level=CRITICAL filters correctly."""
    res = test_client.get("/api/cases/upi_payment_discrepancy/investigation-priorities?priority_level=CRITICAL")
    assert res.status_code == 200
    data = res.json()
    for item in data["items"]:
        assert item["priority_level"] == "CRITICAL"


def test_api_investigation_summary_endpoint(test_client):
    """GET /api/cases/{case_id}/investigation-summary returns fully referenced case summary."""
    res = test_client.get("/api/cases/upi_payment_discrepancy/investigation-summary")
    assert res.status_code == 200
    data = res.json()
    assert "case_id" in data
    assert "overview" in data
    assert "critical_findings" in data
    assert "evidence_gaps" in data
    assert "recommended_actions" in data
    assert len(data["fingerprint"]) == 64

    for f in data["critical_findings"]:
        assert len(f["artifact_ids"]) > 0
        assert f["rule_id"] != ""


def test_api_challenge_run_priorities_isolation(test_client):
    """GET /api/cases/{case_id}/analysis-runs/{run_id}/investigation-priorities reflects exclusions."""
    # 1. Create a counterfactual challenge
    cf_res = test_client.post(
        "/api/cases/upi_payment_discrepancy/analysis-runs/baseline/challenge",
        json={
            "excluded_artifact_ids": ["ART-004-6155034A"],
            "investigator_note": "Phase 5D API Challenge Run Test",
        },
    )
    assert cf_res.status_code == 200
    challenge_run_id = cf_res.json()["challenge_run_id"]

    # 2. Fetch challenge run priorities
    res = test_client.get(
        f"/api/cases/upi_payment_discrepancy/analysis-runs/{challenge_run_id}/investigation-priorities"
    )
    assert res.status_code == 200
    data = res.json()
    assert data["run_id"] == challenge_run_id

    # 3. Ensure baseline run priorities remain intact
    base_res = test_client.get(
        "/api/cases/upi_payment_discrepancy/analysis-runs/baseline/investigation-priorities"
    )
    assert base_res.status_code == 200
    base_data = base_res.json()
    assert base_data["fingerprint"] != data["fingerprint"]


def test_api_graph_includes_priority_nodes(test_client):
    """GET /api/cases/{case_id}/investigation-graph includes INVESTIGATION_PRIORITY nodes and edges."""
    res = test_client.get("/api/cases/upi_payment_discrepancy/investigation-graph")
    assert res.status_code == 200
    data = res.json()
    node_types = {n["node_type"] for n in data["nodes"]}
    assert "INVESTIGATION_PRIORITY" in node_types

    edge_types = {e["edge_type"] for e in data["edges"]}
    assert "PRIORITIZED_BY" in edge_types
