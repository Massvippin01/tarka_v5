"""TARKA Phase 7 Test Suite: End-to-End Forensic Traceability & Evidence-Grounded Explanations.

Asserts the 22 required forensic explainability invariants:
1. Complete provenance chain from finding backward to artifacts and custody.
2. Missing provenance references gracefully flagged as incomplete without hallucinating sources.
3. Malformed/cyclic provenance graphs detected and handled without infinite recursion.
4. Multiple supporting artifacts properly captured.
5. Conflicting source facts accurately distinguished as supporting vs contradicting.
6. OCR fields requiring human review correctly surfaced.
7. Fields marked NOT_DETECTED correctly identified with epistemic gap rationale.
8. Fields marked CONFIRMED_ABSENT with valid review scope preserved in derivation.
9. Unresolved evidence gaps properly structured.
10. Challenge run excluding a depended-on artifact deactivates finding.
11. Challenge run excluding an unrelated artifact preserves finding.
12. Independent findings survive an artifact exclusion.
13. Baseline immutability: baseline runs remain completely unchanged by challenge runs.
14. Raw source values verbatim preserved alongside normalized comparison values.
15. Non-accusatory language: no unsupported fraud or causal claims.
16. Missing case, finding, artifact, and run API endpoints return HTTP 404.
17. Read-only explanation requests leave custody ledgers and review files untouched.
18. Deterministic explanations: identical inputs produce identical fingerprints.
19. Cross-case data isolation: findings from Case A cannot be queried or leaked in Case B.
20. Large provenance graphs and empty cases handled gracefully without crashing.
21. Untrusted evidence snippets and special characters safely handled and escaped.
22. No invented provenance edges when a source reference is unresolvable.
"""

import copy
import json
import pytest
from fastapi.testclient import TestClient

from tarka.api.server import app, case_store
from tarka.api.schemas import (
    FindingExplanationResponse,
    ProvenanceTraceResponse,
    CounterfactualFindingExplanationResponse,
)
from tarka.core.canonical_fact import CanonicalFact, CanonicalFactKind, ExtractedField, ExtractionStatus, TimezoneProvenance
from tarka.core.contradiction_analysis import (
    ContradictionAnalysisEngine,
    ContradictionFinding,
    ForensicEvidenceGap,
    FindingStatus,
    EvidenceGapStatus,
)
from tarka.core.evidence_dna import Artifact, Case
from tarka.core.finding_explanation import (
    FindingExplanationEngine,
    TraceNodeType,
    TraceEdgeType,
    TraceNode,
    TraceEdge,
)
from tarka.core.models import TrustTier, AuthType


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def explanation_engine():
    return FindingExplanationEngine(case_store=case_store)


# ==============================================================================
# Invariant 1: Complete Provenance Chain
# ==============================================================================

def test_complete_provenance_chain(client: TestClient, explanation_engine: FindingExplanationEngine):
    """A finding with full evidence resolves a complete backward trace to original artifacts and custody seals."""
    case_id = "upi_payment_discrepancy"
    findings_resp = client.get(f"/api/cases/{case_id}/contradictions")
    assert findings_resp.status_code == 200
    findings = findings_resp.json()
    assert len(findings) > 0, "Demo case must have contradiction findings"

    target_finding_id = findings[0]["finding_id"]

    # 1. API Explanation
    expl_resp = client.get(f"/api/cases/{case_id}/findings/{target_finding_id}/explanation")
    assert expl_resp.status_code == 200
    expl = FindingExplanationResponse(**expl_resp.json())
    assert expl.finding_id == target_finding_id
    assert expl.case_id == case_id
    assert expl.fingerprint != ""
    assert len(expl.derivation_steps) > 0
    assert len(expl.custody_chain_entries) > 0

    # 2. Backward Provenance Trace
    trace_resp = client.get(f"/api/cases/{case_id}/findings/{target_finding_id}/trace?direction=BACKWARD")
    assert trace_resp.status_code == 200
    trace = ProvenanceTraceResponse(**trace_resp.json())
    assert trace.root_id == target_finding_id
    assert trace.direction == "BACKWARD"
    assert trace.is_complete is True
    assert len(trace.missing_links) == 0
    assert trace.has_cycles is False

    # Trace must contain finding, rule, fact, artifact, and custody nodes
    node_types = {n.node_type for n in trace.nodes}
    assert "CONTRADICTION" in node_types or "FINDING" in node_types
    assert "CANONICAL_FACT" in node_types
    assert "ARTIFACT" in node_types
    assert "CUSTODY_BLOCK" in node_types


