"""Automated Tests for TARKA Phase 3A: Evidence Arena and Counterfactual Forensics.

Forensic Safety & Specification Invariants Tested:
1. Baseline run determinism (identical fingerprints, identical assessments across runs).
2. Repeatable identical challenge results.
3. Original artifacts and custody records remain present and immutable after challenges.
4. Excluded artifact facts are absent only from the active challenge analysis.
5. Matching links and contradictions disappear only when their necessary evidence is excluded.
6. Independent bank-transaction findings survive screenshot exclusion.
7. Challenge-run comparison accurately reports surviving, removed, and weakened findings.
8. Hypothesis assessments use qualitative labels only and retain deterministic traceability.
9. No prohibited accusatory language is introduced.
10. End-to-end FastAPI endpoint workflow for analysis runs and challenge comparisons.
"""

from __future__ import annotations

import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from tarka.core.evidence_dna import CaseStore
from tarka.core.analysis_run import (
    QualitativeAssessmentLabel,
    HypothesisAssessment,
    AnalysisRun,
    RunComparison,
    CounterfactualEngine,
)
from tarka.api.server import app

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures" / "synthetic_fraud_case"

PROHIBITED_TERMS = [
    "guilt score",
    "fraud score",
    "probability of guilt",
    "verdict: true",
    "verdict: false",
    "prosecution view",
    "defense view",
    "accused view",
    "culprit",
    "perpetrator",
    "guilty party",
    "fraudster",
    "criminal-role",
]


@pytest.fixture
def populated_case(tmp_path: Path):
    """Initializes a case populated with all 5 synthetic evidence artifacts."""
    cases_dir = tmp_path / "cases"
    store = CaseStore(base_dir=cases_dir)
    case_id = "CASE-PHASE3A-TEST"
    store.create_case(case_id, "UPI Payment Discrepancy Test Case")

    # Ingest 5 artifacts
    artifacts = [
        "whatsapp_chat.txt",
        "bank_statement.csv",
        "cdr_records.csv",
        "screenshot_claim.json",
        "unverified_claim.json",
    ]
    for filename in artifacts:
        fpath = FIXTURES_DIR / filename
        data = fpath.read_bytes()
        store.register_artifact(
            case_id=case_id,
            filename=filename,
            file_bytes=data,
            intake_officer="Investigator Sharma",
        )

    return store, case_id


def test_baseline_run_determinism(populated_case):
    """Verifies that baseline analysis runs generate deterministic identical results and fingerprints."""
    store, case_id = populated_case

    run1 = store.get_or_create_baseline_run(case_id)
    assert run1.run_type == "BASELINE"
    assert len(run1.excluded_artifact_ids) == 0
    assert len(run1.analysis_fingerprint) == 64

    # Run engine again independently
    engine = CounterfactualEngine()
    all_facts = store.list_canonical_facts(case_id)
    artifacts = store.list_artifacts(case_id)
    hashes = {a.artifact_id: a.sha256 for a in artifacts}

    run2 = engine.execute_run(
        case_id=case_id,
        all_facts=all_facts,
        all_artifact_hashes=hashes,
        excluded_artifact_ids=[],
    )

    assert run1.analysis_fingerprint == run2.analysis_fingerprint
    assert len(run1.hypothesis_assessments) == len(run2.hypothesis_assessments)
    for h1, h2 in zip(run1.hypothesis_assessments, run2.hypothesis_assessments):
        assert h1.hypothesis_id == h2.hypothesis_id
        assert h1.assessment_label == h2.assessment_label


def test_repeatable_identical_challenge_results(populated_case):
    """Verifies that challenging the same artifact repeatedly yields identical results."""
    store, case_id = populated_case
    base_run = store.get_or_create_baseline_run(case_id)

    artifacts = store.list_artifacts(case_id)
    screenshot_art = next(a for a in artifacts if a.filename == "screenshot_claim.json")

    chlg1, comp1 = store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[screenshot_art.artifact_id],
        investigator_note="First challenge run",
    )

    chlg2, comp2 = store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[screenshot_art.artifact_id],
        investigator_note="Second challenge run",
    )

    assert chlg1.analysis_fingerprint == chlg2.analysis_fingerprint
    assert len(comp1.surviving_correlations) == len(comp2.surviving_correlations)
    assert len(comp1.removed_contradictions) == len(comp2.removed_contradictions)
    assert comp1.plain_language_summary == comp2.plain_language_summary


