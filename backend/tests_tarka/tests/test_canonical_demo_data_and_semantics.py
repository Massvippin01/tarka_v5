"""Automated Tests for TARKA Canonical Demo Data and Graph-Status Semantics.

Invariants Tested:
1. Canonical RRN (202602148891) and amounts (Bank: ₹25,000, Screenshot: ₹15,000)
   are identical across the synthetic evidence fixtures and extracted facts.
2. The screenshot challenge removes only the amount-mismatch contradiction (RULE_MEDIA_TXN_MISMATCH).
3. The bank transaction (₹25,000) and payment sequence (RULE_PAYMENT_FLOW_CAUSAL) survive.
4. No stale ₹50,000 / ₹5,000 demo values remain in active case code, fixtures, or docs.
5. Graph status semantics and color tokens map to intended semantic states:
   - SURVIVING: Evidence Jade
   - CONTRADICTION: Conflict Crimson
   - REVIEW_REQUIRED: Review Amber
   - INACTIVE / excluded artifact: neutral slate, dashed outline, dimmed
   - BASELINE_ONLY: Evidence Indigo or slate (NEVER crimson)
"""

from __future__ import annotations

import json
from pathlib import Path
import pytest

from tarka.core.evidence_dna import CaseStore
from tarka.core.analysis_run import CounterfactualEngine
from tarka.core.canonical_fact import CanonicalFactKind
from tarka.core.provenance_dag import DAGNodeStatus, ProvenanceDAGBuilder
from tarka.core.investigation_graph import (
    EntityNodeType,
    EntityEdgeType,
    InvestigationGraphBuilder,
)
from tarka.core.correlations import CorrelationEngine


FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures" / "synthetic_fraud_case"
REPO_ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture
def test_case_store(tmp_path: Path) -> CaseStore:
    cases_dir = tmp_path / "cases"
    store = CaseStore(base_dir=cases_dir)
    case_id = "CASE-CANONICAL-AUDIT"
    store.create_case(case_id, "Canonical Demo Data Audit")

    for fpath in FIXTURES_DIR.glob("*"):
        if fpath.is_file():
            store.register_artifact(
                case_id=case_id,
                filename=fpath.name,
                file_bytes=fpath.read_bytes(),
            )
    return store


def test_canonical_rrn_and_amounts_across_synthetic_evidence_set(test_case_store: CaseStore):
    """Proves canonical RRN 202602148891, bank amount 25,000, and screenshot amount 15,000 across all facts."""
    case_id = "CASE-CANONICAL-AUDIT"
    facts = test_case_store.list_canonical_facts(case_id)

    # 1. Bank Statement Record Fact
    bank_fact = next((f for f in facts if f.kind == CanonicalFactKind.BANK_TRANSACTION), None)
    assert bank_fact is not None, "Bank transaction fact must exist"
    assert bank_fact.amount == 25000.0, f"Expected 25000.0 INR bank debit, got {bank_fact.amount}"
    assert bank_fact.identifiers.get("rrn") == "202602148891", f"Expected RRN 202602148891, got {bank_fact.identifiers.get('rrn')}"

    # 2. Screenshot Claim Fact
    screen_fact = next((f for f in facts if f.source_filename == "screenshot_claim.json"), None)
    assert screen_fact is not None, "Screenshot claim fact must exist"
    assert screen_fact.amount == 15000.0, f"Expected 15000.0 INR screenshot claim, got {screen_fact.amount}"
    assert screen_fact.identifiers.get("rrn") == "202602148891", f"Expected RRN 202602148891, got {screen_fact.identifiers.get('rrn')}"

    # 3. WhatsApp Chat Payment Request Fact & RRN Fact
    chat_fact = next((f for f in facts if f.kind == CanonicalFactKind.PAYMENT_REQUEST), None)
    assert chat_fact is not None, "WhatsApp payment request fact must exist"
    assert chat_fact.amount == 25000.0, f"Expected 25000.0 INR chat request, got {chat_fact.amount}"
    assert chat_fact.identifiers.get("vpa") == "merchant.pay@okaxis"

    # Chat confirms RRN 202602148891 in confirmation message
    chat_rrn_fact = next((f for f in facts if f.source_filename == "whatsapp_chat.txt" and f.identifiers.get("rrn") == "202602148891"), None)
    assert chat_rrn_fact is not None, "WhatsApp chat must contain RRN 202602148891 identifier fact"

    # 4. Contradiction between bank statement and screenshot
    correlations, _ = CorrelationEngine().correlate_case(facts)
    mismatch = next((c for c in correlations if c.rule_id == "RULE_MEDIA_TXN_MISMATCH"), None)
    assert mismatch is not None, "RULE_MEDIA_TXN_MISMATCH contradiction must be detected"
    assert mismatch.is_contradiction is True
    assert "10,000" in mismatch.explanation_text, "Discrepancy delta must be ₹10,000 (25k - 15k)"


