"""Phase 5A Tests: Cross-Source Correlation Engine and Forensic Graph Integration.

Verifies:
1. Deterministic normalization (amounts, RRNs, VPAs, phones) without raw text loss.
2. Exact reference matching across sources (RULE_TXN_REF_EXACT).
3. Amount discrepancy detection under matching RRN (RULE_MEDIA_TXN_MISMATCH).
4. Conflicting currency handling.
5. Missing identifier handling (NOT_DETECTED).
6. Unreviewed / unreadable field resilience.
7. Duplicate RRN handling without arbitrary merging.
8. Provenance IDs and rule attribution on edges.
9. Counterfactual challenge run sensitivity (excluding screenshot deactivates mismatch finding while preserving bank facts).
10. Investigation Graph API endpoints with and without run_id.
"""

from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from tarka.api.server import app
from tarka.core.cross_source_correlation import (
    CrossSourceCorrelationEngine,
    normalize_amount,
    normalize_rrn,
    normalize_vpa,
    normalize_phone,
    CurrencyMismatchError,
)
from tarka.core.investigation_graph import (
    ForensicNodeType,
    ForensicEdgeType,
    ForensicNodeStatus,
    InvestigationGraphBuilder,
)
from tarka.core.canonical_fact import (
    CanonicalFact,
    CanonicalFactKind,
    TimezoneProvenance,
)
from tarka.core.evidence_dna import CaseStore, TrustTier, Artifact
from tarka.core.models import AuthType
from tarka.core.correlations import CorrelationEngine


@pytest.fixture
def test_client():
    return TestClient(app)


@pytest.fixture
def case_store():
    return CaseStore(base_dir="data/cases")


class TestNormalization:
    """Test deterministic normalization functions."""

    def test_amount_normalization_formats(self):
        """Amounts formatted as INR, rupees, with commas/spaces normalize to float without losing raw."""
        test_cases = [
            ("₹15,000.00", 15000.00),
            ("₹ 15000", 15000.00),
            ("Rs. 25,000", 25000.00),
            ("INR 25,000.50", 25000.50),
            ("25000", 25000.00),
            ("1,23,456.78", 123456.78),
        ]
        for raw, expected in test_cases:
            val, curr, raw_str = normalize_amount(raw)
            assert val is not None, f"Returned None for raw='{raw}'"
            assert round(val, 2) == round(expected, 2), f"Failed for raw='{raw}'"
            assert curr == "INR"
            assert raw_str == raw

    def test_amount_conflicting_currency(self):
        """Amounts with non-INR explicit currencies return their currency identifier."""
        dec_usd, curr_usd, _ = normalize_amount("$100.00")
        assert dec_usd == 100.00
        assert curr_usd == "USD"

        dec_inr, curr_inr, _ = normalize_amount("₹100.00")
        assert dec_inr == 100.00
        assert curr_inr == "INR"
        assert curr_usd != curr_inr

    def test_amount_invalid_unreadable(self):
        """Unreadable or blank amounts return None rather than raising or crashing."""
        assert normalize_amount("") == (None, None, "")
        assert normalize_amount(None) == (None, None, None)
        assert normalize_amount("ILLEGIBLE") == (None, None, "ILLEGIBLE")
        assert normalize_amount("NOT_DETECTED") == (None, None, "NOT_DETECTED")

    def test_rrn_normalization(self):
        """RRNs strip spaces, hyphens, and leading colons."""
        assert normalize_rrn("2026-0214-8891") == "202602148891"
        assert normalize_rrn("UPI Ref: 2026 0214 8891") == "202602148891"
        assert normalize_rrn("RRN: 202602148891") == "202602148891"
        assert normalize_rrn("not_detected") is None
        assert normalize_rrn("") is None
        assert normalize_rrn(None) is None

    def test_vpa_normalization(self):
        """VPAs normalize to lowercase without whitespace."""
        assert normalize_vpa(" Merchant.Pay@OKAxis ") == "merchant.pay@okaxis"
        assert normalize_vpa("USER@UPI") == "user@upi"
        assert normalize_vpa("not_detected") is None
        assert normalize_vpa("invalid-handle") is None  # missing @
        assert normalize_vpa(None) is None

    def test_phone_normalization(self):
        """Phone numbers normalize to canonical +91 format without separators."""
        assert normalize_phone("+91 98765-43210") == "+919876543210"
        assert normalize_phone("09876543210") == "+919876543210"
        assert normalize_phone("9876543210") == "+919876543210"
        assert normalize_phone("invalid") is None
        assert normalize_phone(None) is None