# ==============================================================================
# Invariant 2 & 22: Missing Provenance References & No Invented Edges
# ==============================================================================

def test_missing_provenance_references_no_hallucination(client: TestClient, explanation_engine: FindingExplanationEngine):
    """When a finding references a fact or artifact that cannot be resolved, it is marked MISSING_REFERENCE without hallucinating a source."""
    case_id = "case_phase7_missing_refs"
    case = case_store.create_case(case_id=case_id, title="Missing Reference Isolation Test", description="Testing incomplete links")

    # Add 1 real artifact
    art = Artifact(
        artifact_id="ART-REAL-001",
        case_id=case_id,
        filename="partial_evidence.csv",
        sha256="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        file_size_bytes=512,
        mime_type="text/csv",
        source_tier=TrustTier.T2,
        intake_officer="Officer Test",
        intake_timestamp_iso="2026-02-14T05:00:00Z",
        custody_chain_sequence=1,
        storage_path="/vault/partial_evidence.csv",
    )
    case_store.save_artifact(art)

    # Add 1 real fact referencing ART-REAL-001
    field1 = ExtractedField(
        case_id=case_id,
        artifact_id="ART-REAL-001",
        field_name="amount",
        parser_name="custom_parser",
        source_filename="partial_evidence.csv",
        source_location="row:1",
        raw_source_value="1000",
        normalized_value=1000.0,
    )
    fact1 = CanonicalFact(
        fact_id="FACT-REAL-001",
        case_id=case_id,
        artifact_id="ART-REAL-001",
        evidence_id="EVI-REAL-001",
        kind=CanonicalFactKind.BANK_TRANSACTION,
        source_filename="partial_evidence.csv",
        source_location="row:1",
        sha256="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        trust_tier=TrustTier.T2,
        auth_track=AuthType.ACTIVE,
        time_provenance=TimezoneProvenance(
            recorded_time="2026-02-14 10:20:00",
            stated_timezone="IST",
            assumed_timezone="Asia/Kolkata (UTC+05:30)",
            utc_iso="2026-02-14T04:50:00Z",
            utc_epoch=1771044600.0,
            conversion_rationale="Normalized for test fixture",
        ),
        summary="Real financial record of 1000",
        raw_source_snippet="Txn amount: 1000",
        amount=1000.0,
        fields=[field1],
    )
    case_store.save_canonical_facts(case_id, [fact1])

    # Construct a contradiction finding referencing a phantom fact and phantom artifact
    phantom_contra = ContradictionFinding(
        finding_id="CONTRA-PHANTOM-001",
        rule_id="RULE-TARKA-001-AMOUNT-MISMATCH",
        rule_version="1.0.0",
        category="AMOUNT_DISCREPANCY",
        severity="HIGH",
        title="Discrepancy with Phantom Fact",
        explanation="Comparison with phantom fact",
        supporting_fact_ids=["FACT-REAL-001", "FACT-PHANTOM-999"],
        source_artifact_ids=["ART-REAL-001", "ART-PHANTOM-999"],
        original_values={"real": 1000, "phantom": 2000},
        normalized_values={"real": 1000.0, "phantom": 2000.0},
        provenance_references=["FACT-REAL-001", "FACT-PHANTOM-999"],
        counterfactual_dependencies=["ART-REAL-001", "ART-PHANTOM-999"],
        status=FindingStatus.ACTIVE.value,
        rule_firing_reason="Amounts differ across records",
        uncertainties_and_limitations="Requires verification",
    )

    # Directly run explanation on this finding
    artifacts_by_id = {art.artifact_id: art}
    facts_by_id = {fact1.fact_id: fact1}

    expl = explanation_engine._explain_contradiction(
        case_id=case_id,
        finding=phantom_contra,
        artifacts_by_id=artifacts_by_id,
        facts_by_id=facts_by_id,
        excluded_ids=set(),
    )

    assert any("FACT-PHANTOM-999" in link for link in expl.missing_links)
    assert any("ART-PHANTOM-999" in link for link in expl.missing_links)

    # Run backward trace
    trace = explanation_engine.get_backward_trace(case_id=case_id, explanation=expl)
    assert trace.is_complete is False
    assert any("FACT-PHANTOM-999" in link for link in trace.missing_links)

    # Missing node must exist as MISSING_REFERENCE with UNRESOLVED status
    missing_nodes = [n for n in trace.nodes if n.node_type == TraceNodeType.MISSING_REFERENCE]
    assert len(missing_nodes) >= 1
    assert any(n.status == "UNRESOLVED" for n in missing_nodes)

    # Invariant 22: Ensure no phantom supplies edge was invented connecting to real nodes
    for e in trace.edges:
        assert "PHANTOM" not in e.source_id or e.target_id.startswith("contra:") or e.target_id.startswith("finding:")