def test_original_artifacts_and_custody_remain_unchanged(populated_case):
    """Verifies that challenging evidence does not delete, mutate, or hide original artifacts or custody records."""
    store, case_id = populated_case
    artifacts_before = store.list_artifacts(case_id)
    hashes_before = {a.artifact_id: a.sha256 for a in artifacts_before}
    ledger = store.get_ledger(case_id)
    chain_head_before = ledger.get_chain_head_hash()
    trail_before = ledger.get_all_entries()

    base_run = store.get_or_create_baseline_run(case_id)
    screenshot_art = next(a for a in artifacts_before if a.filename == "screenshot_claim.json")

    # Run challenge
    store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[screenshot_art.artifact_id],
        investigator_note="Testing immutability",
    )

    # Verify artifacts
    artifacts_after = store.list_artifacts(case_id)
    assert len(artifacts_after) == len(artifacts_before)
    for a in artifacts_after:
        assert a.sha256 == hashes_before[a.artifact_id]

    # Verify custody ledger
    trail_after = ledger.get_all_entries()
    assert len(trail_after) == len(trail_before)
    assert ledger.get_chain_head_hash() == chain_head_before


def test_excluded_artifact_facts_absent_only_from_challenge_run(populated_case):
    """Verifies that derived facts from excluded artifact are absent only from active challenge run."""
    store, case_id = populated_case
    base_run = store.get_or_create_baseline_run(case_id)

    artifacts = store.list_artifacts(case_id)
    screenshot_art = next(a for a in artifacts if a.filename == "screenshot_claim.json")

    chlg_run, _ = store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[screenshot_art.artifact_id],
    )

    # Baseline has screenshot facts
    base_art_ids = {f.artifact_id for f in base_run.derived_facts}
    assert screenshot_art.artifact_id in base_art_ids

    # Challenge run excludes screenshot facts
    chlg_art_ids = {f.artifact_id for f in chlg_run.derived_facts}
    assert screenshot_art.artifact_id not in chlg_art_ids

    # All canonical facts in the store remain intact
    all_facts = store.list_canonical_facts(case_id)
    assert any(f.artifact_id == screenshot_art.artifact_id for f in all_facts)


def test_screenshot_exclusion_removes_amount_mismatch_and_survives_bank_statement(populated_case):
    """Verifies:
    1. Baseline contains RULE_MEDIA_TXN_MISMATCH contradiction.
    2. Excluding screenshot_claim.json removes the contradiction.
    3. Independent bank transaction (₹25,000 SBI debit) survives.
    4. Plain-language summary explains surviving banking evidence and remaining ambiguity.
    """
    store, case_id = populated_case
    base_run = store.get_or_create_baseline_run(case_id)

    # Verify baseline has contradiction
    assert any(c.rule_id == "RULE_MEDIA_TXN_MISMATCH" for c in base_run.contradictions)

    artifacts = store.list_artifacts(case_id)
    screenshot_art = next(a for a in artifacts if a.filename == "screenshot_claim.json")

    chlg_run, comp = store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[screenshot_art.artifact_id],
    )

    # Contradiction is removed in challenge run
    assert not any(c.rule_id == "RULE_MEDIA_TXN_MISMATCH" for c in chlg_run.contradictions)
    assert any(c.rule_id == "RULE_MEDIA_TXN_MISMATCH" for c in comp.removed_contradictions)

    # Surviving findings must include independent bank transaction
    surviving_titles = [f.title for f in comp.surviving_findings]
    assert any("Bank transaction" in title for title in surviving_titles)

    # Surviving correlations must include payment flow and phone match
    surviving_rules = {c.rule_id for c in comp.surviving_correlations}
    assert "RULE_PAYMENT_FLOW_CAUSAL" in surviving_rules
    assert "RULE_PHONE_EXACT" in surviving_rules

    # Plain-language summary mentions bank transaction survival
    summary = comp.plain_language_summary
    assert "amount-mismatch contradiction" in summary
    assert "The transaction remains recorded in the supplied bank-statement record." in summary
    expected_challenge_summary = (
        f"Excluding {screenshot_art.artifact_id} removes the amount-mismatch contradiction. "
        "The transaction remains recorded in the supplied bank-statement record. "
        "The remaining supplied evidence establishes a payment-related sequence. "
        "It does not sufficiently distinguish account takeover, credential sharing, or authorized-access misuse."
    )
    assert summary == expected_challenge_summary
    assert "discrepancy between the screenshot claim and the supplied bank-statement record" not in summary