class TestCrossSourceCorrelationEngine:
    """Test deterministic correlation logic and graph generation."""

    def test_deterministic_rrn_match_and_amount_discrepancy(self, case_store: CaseStore):
        """Real case data with matching RRN produces RRN match and detects amount mismatch finding."""
        artifacts = case_store.list_artifacts("upi_payment_discrepancy")
        facts = case_store.list_canonical_facts("upi_payment_discrepancy")

        engine = CrossSourceCorrelationEngine()
        graph = engine.build_forensic_graph(
            case_id="upi_payment_discrepancy",
            artifacts=artifacts,
            facts=facts,
        )

        assert graph is not None
        assert len(graph.nodes) >= 20
        assert len(graph.edges) >= 20

        # Check for RRN match edge (RULE_TXN_REF_EXACT)
        match_edges = [e for e in graph.edges if e.rule_id == "RULE_TXN_REF_EXACT"]
        assert len(match_edges) >= 1
        assert match_edges[0].edge_type == ForensicEdgeType.MATCHES.value

        # Check for Amount Discrepancy finding & contradiction edge
        mismatch_nodes = [n for n in graph.nodes if n.node_id == "finding:amount_mismatch_discrepancy"]
        assert len(mismatch_nodes) == 1
        assert mismatch_nodes[0].status == ForensicNodeStatus.CONTRADICTION.value
        assert mismatch_nodes[0].rule_id == "RULE_MEDIA_TXN_MISMATCH"

        contradiction_edges = [e for e in graph.edges if e.is_contradiction]
        assert len(contradiction_edges) >= 1
        assert contradiction_edges[0].edge_type == ForensicEdgeType.CONTRADICTS.value

    def test_missing_identifier_resilience(self):
        """Facts with missing or unreadable identifiers do not crash or produce false positive matches."""
        time_prov = TimezoneProvenance(
            recorded_time="2026-02-14 10:00:00",
            stated_timezone="IST",
            assumed_timezone="Asia/Kolkata",
            conversion_rationale="IST assumed",
            utc_iso="2026-02-14T04:30:00Z",
            utc_epoch=1771043400.0,
        )
        facts = [
            CanonicalFact(
                fact_id="FACT-1",
                case_id="case_no_identifiers",
                artifact_id="ART-1",
                evidence_id="EVD-1",
                kind=CanonicalFactKind.PAYMENT_REQUEST,
                source_filename="receipt1.png",
                source_location="row:1",
                sha256="abc111",
                time_provenance=time_prov,
                trust_tier=TrustTier.T3,
                auth_track=AuthType.ACTIVE,
                amount=1000.00,
                currency="INR",
                identifiers={},
                summary="Payment request 1",
                raw_source_snippet="₹1,000",
            ),
            CanonicalFact(
                fact_id="FACT-2",
                case_id="case_no_identifiers",
                artifact_id="ART-2",
                evidence_id="EVD-2",
                kind=CanonicalFactKind.PAYMENT_REQUEST,
                source_filename="receipt2.png",
                source_location="row:1",
                sha256="abc222",
                time_provenance=time_prov,
                trust_tier=TrustTier.T3,
                auth_track=AuthType.ACTIVE,
                amount=1000.00,
                currency="INR",
                identifiers={},
                summary="Payment request 2",
                raw_source_snippet="₹1,000",
            ),
        ]
        engine = CrossSourceCorrelationEngine()
        graph = engine.build_forensic_graph("case_no_identifiers", [], facts)
        # No RRN matches should be created
        match_edges = [e for e in graph.edges if e.edge_type == ForensicEdgeType.MATCHES.value]
        assert len(match_edges) == 0

    def test_duplicate_rrn_without_arbitrary_merge(self):
        """Multiple distinct facts with the same RRN remain separate nodes rather than arbitrarily merging."""
        time_prov = TimezoneProvenance(
            recorded_time="2026-02-14 10:00:00",
            stated_timezone="IST",
            assumed_timezone="Asia/Kolkata",
            conversion_rationale="IST assumed",
            utc_iso="2026-02-14T04:30:00Z",
            utc_epoch=1771043400.0,
        )
        facts = [
            CanonicalFact(
                fact_id="FACT-A",
                case_id="case_dup_rrn",
                artifact_id="ART-A",
                evidence_id="EVD-A",
                kind=CanonicalFactKind.BANK_TRANSACTION,
                source_filename="a.csv",
                source_location="row:1",
                sha256="abcAAA",
                time_provenance=time_prov,
                trust_tier=TrustTier.T1,
                auth_track=AuthType.PASSIVE,
                amount=25000.00,
                currency="INR",
                identifiers={"rrn": "999888777"},
                summary="Bank debit",
                raw_source_snippet="25000 debit 999888777",
            ),
            CanonicalFact(
                fact_id="FACT-B",
                case_id="case_dup_rrn",
                artifact_id="ART-B",
                evidence_id="EVD-B",
                kind=CanonicalFactKind.PAYMENT_REQUEST,
                source_filename="b.png",
                source_location="row:1",
                sha256="abcBBB",
                time_provenance=time_prov,
                trust_tier=TrustTier.T3,
                auth_track=AuthType.ACTIVE,
                amount=15000.00,
                currency="INR",
                identifiers={"rrn": "999888777"},
                summary="Claim receipt",
                raw_source_snippet="15000 paid 999888777",
            ),
        ]
        engine = CrossSourceCorrelationEngine()
        graph = engine.build_forensic_graph("case_dup_rrn", [], facts)
        fact_node_ids = {n.node_id for n in graph.nodes}
        assert "fact:FACT-A" in fact_node_ids
        assert "fact:FACT-B" in fact_node_ids

    def test_provenance_and_rule_attribution_on_edges(self, case_store: CaseStore):
        """Edges carry rule_id and source provenance_ids."""
        artifacts = case_store.list_artifacts("upi_payment_discrepancy")
        facts = case_store.list_canonical_facts("upi_payment_discrepancy")

        graph_engine = CrossSourceCorrelationEngine()
        graph = graph_engine.build_forensic_graph(
            case_id="upi_payment_discrepancy",
            artifacts=artifacts,
            facts=facts,
        )

        for edge in graph.edges:
            assert edge.edge_type in [t.value for t in ForensicEdgeType]
            if edge.rule_id:
                assert edge.rule_id.startswith("RULE_")
            assert isinstance(edge.provenance_ids, list)