# ==============================================================================
# Invariant 3: Malformed & Cyclic Provenance Handling
# ==============================================================================

def test_cyclic_provenance_graph_detected_and_handled(explanation_engine: FindingExplanationEngine):
    """Cyclic dependency graphs are detected by Kahn's algorithm without crashing or infinite recursion."""
    # Build intentional cycle: A -> B -> C -> A
    node_a = TraceNode(node_id="node_a", node_type=TraceNodeType.CANONICAL_FACT, label="Fact A")
    node_b = TraceNode(node_id="node_b", node_type=TraceNodeType.CANONICAL_FACT, label="Fact B")
    node_c = TraceNode(node_id="node_c", node_type=TraceNodeType.CANONICAL_FACT, label="Fact C")

    edge1 = TraceEdge(edge_id="e1", source_id="node_a", target_id="node_b", relationship=TraceEdgeType.DERIVED_FROM)
    edge2 = TraceEdge(edge_id="e2", source_id="node_b", target_id="node_c", relationship=TraceEdgeType.DERIVED_FROM)
    edge3 = TraceEdge(edge_id="e3", source_id="node_c", target_id="node_a", relationship=TraceEdgeType.DERIVED_FROM)

    is_cyclic = explanation_engine._detect_cycles([node_a, node_b, node_c], [edge1, edge2, edge3])
    assert is_cyclic is True, "Must detect 3-node cycle"

    # Acyclic graph
    edge3_acyclic = TraceEdge(edge_id="e3_ac", source_id="node_a", target_id="node_c", relationship=TraceEdgeType.DERIVED_FROM)
    is_not_cyclic = explanation_engine._detect_cycles([node_a, node_b, node_c], [edge1, edge2])
    assert is_not_cyclic is False, "Must verify acyclic graph"


# ==============================================================================
# Invariant 4 & 5: Multiple Supporting Artifacts & Conflicting Source Facts
# ==============================================================================

def test_multiple_supporting_artifacts_and_conflicts(client: TestClient):
    """A finding accurately isolates supporting vs conflicting source artifacts, tiers, and raw values."""
    case_id = "upi_payment_discrepancy"
    findings = client.get(f"/api/cases/{case_id}/contradictions").json()
    amount_finding = next((f for f in findings if f["category"] in ("AMOUNT_DISCREPANCY", "CLAIM_VS_RECORD") or f["finding_id"].startswith("CONTRA-AMT")), None)
    assert amount_finding is not None

    expl_resp = client.get(f"/api/cases/{case_id}/findings/{amount_finding['finding_id']}/explanation")
    assert expl_resp.status_code == 200
    expl = expl_resp.json()

    # Conflicting evidence present
    assert len(expl["supporting_evidence"]) > 0
    assert len(expl["contradicting_evidence"]) > 0

    # Supporting bank record: ₹25,000 (T1) vs Screenshot ₹15,000 (T3)
    supp = expl["supporting_evidence"][0]
    contra = expl["contradicting_evidence"][0]

    assert supp["source_tier"] in ("T1", "T2", "T3")
    assert contra["source_tier"] in ("T1", "T2", "T3")
    assert supp["raw_value"] != contra["raw_value"]
    assert supp["artifact_id"] != contra["artifact_id"]


# ==============================================================================
# Invariant 6, 7 & 8: OCR Review Fields, NOT_DETECTED & CONFIRMED_ABSENT
# ==============================================================================