def test_bank_statement_exclusion_removes_payment_flow_and_weakens_findings(populated_case):
    """Verifies that excluding the bank statement removes payment flow and introduces a new evidence gap."""
    store, case_id = populated_case
    base_run = store.get_or_create_baseline_run(case_id)

    artifacts = store.list_artifacts(case_id)
    bank_art = next(a for a in artifacts if a.filename == "bank_statement.csv")

    chlg_run, comp = store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[bank_art.artifact_id],
    )

    # Payment flow correlation disappears
    assert any(c.rule_id == "RULE_PAYMENT_FLOW_CAUSAL" for c in comp.removed_correlations)

    # Bank transaction finding is removed
    removed_titles = [f.title for f in comp.removed_findings]
    assert any("Bank transaction" in t for t in removed_titles)

    # New evidence gap is flagged for WhatsApp payment request lacking bank debit in the supplied bank-statement record
    assert len(comp.new_evidence_gaps) > 0


def test_hypothesis_assessments_and_traceability(populated_case):
    """Verifies that all hypothesis assessments use valid qualitative labels only and retain deterministic traceability."""
    store, case_id = populated_case
    base_run = store.get_or_create_baseline_run(case_id)

    valid_labels = {lbl.value for lbl in QualitativeAssessmentLabel}
    expected_hypotheses = {
        "H1": "Account takeover",
        "H2": "Credential sharing",
        "H3": "Authorized-access misuse",
        "H4": "Insufficient evidence to distinguish the explanations",
    }

    assessed_ids = {h.hypothesis_id: h for h in base_run.hypothesis_assessments}
    assert set(expected_hypotheses.keys()) == set(assessed_ids.keys())

    for hid, title_expected in expected_hypotheses.items():
        h = assessed_ids[hid]
        assert h.assessment_label.value in valid_labels
        assert h.title == title_expected
        assert len(h.assumptions) > 0
        assert len(h.distinguishing_evidence_needed) > 0
        assert len(h.rationale) > 0
        assert len(h.linked_correlation_rules) > 0


def test_non_accusatory_language_enforcement(populated_case):
    """Verifies that no prohibited accusatory terms exist in analysis runs or challenge comparisons."""
    store, case_id = populated_case
    base_run = store.get_or_create_baseline_run(case_id)

    artifacts = store.list_artifacts(case_id)
    screenshot_art = next(a for a in artifacts if a.filename == "screenshot_claim.json")
    _, comp = store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[screenshot_art.artifact_id],
    )

    # Dump JSON representations and scan
    base_json = base_run.model_dump_json().lower()
    comp_json = comp.model_dump_json().lower()

    for term in PROHIBITED_TERMS:
        assert term not in base_json, f"Prohibited accusatory term '{term}' found in baseline run!"
        assert term not in comp_json, f"Prohibited accusatory term '{term}' found in comparison!"


def test_fastapi_endpoints_phase3a(tmp_path: Path, monkeypatch):
    """Tests the full REST API lifecycle for analysis runs and counterfactual comparisons."""
    cases_dir = tmp_path / "api_cases"
    mock_store = CaseStore(base_dir=cases_dir)
    case_id = "CASE-API-TEST"
    mock_store.create_case(case_id, "API Test Case")

    # Ingest artifacts
    for fn in ["whatsapp_chat.txt", "bank_statement.csv", "screenshot_claim.json"]:
        fpath = FIXTURES_DIR / fn
        mock_store.register_artifact(case_id=case_id, filename=fn, file_bytes=fpath.read_bytes())

    # Patch case_store in server
    import tarka.api.server as srv
    monkeypatch.setattr(srv, "case_store", mock_store)

    client = TestClient(app)

    # 1. GET /api/cases/{case_id}/analysis-runs (auto-creates baseline)
    r = client.get(f"/api/cases/{case_id}/analysis-runs")
    assert r.status_code == 200
    runs = r.json()
    assert len(runs) >= 1
    base_run_id = runs[0]["run_id"]
    assert runs[0]["run_type"] == "BASELINE"

    # 2. GET /api/cases/{case_id}/analysis-runs/{run_id}
    r = client.get(f"/api/cases/{case_id}/analysis-runs/{base_run_id}")
    assert r.status_code == 200
    assert r.json()["run_id"] == base_run_id

    # 3. POST challenge run
    artifacts = mock_store.list_artifacts(case_id)
    scr_id = next(a.artifact_id for a in artifacts if a.filename == "screenshot_claim.json")

    r = client.post(
        f"/api/cases/{case_id}/analysis-runs/{base_run_id}/challenge",
        json={
            "excluded_artifact_ids": [scr_id],
            "investigator_note": "Challenging screenshot due to cropped borders",
        },
    )
    assert r.status_code == 200
    comparison = r.json()
    assert comparison["baseline_run_id"] == base_run_id
    chlg_run_id = comparison["challenge_run_id"]
    assert len(comparison["removed_contradictions"]) > 0
    assert "amount-mismatch contradiction" in comparison["plain_language_summary"]

    # 4. GET comparison endpoint
    r = client.get(f"/api/cases/{case_id}/analysis-runs/{base_run_id}/compare/{chlg_run_id}")
    assert r.status_code == 200
    assert r.json()["challenge_run_id"] == chlg_run_id