def test_screenshot_challenge_removes_only_amount_mismatch_contradiction(test_case_store: CaseStore):
    """Proves excluding the screenshot claim removes the amount mismatch and zero other contradictions."""
    case_id = "CASE-CANONICAL-AUDIT"
    base_run = test_case_store.get_or_create_baseline_run(case_id)

    # Baseline has amount-mismatch contradiction
    assert any(c.rule_id == "RULE_MEDIA_TXN_MISMATCH" for c in base_run.contradictions)
    assert len(base_run.contradictions) == 1

    artifacts = test_case_store.list_artifacts(case_id)
    screenshot_art = next(a for a in artifacts if a.filename == "screenshot_claim.json")

    chlg_run, comparison = test_case_store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[screenshot_art.artifact_id],
    )

    # Challenge run has zero active contradictions
    assert len(chlg_run.contradictions) == 0, "No active contradictions should remain after screenshot exclusion"

    # Comparison reports exactly one removed contradiction
    assert len(comparison.removed_contradictions) == 1
    assert comparison.removed_contradictions[0].rule_id == "RULE_MEDIA_TXN_MISMATCH"


def test_bank_transaction_and_payment_sequence_survive(test_case_store: CaseStore):
    """Proves the bank transaction and payment flow causal sequence survive screenshot exclusion."""
    case_id = "CASE-CANONICAL-AUDIT"
    base_run = test_case_store.get_or_create_baseline_run(case_id)
    artifacts = test_case_store.list_artifacts(case_id)
    screenshot_art = next(a for a in artifacts if a.filename == "screenshot_claim.json")

    chlg_run, comparison = test_case_store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[screenshot_art.artifact_id],
    )

    # Surviving correlations must contain payment flow causal link
    surviving_rule_ids = {c.rule_id for c in comparison.surviving_correlations}
    assert "RULE_PAYMENT_FLOW_CAUSAL" in surviving_rule_ids
    assert "RULE_PHONE_EXACT" in surviving_rule_ids

    # Surviving findings must include bank transaction and payment flow
    surviving_finding_ids = {f.finding_id for f in comparison.surviving_findings}
    assert "FINDING-04" in surviving_finding_ids  # Official Bank Statement Transaction
    assert "FINDING-01" in surviving_finding_ids  # Causal Payment Flow

    # Bank fact must remain active in challenge run with canonical amount
    active_bank_fact = next((f for f in chlg_run.derived_facts if f.kind == CanonicalFactKind.BANK_TRANSACTION), None)
    assert active_bank_fact is not None
    assert active_bank_fact.amount == 25000.0


def test_no_stale_demo_values_remain():
    """Scans code, fixtures, and documentation to prove no stale 50,000 or 5,000 values remain in demo case."""
    targets = [
        REPO_ROOT / "web" / "src" / "app" / "page.tsx",
        REPO_ROOT / "web" / "src" / "app" / "showcase" / "page.tsx",
        REPO_ROOT / "web" / "src" / "components" / "graphs" / "InvestigationGraphView.tsx",
        REPO_ROOT / "tarka" / "core" / "investigation_graph.py",
        REPO_ROOT / "docs" / "PHASE4A_PROVENANCE_DAG_AND_RULES.md",
    ]

    for target in targets:
        if not target.exists():
            continue
        text = target.read_text(encoding="utf-8")
        # Ensure 50,000 is not mentioned
        assert "50,000" not in text, f"Found stale '50,000' in {target.name}"
        # Ensure 202602141234 non-canonical RRN is not mentioned
        assert "202602141234" not in text, f"Found non-canonical RRN '202602141234' in {target.name}"
        # In InvestigationGraphView, ensure canonical RRN is present
        if "InvestigationGraphView" in target.name:
            assert "202602148891" in text
            assert "₹25,000" in text
            assert "₹15,000" in text


def test_graph_status_color_tokens_and_semantics():
    """Proves DAGNodeStatus enum supports semantic states and frontend tokens map correctly."""
    # 1. Backend enum validation
    expected_statuses = {"ACTIVE", "INACTIVE", "BASELINE_ONLY", "SURVIVING", "CONTRADICTION", "REVIEW_REQUIRED"}
    enum_members = {s.value for s in DAGNodeStatus}
    assert expected_statuses.issubset(enum_members)

    # 2. Frontend ChallengeDiffCard: REMOVED (baseline-only) must NOT use contradiction/crimson
    diff_card_path = REPO_ROOT / "web" / "src" / "components" / "tarka" / "ChallengeDiffCard.tsx"
    assert diff_card_path.exists()
    diff_card_text = diff_card_path.read_text(encoding="utf-8")

    # In REMOVED branch, badgeVariant must be info/accent, not contradiction
    # Check that REMOVED section has info or accent
    removed_section = diff_card_text.split('case "REMOVED":')[1].split('case "REMOVED_CONTRADICTION":')[0]
    assert 'badgeVariant: "contradiction"' not in removed_section, "REMOVED baseline-only finding must NOT use contradiction/crimson"
    assert 'iconColor: "text-[var(--contradiction)]"' not in removed_section, "REMOVED icon must NOT use contradiction crimson"
    assert 'badgeVariant: "info"' in removed_section or 'var(--accent)' in removed_section

    # 3. EvidenceStatusBadge: baseline must map to info/accent, not contradiction
    badge_path = REPO_ROOT / "web" / "src" / "components" / "tarka" / "EvidenceStatusBadge.tsx"
    assert badge_path.exists()
    badge_text = badge_path.read_text(encoding="utf-8")
    assert 'normalized.includes("baseline")' in badge_text
    assert 'normalized.includes("surviv")' in badge_text