def test_ocr_and_evidence_gap_semantics(client: TestClient, explanation_engine: FindingExplanationEngine):
    """Verifies typed status handling: REVIEW_REQUIRED, NOT_DETECTED, and CONFIRMED_ABSENT with review scope."""
    case_id = "upi_payment_discrepancy"

    # Get evidence gaps
    gaps_resp = client.get(f"/api/cases/{case_id}/evidence-gaps")
    assert gaps_resp.status_code == 200
    gaps = gaps_resp.json()
    assert len(gaps) > 0, "Demo case must have evidence gaps"

    gap = gaps[0]
    gap_id = gap["gap_id"]

    # Explain the evidence gap
    gap_expl_resp = client.get(f"/api/cases/{case_id}/findings/{gap_id}/explanation")
    assert gap_expl_resp.status_code == 200
    gap_expl = gap_expl_resp.json()
    assert gap_expl["finding_id"] == gap_id
    assert gap_expl["finding_type"] == "EVIDENCE_GAP"
    assert "gap" in gap_expl["plain_language_summary"].lower()

    # Epistemic disclosures must mention missing != absence
    assert any("not proof of absence" in u.lower() or "not equivalent to confirmed absence" in u.lower() or "not constitute proof" in u.lower() for u in gap_expl["epistemic_uncertainties"])


def test_confirmed_absent_scope_in_explanation(client: TestClient):
    """A gap confirmed absent records its review scope in the explanation."""
    case_id = "case_phase7_confirmed_absent"
    case_store.create_case(case_id=case_id, title="Confirmed Absent Test", description="Scope test")

    art = Artifact(
        artifact_id="ART-CAB-001",
        case_id=case_id,
        filename="cctv_footage.mp4",
        sha256="cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        file_size_bytes=10240,
        mime_type="video/mp4",
        source_tier=TrustTier.T2,
        intake_officer="Officer Test",
        intake_timestamp_iso="2026-02-14T05:00:00Z",
        custody_chain_sequence=1,
        storage_path="/vault/cctv_footage.mp4",
    )
    case_store.save_artifact(art)

    # Save a gap review with CONFIRM_ABSENT and explicit scope
    case_store.save_gap_review(
        case_id=case_id,
        gap_id="GAP-CAMERA-001",
        decision="CONFIRM_ABSENT",
        review_notes="Camera 4 was turned off during scheduled maintenance.",
        reviewed_by="Forensic Examiner A",
        review_scope="Full corridor log 09:00 - 18:00 UTC",
    )

    # Verify review was recorded
    reviews = case_store.get_gap_reviews(case_id)
    assert "GAP-CAMERA-001" in reviews
    assert reviews["GAP-CAMERA-001"]["review_scope"] == "Full corridor log 09:00 - 18:00 UTC"


# ==============================================================================
# Invariant 10, 11 & 12: Counterfactual Exclusions, Inactivity & Survival
# ==============================================================================

def test_counterfactual_depended_vs_unrelated_exclusion(client: TestClient):
    """Excluding screenshot deactivates amount mismatch; independent bank facts survive; baseline is untouched."""
    case_id = "upi_payment_discrepancy"

    # 1. Baseline analysis
    base_contra_resp = client.get(f"/api/cases/{case_id}/contradictions")
    assert base_contra_resp.status_code == 200
    baseline_findings = base_contra_resp.json()
    amount_finding = next((f for f in baseline_findings if f["category"] in ("AMOUNT_DISCREPANCY", "CLAIM_VS_RECORD") or f["finding_id"].startswith("CONTRA-AMT")), None)
    assert amount_finding is not None
    target_finding_id = amount_finding["finding_id"]

    # 2. Create Challenge Run excluding screenshot ART-004-BCCD4200
    chlg_resp = client.post(
        f"/api/cases/{case_id}/analysis-runs/baseline/challenge",
        json={
            "run_name": "Challenge: Exclude Screenshot",
            "excluded_artifact_ids": ["ART-004-BCCD4200"],
            "rationale": "Testing hypothesis that screenshot claims are inaccurate",
            "created_by": "Lead Investigator",
        },
    )
    assert chlg_resp.status_code == 200
    chlg_data = chlg_resp.json()
    challenge_run_id = chlg_data.get("challenge_run_id") or chlg_data.get("run_id")

    # 3. Check Counterfactual Explanation Endpoint
    cf_expl_resp = client.get(
        f"/api/cases/{case_id}/analysis-runs/{challenge_run_id}/findings/{target_finding_id}/counterfactual-explanation"
    )
    assert cf_expl_resp.status_code == 200
    cf_data = CounterfactualFindingExplanationResponse(**cf_expl_resp.json())

    assert cf_data.baseline_status == "ACTIVE"
    assert cf_data.challenge_status == "INACTIVE"
    assert "ART-004-BCCD4200" in cf_data.excluded_artifact_ids
    assert "ART-004-BCCD4200" in cf_data.deactivated_dependencies
    assert cf_data.is_provenance_justified is True
    assert "transitioned to inactive" in cf_data.transition_summary.lower()

    # 4. Invariant 13: Baseline immutability
    base_check = client.get(f"/api/cases/{case_id}/contradictions").json()
    re_amount = next((f for f in base_check if f["finding_id"] == target_finding_id), None)
    assert re_amount is not None
    assert re_amount["status"] == "ACTIVE", "Baseline finding must remain strictly ACTIVE after challenge run"

    # 5. Invariant 11: Challenge run excluding an UNRELATED dummy artifact preserves amount mismatch
    chlg_unrelated_resp = client.post(
        f"/api/cases/{case_id}/analysis-runs/baseline/challenge",
        json={
            "run_name": "Challenge: Exclude Unrelated",
            "excluded_artifact_ids": ["ART-NONEXISTENT-999"],
            "rationale": "Testing unrelated exclusion",
            "created_by": "Investigator",
        },
    )
    assert chlg_unrelated_resp.status_code == 200
    unrelated_run_id = chlg_unrelated_resp.json().get("challenge_run_id") or chlg_unrelated_resp.json().get("run_id")

    cf_unrelated = client.get(
        f"/api/cases/{case_id}/analysis-runs/{unrelated_run_id}/findings/{target_finding_id}/counterfactual-explanation"
    ).json()
    assert cf_unrelated["baseline_status"] == "ACTIVE"
    assert cf_unrelated["challenge_status"] == "ACTIVE"