def test_no_court_authority_wording_remains(populated_case):
    """Verifies that no court-authority language ('judicial summary', 'judicial finding', 'court-ready', etc.) remains."""
    store, case_id = populated_case
    base_run = store.get_or_create_baseline_run(case_id)
    artifacts = store.list_artifacts(case_id)
    scr_art = next(a for a in artifacts if a.filename == "screenshot_claim.json")
    chlg_run, comp = store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[scr_art.artifact_id],
    )

    court_terms = [
        "judicial summary",
        "judicial finding",
        "judicial standing",
        "judicial record",
        "court-ready",
        "court-admissible",
        "court exhibit",
        "Section 63 BSA conservative standard",
    ]

    base_dump = base_run.model_dump_json().lower()
    chlg_dump = chlg_run.model_dump_json().lower()
    comp_dump = comp.model_dump_json().lower()

    for term in court_terms:
        term_lower = term.lower()
        assert term_lower not in base_dump, f"Court authority term '{term}' found in baseline run!"
        assert term_lower not in chlg_dump, f"Court authority term '{term}' found in challenge run!"
        assert term_lower not in comp_dump, f"Court authority term '{term}' found in comparison!"


def test_no_unsupported_core_banking_telemetry_wording(populated_case):
    """Verifies that 'core banking telemetry' is replaced by 'the supplied bank-statement record'."""
    store, case_id = populated_case
    base_run = store.get_or_create_baseline_run(case_id)
    artifacts = store.list_artifacts(case_id)
    scr_art = next(a for a in artifacts if a.filename == "screenshot_claim.json")
    chlg_run, comp = store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[scr_art.artifact_id],
    )

    base_dump = base_run.model_dump_json().lower()
    chlg_dump = chlg_run.model_dump_json().lower()
    comp_dump = comp.model_dump_json().lower()

    assert "core banking telemetry" not in base_dump
    assert "core banking telemetry" not in chlg_dump
    assert "core banking telemetry" not in comp_dump


def test_h4_is_primary_assessment_for_synthetic_case(populated_case):
    """Verifies that H4 ('Insufficient evidence to distinguish the explanations') is the primary current assessment ('More consistent with available evidence') while H1, H2, H3 are 'Partly consistent with available evidence'."""
    store, case_id = populated_case
    base_run = store.get_or_create_baseline_run(case_id)

    assessments = {h.hypothesis_id: h for h in base_run.hypothesis_assessments}

    # H1, H2, H3 are all partly consistent
    assert assessments["H1"].assessment_label == QualitativeAssessmentLabel.PARTLY_CONSISTENT
    assert assessments["H2"].assessment_label == QualitativeAssessmentLabel.PARTLY_CONSISTENT
    assert assessments["H3"].assessment_label == QualitativeAssessmentLabel.PARTLY_CONSISTENT

    # H4 is the primary assessment: More consistent with available evidence
    assert assessments["H4"].assessment_label == QualitativeAssessmentLabel.MORE_CONSISTENT

    # Verify H4 is the ONLY hypothesis rated 'More consistent with available evidence'
    more_consistent = [hid for hid, h in assessments.items() if h.assessment_label == QualitativeAssessmentLabel.MORE_CONSISTENT]
    assert more_consistent == ["H4"]