class TestCounterfactualChallengeRunGraph:
    """Test graph sensitivity to counterfactual exclusions."""

    def test_counterfactual_screenshot_exclusion(self, case_store: CaseStore):
        """Excluding screenshot ART-004-BCCD4200 deactivates amount mismatch finding while preserving bank facts."""
        artifacts = case_store.list_artifacts("upi_payment_discrepancy")
        facts = case_store.list_canonical_facts("upi_payment_discrepancy")
        baseline_run = case_store.get_or_create_baseline_run("upi_payment_discrepancy")

        graph_engine = CrossSourceCorrelationEngine()
        # Baseline graph
        baseline_graph = graph_engine.build_forensic_graph(
            case_id="upi_payment_discrepancy",
            artifacts=artifacts,
            facts=facts,
            run=baseline_run,
        )

        # Baseline: finding is CONTRADICTION / ACTIVE
        baseline_finding = next(n for n in baseline_graph.nodes if n.node_id == "finding:amount_mismatch_discrepancy")
        assert baseline_finding.status == ForensicNodeStatus.CONTRADICTION.value

        # Counterfactual run excluding screenshot
        challenge_run, _ = case_store.challenge_analysis_run(
            case_id="upi_payment_discrepancy",
            baseline_run_id=baseline_run.run_id,
            excluded_artifact_ids=["ART-004-6155034A"],
            investigator_note="Exclude suspicious screenshot",
        )

        cf_graph = graph_engine.build_forensic_graph(
            case_id="upi_payment_discrepancy",
            artifacts=artifacts,
            facts=facts,
            run=challenge_run,
        )

        # Under challenge run: finding is INACTIVE with inactive_reason
        cf_finding = next(n for n in cf_graph.nodes if n.node_id == "finding:amount_mismatch_discrepancy")
        assert cf_finding.status == ForensicNodeStatus.INACTIVE.value
        assert cf_finding.inactive_reason is not None
        assert "ART-004-6155034A" in cf_finding.inactive_reason

        # Screenshot fact is INACTIVE
        screenshot_facts = [
            n for n in cf_graph.nodes
            if n.node_type in [ForensicNodeType.FACT.value, ForensicNodeType.SOURCE_RECORD.value]
            and (n.source_artifact_ids or []) == ["ART-004-6155034A"]
        ]
        assert len(screenshot_facts) > 0
        for sf in screenshot_facts:
            assert sf.status == ForensicNodeStatus.INACTIVE.value
            assert "ART-004-6155034A" in (sf.inactive_reason or "")

        # Bank transaction fact and node remain ACTIVE / SURVIVING
        bank_facts = [
            n for n in cf_graph.nodes
            if n.node_type in [ForensicNodeType.FACT.value, ForensicNodeType.TRANSACTION.value]
            and "ART-001-F06C36EE" in (n.source_artifact_ids or [])
        ]
        assert len(bank_facts) > 0
        for bf in bank_facts:
            assert bf.status == ForensicNodeStatus.ACTIVE.value

        # Shared RRN identifier survives because bank statement independently cites it
        rrn_node = next(n for n in cf_graph.nodes if n.node_id == "id:rrn:202602148891")
        assert rrn_node.status == ForensicNodeStatus.ACTIVE.value