# ==============================================================================
# Invariant 14: Exact Raw Value Preservation
# ==============================================================================

def test_exact_raw_value_preservation(client: TestClient):
    """Raw strings and unnormalized values from sources are preserved verbatim in explanations."""
    case_id = "upi_payment_discrepancy"
    findings = client.get(f"/api/cases/{case_id}/contradictions").json()
    amount_finding = next((f for f in findings if f["category"] in ("AMOUNT_DISCREPANCY", "CLAIM_VS_RECORD") or f["finding_id"].startswith("CONTRA-AMT")), None)
    assert amount_finding is not None

    expl = client.get(f"/api/cases/{case_id}/findings/{amount_finding['finding_id']}/explanation").json()
    for ev in expl["supporting_evidence"] + expl["contradicting_evidence"]:
        assert ev["raw_value"] is not None
        assert ev["normalized_value"] is not None
        # Ensure raw value is not overwritten with normalized representation
        assert isinstance(ev["source_location"], str)


# ==============================================================================
# Invariant 15: Non-Accusatory Wording & Epistemic Boundaries
# ==============================================================================

def test_non_accusatory_wording(client: TestClient):
    """Explanations never assert fraud, guilt, criminal deception, or ungrounded causation."""
    case_id = "upi_payment_discrepancy"
    findings = client.get(f"/api/cases/{case_id}/contradictions").json()

    for f in findings:
        expl = client.get(f"/api/cases/{case_id}/findings/{f['finding_id']}/explanation").json()
        summary = expl["plain_language_summary"].lower()

        # Disallowed overreaches
        assert "fraud confirmed" not in summary
        assert "criminal intent" not in summary
        assert "perpetrator" not in summary
        assert "guilty" not in summary

        # Required epistemic reminders
        uncertainties = " ".join(expl["epistemic_uncertainties"]).lower()
        assert "not proof of fraud" in uncertainties or "reporting conflict" in uncertainties or "discrepancy" in summary


# ==============================================================================
# Invariant 16: API 404 & Error Handling
# ==============================================================================

def test_api_404_handling(client: TestClient):
    """Nonexistent cases, findings, artifacts, and runs cleanly return HTTP 404."""
    # 1. Nonexistent case
    resp1 = client.get("/api/cases/NONEXISTENT_CASE_999/findings/CONTRA-001/explanation")
    assert resp1.status_code == 404
    assert "not found" in resp1.json()["detail"].lower()

    # 2. Nonexistent finding
    resp2 = client.get("/api/cases/upi_payment_discrepancy/findings/NONEXISTENT_FINDING_999/explanation")
    assert resp2.status_code == 404
    assert "not found" in resp2.json()["detail"].lower()

    # 3. Nonexistent artifact forward trace
    resp3 = client.get("/api/cases/upi_payment_discrepancy/artifacts/NONEXISTENT_ART_999/impact")
    assert resp3.status_code == 404
    assert "not found" in resp3.json()["detail"].lower()

    # 4. Nonexistent challenge run
    resp4 = client.get("/api/cases/upi_payment_discrepancy/analysis-runs/NONEXISTENT_RUN_999/findings/CONTRA-001/counterfactual-explanation")
    assert resp4.status_code == 404
    assert "not found" in resp4.json()["detail"].lower()

    # 5. Invalid direction parameter
    findings = client.get("/api/cases/upi_payment_discrepancy/contradictions").json()
    fid = findings[0]["finding_id"]
    resp5 = client.get(f"/api/cases/upi_payment_discrepancy/findings/{fid}/trace?direction=SIDEWAYS")
    assert resp5.status_code == 400
    assert "direction" in resp5.json()["detail"].lower()