def test_changing_evidence_inputs_changes_hypothesis_assessments_deterministically(populated_case):
    """Verifies that excluding specific evidence inputs deterministically changes hypothesis assessments."""
    store, case_id = populated_case
    base_run = store.get_or_create_baseline_run(case_id)
    artifacts = store.list_artifacts(case_id)

    bank_art = next(a for a in artifacts if a.filename == "bank_statement.csv")
    scr_art = next(a for a in artifacts if a.filename == "screenshot_claim.json")
    chat_art = next(a for a in artifacts if a.filename == "whatsapp_chat.txt")
    cdr_art = next(a for a in artifacts if a.filename == "cdr_records.csv")

    # 1. Challenge excluding bank statement: H1, H2, H3 all contradict without bank debit
    chlg_no_bank, _ = store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[bank_art.artifact_id],
    )
    no_bank_map = {h.hypothesis_id: h.assessment_label for h in chlg_no_bank.hypothesis_assessments}
    assert no_bank_map["H1"] == QualitativeAssessmentLabel.CONTRADICTED
    assert no_bank_map["H2"] == QualitativeAssessmentLabel.CONTRADICTED
    assert no_bank_map["H3"] == QualitativeAssessmentLabel.CONTRADICTED

    # 2. Challenge excluding screenshot claim: removes amount mismatch, changing H3
    chlg_no_scr, _ = store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[scr_art.artifact_id],
    )
    no_scr_map = {h.hypothesis_id: h.assessment_label for h in chlg_no_scr.hypothesis_assessments}
    assert no_scr_map["H3"] == QualitativeAssessmentLabel.NOT_DISTINGUISHED

    # 3. Challenge excluding chat and CDR: H2 becomes INSUFFICIENT_EVIDENCE
    chlg_no_comms, _ = store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[chat_art.artifact_id, cdr_art.artifact_id],
    )
    no_comms_map = {h.hypothesis_id: h.assessment_label for h in chlg_no_comms.hypothesis_assessments}
    assert no_comms_map["H2"] == QualitativeAssessmentLabel.INSUFFICIENT_EVIDENCE


def test_every_displayed_assessment_has_linked_support_conflict_assumptions_and_gaps(populated_case):
    """Verifies that every displayed hypothesis assessment is fully grounded with linked support, assumptions, gaps, and rationale."""
    store, case_id = populated_case
    base_run = store.get_or_create_baseline_run(case_id)

    assert len(base_run.hypothesis_assessments) == 4
    for h in base_run.hypothesis_assessments:
        # Must have linked support or visible rationale
        assert len(h.supporting_evidence) > 0, f"{h.hypothesis_id} lacks supporting evidence!"
        # Must have explicit stated assumptions
        assert len(h.assumptions) > 0, f"{h.hypothesis_id} lacks stated assumptions!"
        # Must have documented evidence gaps
        assert len(h.evidence_gaps) > 0, f"{h.hypothesis_id} lacks evidence gaps!"
        # Must have distinguishing evidence needed
        assert len(h.distinguishing_evidence_needed) > 0, f"{h.hypothesis_id} lacks distinguishing evidence needed!"
        # Must have grounded rationale
        assert len(h.rationale) > 0, f"{h.hypothesis_id} lacks rationale!"
        # Must link to source artifacts, facts, and rules
        assert len(h.linked_artifacts) > 0, f"{h.hypothesis_id} lacks linked artifacts!"
        assert len(h.linked_facts) > 0, f"{h.hypothesis_id} lacks linked facts!"
        assert len(h.linked_correlation_rules) > 0, f"{h.hypothesis_id} lacks linked correlation rules!"


def test_baseline_and_challenge_exact_summaries(populated_case):
    """Verifies exact revised summary texts for baseline and screenshot challenge."""
    store, case_id = populated_case
    base_run = store.get_or_create_baseline_run(case_id)
    artifacts = store.list_artifacts(case_id)
    scr_art = next(a for a in artifacts if a.filename == "screenshot_claim.json")
    chlg_run, comp = store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[scr_art.artifact_id],
    )

    expected_baseline_summary = (
        "The supplied evidence establishes a payment-related sequence and a discrepancy between the screenshot claim and the supplied bank-statement record. It does not sufficiently distinguish account takeover, credential sharing, or authorized-access misuse."
    )
    expected_challenge_summary = (
        f"Excluding {scr_art.artifact_id} removes the amount-mismatch contradiction. The transaction remains recorded in the supplied bank-statement record. The remaining supplied evidence establishes a payment-related sequence. It does not sufficiently distinguish account takeover, credential sharing, or authorized-access misuse."
    )
    assert base_run.analysis_summary == expected_baseline_summary
    assert chlg_run.analysis_summary == expected_challenge_summary
    assert comp.plain_language_summary == expected_challenge_summary