class TestInvestigationGraphEndpoints:
    """Test REST API endpoints for investigation graph."""

    def test_get_baseline_investigation_graph(self, test_client):
        """GET /api/cases/{case_id}/investigation-graph returns complete forensic graph."""
        res = test_client.get("/api/cases/upi_payment_discrepancy/investigation-graph")
        assert res.status_code == 200
        data = res.json()

        assert "case_id" in data
        assert data["case_id"] == "upi_payment_discrepancy"
        assert "nodes" in data
        assert "edges" in data
        assert "fingerprint" in data
        assert len(data["nodes"]) >= 20
        assert len(data["edges"]) >= 20

        # Check required node types are present
        types = {n["node_type"] for n in data["nodes"]}
        assert "EVIDENCE_ARTIFACT" in types
        assert "FACT" in types
        assert "TRANSACTION" in types
        assert "IDENTIFIER" in types
        assert "FINDING" in types

        # Check forensic properties on nodes
        sample_node = data["nodes"][0]
        assert "status" in sample_node
        assert "node_type" in sample_node
        assert "label" in sample_node

    def test_get_investigation_graph_with_run_id(self, test_client):
        """GET /api/cases/{case_id}/investigation-graph?run_id=... returns challenge-aware graph."""
        # 1. Run a counterfactual challenge first
        cf_res = test_client.post(
            "/api/cases/upi_payment_discrepancy/analysis-runs/baseline/challenge",
            json={
                "excluded_artifact_ids": ["ART-004-6155034A"],
                "investigator_note": "Test run exclusion",
            },
        )
        assert cf_res.status_code == 200
        cf_data = cf_res.json()
        challenge_run_id = cf_data["challenge_run_id"]

        # 2. Fetch graph with run_id query param
        graph_res = test_client.get(
            f"/api/cases/upi_payment_discrepancy/investigation-graph?run_id={challenge_run_id}"
        )
        assert graph_res.status_code == 200
        graph_data = graph_res.json()

        # Check that inactive nodes exist for excluded artifact
        inactive_nodes = [n for n in graph_data["nodes"] if n["status"] == "INACTIVE"]
        assert len(inactive_nodes) > 0
        assert any("ART-004-6155034A" in (n.get("inactive_reason") or "") for n in inactive_nodes)

        # 3. Fetch graph via direct run path /analysis-runs/{run_id}/investigation-graph
        direct_res = test_client.get(
            f"/api/cases/upi_payment_discrepancy/analysis-runs/{challenge_run_id}/investigation-graph"
        )
        assert direct_res.status_code == 200
        direct_data = direct_res.json()
        assert len(direct_data["nodes"]) == len(graph_data["nodes"])