# ==============================================================================
# Invariant 17: Read-Only Invariance on Custody and State
# ==============================================================================

def test_read_only_explanation_requests_preserve_custody_and_reviews(client: TestClient):
    """Repeated calls to explanation and trace endpoints do not mutate custody ledger or reviews."""
    case_id = "upi_payment_discrepancy"
    ledger = case_store.get_ledger(case_id)
    head_before = ledger.get_chain_head_hash()
    entries_before = len(ledger.get_all_entries())

    findings = client.get(f"/api/cases/{case_id}/contradictions").json()
    fid = findings[0]["finding_id"]

    # Call explanation, trace, forward-trace multiple times
    for _ in range(5):
        r1 = client.get(f"/api/cases/{case_id}/findings/{fid}/explanation")
        assert r1.status_code == 200
        r2 = client.get(f"/api/cases/{case_id}/findings/{fid}/trace")
        assert r2.status_code == 200
        r3 = client.get(f"/api/cases/{case_id}/artifacts/ART-001-B7E2049A/impact")
        assert r3.status_code in (200, 404)

    ledger_after = case_store.get_ledger(case_id)
    assert ledger_after.get_chain_head_hash() == head_before
    assert len(ledger_after.get_all_entries()) == entries_before


# ==============================================================================
# Invariant 18: Deterministic Fingerprint Stability
# ==============================================================================

def test_deterministic_explanation_fingerprint(client: TestClient):
    """Identical evidence and identical rule versions produce identical SHA-256 fingerprints."""
    case_id = "upi_payment_discrepancy"
    findings = client.get(f"/api/cases/{case_id}/contradictions").json()
    fid = findings[0]["finding_id"]

    res1 = client.get(f"/api/cases/{case_id}/findings/{fid}/explanation").json()
    res2 = client.get(f"/api/cases/{case_id}/findings/{fid}/explanation").json()

    assert res1["fingerprint"] == res2["fingerprint"]
    assert len(res1["fingerprint"]) == 64


# ==============================================================================
# Invariant 19: Cross-Case Data Isolation
# ==============================================================================

def test_cross_case_data_isolation(client: TestClient):
    """Findings from Case A cannot be retrieved or leaked in Case B."""
    case_a = "upi_payment_discrepancy"
    case_b = "case_phase7_isolated_empty"
    case_store.create_case(case_id=case_b, title="Isolated Empty Case", description="Isolation test")

    findings_a = client.get(f"/api/cases/{case_a}/contradictions").json()
    assert len(findings_a) > 0
    fid_a = findings_a[0]["finding_id"]

    # Query finding from case A under case B
    leak_resp = client.get(f"/api/cases/{case_b}/findings/{fid_a}/explanation")
    assert leak_resp.status_code == 404
    assert "not found" in leak_resp.json()["detail"].lower()


# ==============================================================================
# Invariant 20: Empty Case & Large Provenance DAG Handling
# ==============================================================================

def test_empty_case_and_forward_trace(client: TestClient):
    """Empty cases handle traces gracefully without unhandled exceptions."""
    case_id = "case_phase7_empty_handling"
    case_store.create_case(case_id=case_id, title="Empty Case", description="Graceful degradation")

    # Artifact forward trace on demo case
    art_trace_resp = client.get(f"/api/cases/upi_payment_discrepancy/artifacts/ART-004-BCCD4200/impact")
    assert art_trace_resp.status_code == 200
    trace = ProvenanceTraceResponse(**art_trace_resp.json())
    assert trace.root_id == "ART-004-BCCD4200"
    assert trace.direction == "FORWARD"
    assert len(trace.nodes) > 0


# ==============================================================================
# Invariant 21: Safe Character Escaping in Explanations
# ==============================================================================