def test_screenshot_exclusion_active_summary_has_no_active_discrepancy(populated_case):
    """Regression test: Screenshot-exclusion active summary contains no active discrepancy claim."""
    store, case_id = populated_case
    base_run = store.get_or_create_baseline_run(case_id)
    artifacts = store.list_artifacts(case_id)
    scr_art = next(a for a in artifacts if a.filename == "screenshot_claim.json")
    chlg_run, comp = store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[scr_art.artifact_id],
    )

    prohibited_active_phrase = "discrepancy between the screenshot claim and the supplied bank-statement record"
    assert prohibited_active_phrase not in chlg_run.analysis_summary
    assert prohibited_active_phrase not in comp.plain_language_summary


def test_screenshot_exclusion_active_assessments_contain_no_excluded_evidence(populated_case):
    """Regression test: Active assessments in screenshot challenge contain zero excluded screenshot evidence."""
    store, case_id = populated_case
    base_run = store.get_or_create_baseline_run(case_id)
    artifacts = store.list_artifacts(case_id)
    scr_art = next(a for a in artifacts if a.filename == "screenshot_claim.json")
    chlg_run, _ = store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[scr_art.artifact_id],
    )

    for h in chlg_run.hypothesis_assessments:
        # Excluded artifact must never appear in linked artifacts
        assert scr_art.artifact_id not in h.linked_artifacts
        # Excluded contradiction rule must never appear in linked correlation rules
        assert "RULE_MEDIA_TXN_MISMATCH" not in h.linked_correlation_rules

    # H3 specific checks: no screenshot claim mismatch in support or rationale
    h3 = next(h for h in chlg_run.hypothesis_assessments if h.hypothesis_id == "H3")
    assert not any("screenshot" in s.lower() for s in h3.supporting_evidence)
    assert not any("15,000" in s for s in h3.supporting_evidence)
    assert "screenshot" not in h3.rationale.lower()
    assert "receipt manipulation" not in h3.rationale.lower()

    # H1 specific checks: no screenshot claim in contradicting evidence
    h1 = next(h for h in chlg_run.hypothesis_assessments if h.hypothesis_id == "H1")
    assert not any("screenshot" in c.lower() for c in h1.contradicting_evidence)


def test_baseline_retains_screenshot_discrepancy(populated_case):
    """Regression test: Baseline run accurately retains the active screenshot discrepancy."""
    store, case_id = populated_case
    base_run = store.get_or_create_baseline_run(case_id)

    assert "discrepancy between the screenshot claim and the supplied bank-statement record" in base_run.analysis_summary
    assert any(c.rule_id == "RULE_MEDIA_TXN_MISMATCH" for c in base_run.contradictions)
    assert any(f.finding_id == "FINDING-02" for f in base_run.finding_summaries)


def test_comparison_output_lists_discrepancy_only_as_removed(populated_case):
    """Regression test: Comparison output mentions discrepancy strictly in removed findings/contradictions."""
    store, case_id = populated_case
    base_run = store.get_or_create_baseline_run(case_id)
    artifacts = store.list_artifacts(case_id)
    scr_art = next(a for a in artifacts if a.filename == "screenshot_claim.json")
    _, comp = store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[scr_art.artifact_id],
    )

    # Discrepancy is absent from surviving contradictions and findings
    assert not any(c.rule_id == "RULE_MEDIA_TXN_MISMATCH" for c in comp.surviving_contradictions)
    assert not any(f.finding_id == "FINDING-02" for f in comp.surviving_findings)

    # Discrepancy is present in removed contradictions and findings
    assert any(c.rule_id == "RULE_MEDIA_TXN_MISMATCH" for c in comp.removed_contradictions)
    assert any(f.finding_id == "FINDING-02" for f in comp.removed_findings)


def test_excluding_different_artifacts_produces_grounded_active_summaries(populated_case):
    """Regression test: Excluding different artifacts produces summaries grounded strictly in active evidence."""
    store, case_id = populated_case
    base_run = store.get_or_create_baseline_run(case_id)
    artifacts = store.list_artifacts(case_id)

    bank_art = next(a for a in artifacts if a.filename == "bank_statement.csv")
    chlg_bank, comp_bank = store.challenge_analysis_run(
        case_id=case_id,
        baseline_run_id=base_run.run_id,
        excluded_artifact_ids=[bank_art.artifact_id],
    )

    # Bank exclusion removes bank transaction and debit proof
    assert "bank transaction record is absent" in chlg_bank.analysis_summary.lower()
    assert "does not establish payment execution" in chlg_bank.analysis_summary.lower()
    assert "screenshot claim and the supplied bank-statement record" not in chlg_bank.analysis_summary
    assert "screenshot claim and the supplied bank-statement record" not in comp_bank.plain_language_summary