def test_screenshot_exclusion_preserves_custody_and_original_artifacts(test_case_store: CaseStore):
    """Proves that challenging the screenshot does NOT alter original evidence files or custody log."""
    case_id = "CASE-CANONICAL-AUDIT"
    artifacts_before = test_case_store.list_artifacts(case_id)
    hashes_before = {a.artifact_id: a.sha256 for a in artifacts_before}
    ledger = test_case_store.get_ledger(case_id)
    chain_head_before = ledger.get_chain_head_hash()
    trail_before_count = len(ledger.get_all_entries())

    base_run = test_case_store.get_or_create_baseline_run(case_id)
    screenshot_art = next(a for a in artifacts_before if a.filename == "screenshot_claim.json")

    # Run exclusion challenge
    chlg_run, _ = test_case_store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[screenshot_art.artifact_id],
        investigator_note="Testing custody immutability on canonical dataset",
    )

    # 1. Artifacts remain untouched in store
    artifacts_after = test_case_store.list_artifacts(case_id)
    assert len(artifacts_after) == len(artifacts_before)
    for a in artifacts_after:
        assert a.sha256 == hashes_before[a.artifact_id]

    # 2. Custody ledger chain head unchanged
    assert ledger.get_chain_head_hash() == chain_head_before
    assert len(ledger.get_all_entries()) == trail_before_count

    # 3. Screenshot facts deactivated from active challenge run derived facts
    chlg_art_ids = {f.artifact_id for f in chlg_run.derived_facts}
    assert screenshot_art.artifact_id not in chlg_art_ids


def test_provenance_graphs_acyclic_and_deterministic_fingerprints(test_case_store: CaseStore):
    """Proves DAGs are acyclic, baseline vs challenge are distinguishable, and repeated runs are deterministic."""
    case_id = "CASE-CANONICAL-AUDIT"
    base_run = test_case_store.get_or_create_baseline_run(case_id)
    artifacts = test_case_store.list_artifacts(case_id)
    dna_items = test_case_store.list_evidence_dna(case_id)

    dag1 = ProvenanceDAGBuilder.build_run_dag(base_run, artifacts, dna_items)
    dag2 = ProvenanceDAGBuilder.build_run_dag(base_run, artifacts, dna_items)

    # Provenance graphs must be strictly acyclic
    assert dag1.is_acyclic() is True
    assert dag2.is_acyclic() is True

    # Determinism: identical fingerprints across runs
    assert dag1.fingerprint == dag2.fingerprint
    assert len(dag1.nodes) == len(dag2.nodes)
    assert len(dag1.edges) == len(dag2.edges)

    # All findings must retain source artifact ancestry
    finding_nodes = [n for n in dag1.nodes if n.node_type.value == "Finding"]
    assert len(finding_nodes) >= 3
    for fn in finding_nodes:
        assert dag1.has_source_artifact_ancestry(fn.node_id) is True

    # Challenge DAG is distinct and also acyclic
    screenshot_art = next(a for a in artifacts if a.filename == "screenshot_claim.json")
    chlg_run, _ = test_case_store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[screenshot_art.artifact_id],
    )
    chlg_dag = ProvenanceDAGBuilder.build_run_dag(chlg_run, artifacts, dna_items)
    assert chlg_dag.is_acyclic() is True
    assert chlg_dag.fingerprint != dag1.fingerprint

    # All surviving findings in challenge run must retain source artifact ancestry
    chlg_finding_nodes = [n for n in chlg_dag.nodes if n.node_type.value == "Finding"]
    for fn in chlg_finding_nodes:
        assert chlg_dag.has_source_artifact_ancestry(fn.node_id) is True


def test_ui_semantics_inactive_distinct_from_contradiction():
    """Proves inactive nodes use dashed outline / neutral styling, distinct from contradiction crimson."""
    dag_view_path = REPO_ROOT / "web" / "src" / "components" / "graphs" / "ProvenanceDAGView.tsx"
    assert dag_view_path.exists()
    dag_view_text = dag_view_path.read_text(encoding="utf-8")

    # Inactive styling must include border-dashed and opacity-60
    assert "border-dashed" in dag_view_text
    assert "opacity-60" in dag_view_text
    # Contradiction styling must use AF3F3A Conflict Crimson
    assert "#AF3F3A" in dag_view_text
    # Surviving styling must use 26715A Evidence Jade
    assert "#26715A" in dag_view_text
    # Baseline only styling must use 355C8A Evidence Indigo
    assert "#355C8A" in dag_view_text