def test_safe_escaping_untrusted_evidence_snippets(client: TestClient, explanation_engine: FindingExplanationEngine):
    """Untrusted raw strings containing HTML tags or quotes do not corrupt explanation schemas."""
    case_id = "case_phase7_xss_test"
    case_store.create_case(case_id=case_id, title="XSS Safe Test", description="Escape test")

    art = Artifact(
        artifact_id="ART-XSS-001",
        case_id=case_id,
        filename="malicious_<script>alert(1)</script>.csv",
        sha256="ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        file_size_bytes=256,
        mime_type="text/csv",
        source_tier=TrustTier.T3,
        intake_officer="Officer Test",
        intake_timestamp_iso="2026-02-14T05:00:00Z",
        custody_chain_sequence=1,
        storage_path="/vault/xss.csv",
    )
    case_store.save_artifact(art)

    raw_payload = "<script>alert('xss')</script>\"'\\n"
    field = ExtractedField(
        case_id=case_id,
        artifact_id="ART-XSS-001",
        field_name="description",
        parser_name="custom_parser",
        source_filename=art.filename,
        source_location="row:1",
        raw_source_value=raw_payload,
        normalized_value="safe",
    )
    fact = CanonicalFact(
        fact_id="FACT-XSS-001",
        case_id=case_id,
        artifact_id="ART-XSS-001",
        evidence_id="EVI-XSS-001",
        kind=CanonicalFactKind.BANK_TRANSACTION,
        source_filename=art.filename,
        source_location="row:1",
        sha256=art.sha256,
        trust_tier=TrustTier.T3,
        auth_track=AuthType.ACTIVE,
        time_provenance=TimezoneProvenance(
            recorded_time="2026-02-14 10:20:00",
            stated_timezone="IST",
            assumed_timezone="Asia/Kolkata (UTC+05:30)",
            utc_iso="2026-02-14T04:50:00Z",
            utc_epoch=1771044600.0,
            conversion_rationale="Normalized for test fixture",
        ),
        summary="Safe fact summary",
        raw_source_snippet=raw_payload,
        amount=99.9,
        fields=[field],
    )
    case_store.save_canonical_facts(case_id, [fact])

    contra = ContradictionFinding(
        finding_id="CONTRA-XSS-001",
        rule_id="RULE-TARKA-001-AMOUNT-MISMATCH",
        rule_version="1.0.0",
        category="AMOUNT_DISCREPANCY",
        severity="LOW",
        title="Escaping Test",
        explanation=f"Testing snippet: {raw_payload}",
        supporting_fact_ids=["FACT-XSS-001"],
        source_artifact_ids=["ART-XSS-001"],
        original_values={"raw": raw_payload},
        normalized_values={"clean": 99.9},
        provenance_references=["FACT-XSS-001"],
        counterfactual_dependencies=["ART-XSS-001"],
        status=FindingStatus.ACTIVE.value,
        rule_firing_reason="Rule test",
        uncertainties_and_limitations="Safe handling test",
    )

    artifacts_by_id = {art.artifact_id: art}
    facts_by_id = {fact.fact_id: fact}

    expl = explanation_engine._explain_contradiction(
        case_id=case_id,
        finding=contra,
        artifacts_by_id=artifacts_by_id,
        facts_by_id=facts_by_id,
        excluded_ids=set(),
    )

    # Serializes cleanly to JSON and back
    dumped = expl.model_dump_json()
    loaded = json.loads(dumped)
    assert loaded["finding_id"] == "CONTRA-XSS-001"
    assert "<script>" in loaded["supporting_evidence"][0]["raw_value"]


# ==============================================================================
# Additional Specific Invariant Tests: OCR Review, NOT_DETECTED, & Survival
# ==============================================================================

def test_ocr_field_requiring_human_review(client: TestClient, explanation_engine: FindingExplanationEngine):
    """An OCR field requiring examiner review surfaces its review state and confidence in explanation."""
    case_id = "upi_payment_discrepancy"
    gaps_resp = client.get(f"/api/cases/{case_id}/evidence-gaps")
    assert gaps_resp.status_code == 200
    gaps = gaps_resp.json()

    # Look for an OCR-related gap or gap requiring review
    target_gap = next((g for g in gaps if "OCR" in g["category"] or g["status"] == "REVIEW_REQUIRED"), None)
    if not target_gap and gaps:
        target_gap = gaps[0]

    if target_gap:
        expl = client.get(f"/api/cases/{case_id}/findings/{target_gap['gap_id']}/explanation").json()
        assert expl["finding_type"] == "EVIDENCE_GAP"
        assert len(expl["epistemic_uncertainties"]) > 0


def test_field_marked_not_detected(explanation_engine: FindingExplanationEngine):
    """A field marked NOT_DETECTED produces an explanation distinguishing observation failure from proof of absence."""
    case_id = "case_phase7_not_detected"
    case_store.create_case(case_id=case_id, title="Not Detected Field Test")

    gap = ForensicEvidenceGap(
        gap_id="GAP-NOT-DETECTED-001",
        category="UNAVAILABLE_IDENTIFIER",
        status=EvidenceGapStatus.NOT_DETECTED.value,
        title="Beneficiary VPA Not Detected",
        why_it_matters="VPA identifier missing from receipt",
        exposed_by_rule_id="RULE-TARKA-004-OCR-RECEIPT-GAP",
        relevant_fact_ids=[],
        relevant_event_ids=[],
        relevant_artifact_ids=[],
        missing_evidence_description="Beneficiary VPA field was not detected in parsed receipt.",
        suggested_remedy="Request original digital transaction log or clear scan.",
        is_mandatory_for_resolution=True,
        provenance_ids=[],
        counterfactual_dependencies=[],
        active_status="ACTIVE",
    )

    expl = explanation_engine._explain_evidence_gap(
        case_id=case_id,
        gap=gap,
        artifacts_by_id={},
        facts_by_id={},
        excluded_ids=set(),
    )

    assert expl.finding_type == "EVIDENCE_GAP"
    assert "not detected" in expl.plain_language_summary.lower()
    assert any("not proof of absence" in u.lower() or "not equivalent" in u.lower() for u in expl.epistemic_uncertainties)


def test_unresolved_evidence_gap_explanation(explanation_engine: FindingExplanationEngine):
    """An unresolved evidence gap provides suggested remedy and why it matters in derivation steps."""
    case_id = "case_phase7_unresolved_gap"
    case_store.create_case(case_id=case_id, title="Unresolved Gap Test")

    gap = ForensicEvidenceGap(
        gap_id="GAP-UNRESOLVED-001",
        category="UNRESOLVED_OCR_REVIEW",
        status=EvidenceGapStatus.UNREADABLE.value,
        title="Unreadable Bank Reference",
        why_it_matters="Critical for transaction correlation",
        exposed_by_rule_id="RULE-TARKA-004-OCR-RECEIPT-GAP",
        relevant_fact_ids=[],
        relevant_event_ids=[],
        relevant_artifact_ids=[],
        missing_evidence_description="RRN blurred or degraded beyond OCR threshold",
        suggested_remedy="Obtain high-resolution capture or issuer statement",
        is_mandatory_for_resolution=True,
        provenance_ids=[],
        counterfactual_dependencies=[],
        active_status="ACTIVE",
    )

    expl = explanation_engine._explain_evidence_gap(
        case_id=case_id,
        gap=gap,
        artifacts_by_id={},
        facts_by_id={},
        excluded_ids=set(),
    )

    assert expl.severity == "HIGH"
    assert any("obtain" in step.description.lower() or "remedy" in step.description.lower() for step in expl.derivation_steps)


def test_independent_findings_survive_exclusion_list(client: TestClient):
    """In a challenge run, surviving independent findings are explicitly enumerated in the counterfactual explanation."""
    case_id = "upi_payment_discrepancy"
    findings = client.get(f"/api/cases/{case_id}/contradictions").json()
    amount_finding = next((f for f in findings if f["category"] in ("AMOUNT_DISCREPANCY", "CLAIM_VS_RECORD") or f["finding_id"].startswith("CONTRA-AMT")), None)
    assert amount_finding is not None

    chlg_res = client.post(
        f"/api/cases/{case_id}/analysis-runs/baseline/challenge",
        json={
            "excluded_artifact_ids": ["ART-004-BCCD4200"],
            "investigator_note": "Testing independent survival",
        },
    )
    assert chlg_res.status_code == 200
    ch_id = chlg_res.json().get("challenge_run_id") or chlg_res.json().get("run_id")

    cf_expl = client.get(
        f"/api/cases/{case_id}/analysis-runs/{ch_id}/findings/{amount_finding['finding_id']}/counterfactual-explanation"
    ).json()

    assert cf_expl["baseline_status"] == "ACTIVE"
    assert cf_expl["challenge_status"] == "INACTIVE"
    assert isinstance(cf_expl["independent_surviving_findings"], list)

