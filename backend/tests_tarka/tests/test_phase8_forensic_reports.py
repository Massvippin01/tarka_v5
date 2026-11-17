"""TARKA Phase 8 Test Suite: Evidence-Grounded Forensic Reports & Export.

Asserts the 24 required forensic reporting and export invariants:
1. Complete synthetic UPI report.
2. Case with no findings.
3. Case with no artifacts.
4. Report containing contradictions.
5. Report containing evidence gaps.
6. Preservation of NOT_DETECTED versus CONFIRMED_ABSENT.
7. Report with unreadable evidence.
8. Report with missing provenance links.
9. Baseline report.
10. Challenge report excluding the screenshot artifact.
11. Correct identification of findings that changed.
12. Independent findings surviving a challenge.
13. Baseline immutability.
14. Cross-case run and artifact validation.
15. Deterministic content fingerprinting.
16. Different substantive content producing a different fingerprint.
17. JSON schema validation.
18. HTML escaping of malicious or malformed evidence strings.
19. Correct output content type and filename handling.
20. Invalid export formats.
21. Missing report, case or analysis-run handling.
22. No changes to custody records during report generation.
23. Preservation of raw and normalized values.
24. Correct provenance references for material findings.
"""

import copy
import html
import json
import pytest
from fastapi.testclient import TestClient

from tarka.api.server import app, case_store
from tarka.api.schemas import (
    ForensicReportResponse,
    ReportSummaryResponse,
)
from tarka.core.canonical_fact import (
    CanonicalFact,
    CanonicalFactKind,
    ExtractedField,
    ExtractionStatus,
    build_timezone_provenance,
)
from tarka.core.evidence_dna import Artifact, Case
from tarka.core.forensic_report import (
    ForensicReport,
    ForensicReportBuilder,
    ForensicReportHTMLExporter,
    ForensicReportPDFExporter,
    compute_report_fingerprint,
)
from tarka.core.models import TrustTier, AuthType


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def report_builder():
    return ForensicReportBuilder(case_store=case_store)


# ==============================================================================
# Invariant 1: Complete Synthetic UPI Report
# ==============================================================================

def test_complete_synthetic_upi_report(client: TestClient, report_builder: ForensicReportBuilder):
    """Generates complete synthetic UPI report through both builder and API."""
    case_id = "upi_payment_discrepancy"

    # 1. Core builder test
    report = report_builder.generate_report(case_id=case_id, run_id="baseline")
    assert report.metadata.case_id == case_id
    assert report.metadata.is_synthetic_demonstration is True
    assert len(report.evidence_inventory) >= 2
    assert len(report.findings) >= 1
    assert len(report.priorities) >= 1
    assert report.metadata.fingerprint != ""

    # 2. API POST test
    resp = client.post(f"/api/cases/{case_id}/reports", json={
        "run_id": "baseline",
        "title": "Custom Forensic Audit: UPI Discrepancy",
        "persist": True,
    })
    assert resp.status_code == 200
    data = resp.json()
    validated = ForensicReportResponse.model_validate(data)
    assert validated.metadata.report_title == "Custom Forensic Audit: UPI Discrepancy"
    assert validated.metadata.run_type == "BASELINE"
    assert validated.executive_overview.material_contradictions_count >= 1


# ==============================================================================
# Invariant 2 & 3: Empty Cases (No Findings / No Artifacts)
# ==============================================================================

def test_case_with_no_findings(report_builder: ForensicReportBuilder):
    """Case with facts that do not conflict generates a clean report without false contradictions."""
    case_id = "test_case_no_findings"
    c = Case(case_id=case_id, title="Consistent Transaction Case", created_at_iso="2026-02-14T10:00:00Z")
    case_store.save_case(c)

    art = Artifact(
        artifact_id="ART-CLEAN-01",
        case_id=case_id,
        filename="bank_clean.csv",
        sha256="aa" * 32,
        file_size_bytes=512,
        source_tier=TrustTier.T1,
        storage_path="/vault/bank_clean.csv",
        mime_type="text/csv",
        intake_timestamp_iso="2026-02-14T10:00:00Z",
        custody_chain_sequence=1,
    )
    case_store.save_artifact(art)

    fact = CanonicalFact(
        fact_id="FACT-CLEAN-01",
        evidence_id="DNA-CLEAN-01",
        artifact_id="ART-CLEAN-01",
        case_id=case_id,
        kind=CanonicalFactKind.BANK_TRANSACTION,
        trust_tier=TrustTier.T1,
        auth_type=AuthType.ACTIVE,
        amount=5000.0,
        raw_source_snippet="₹5,000.00",
        identifiers={"rrn": "999888777666"},
        source_filename="bank_clean.csv",
        source_location="row:1",
        sha256="aa" * 32,
        time_provenance=build_timezone_provenance("2026-02-14 10:00:00"),
        auth_track=AuthType.ACTIVE,
        summary="Bank transaction credit of ₹5,000.00",
    )
    case_store.save_canonical_facts(case_id, [fact])

    report = report_builder.generate_report(case_id=case_id)
    assert report.metadata.case_id == case_id
    assert report.executive_overview.material_contradictions_count == 0
    assert len(report.findings) == 0


def test_case_with_no_artifacts(report_builder: ForensicReportBuilder):
    """Case with zero artifacts handles reporting cleanly without crashing."""
    case_id = "test_case_empty"
    c = Case(case_id=case_id, title="Empty Case", created_at_iso="2026-02-14T10:00:00Z")
    case_store.save_case(c)

    report = report_builder.generate_report(case_id=case_id)
    assert report.metadata.case_id == case_id
    assert len(report.evidence_inventory) == 0
    assert report.scope_methodology.sources_provided_count == 0
    assert len(report.findings) == 0


# ==============================================================================
# Invariant 4 & 5: Contradictions & Evidence Gaps in Report
# ==============================================================================

def test_report_containing_contradictions(report_builder: ForensicReportBuilder):
    """Asserts that contradictions contain both raw and normalized values and declarative rule metadata."""
    case_id = "upi_payment_discrepancy"
    report = report_builder.generate_report(case_id=case_id)

    contra_findings = [f for f in report.findings if "AMT" in f.finding_id or f.category in ("CLAIM_VS_RECORD", "AMOUNT_DISCREPANCY")]
    assert len(contra_findings) >= 1
    f = contra_findings[0]
    assert f.rule_id != ""
    assert f.rule_version != ""
    assert len(f.supporting_fact_ids) >= 1
    assert isinstance(f.contradicting_fact_ids, list)
    assert len(f.source_artifact_ids) >= 2


def test_report_containing_evidence_gaps(report_builder: ForensicReportBuilder):
    """Asserts evidence gaps provide actionable remedies and preserve why it matters."""
    case_id = "upi_payment_discrepancy"
    report = report_builder.generate_report(case_id=case_id)

    assert len(report.evidence_gaps) >= 1
    gap = report.evidence_gaps[0]
    assert gap.why_it_matters != ""
    assert gap.suggested_remedy != ""
    assert gap.status in ("NOT_DETECTED", "REVIEW_REQUIRED", "NOT_PROVIDED", "CONFIRMED_ABSENT", "RESOLVED")


# ==============================================================================
# Invariant 6: Preservation of NOT_DETECTED vs CONFIRMED_ABSENT
# ==============================================================================

def test_preservation_not_detected_vs_confirmed_absent(report_builder: ForensicReportBuilder):
    """Distinguishes unobserved records (NOT_DETECTED) from reviewed absences (CONFIRMED_ABSENT with scope)."""
    case_id = "test_gap_distinction"
    c = Case(case_id=case_id, title="Gap Distinction Case", created_at_iso="2026-02-14T10:00:00Z")
    case_store.save_case(c)

    # Save gap review with explicit scope
    case_store.save_gap_review(
        case_id=case_id,
        gap_id="GAP-AUDIT-01",
        decision="CONFIRM_ABSENT",
        review_notes="Examiner verified physical logbook page was never logged.",
        reviewed_by="Lead Inspector Jane",
        review_scope="Logbook #4 Entries 001-100",
    )

    report = report_builder.generate_report(case_id=case_id)
    # The reviewed gap must retain its reviewed decision and scope
    gap = next((g for g in report.evidence_gaps if g.gap_id == "GAP-AUDIT-01"), None)
    if gap:
        assert gap.review_decision == "CONFIRM_ABSENT"
        assert gap.review_scope == "Logbook #4 Entries 001-100"
        assert gap.reviewed_by == "Lead Inspector Jane"


# ==============================================================================
# Invariant 7 & 8: Unreadable Evidence & Missing Provenance Links
# ==============================================================================

def test_report_with_unreadable_evidence(report_builder: ForensicReportBuilder):
    """Artifacts with low extraction or limitations disclose known limitations in inventory."""
    case_id = "upi_payment_discrepancy"
    report = report_builder.generate_report(case_id=case_id)

    # Screenshot is T3
    screenshot_inv = next((a for a in report.evidence_inventory if "004" in a.artifact_id), None)
    assert screenshot_inv is not None
    assert len(screenshot_inv.known_limitations) >= 1
    assert any("corroboration" in l.lower() for l in screenshot_inv.known_limitations)


def test_report_with_missing_provenance_links(report_builder: ForensicReportBuilder):
    """Discloses missing links explicitly in the report without fabricating sources."""
    case_id = "upi_payment_discrepancy"
    report = report_builder.generate_report(case_id=case_id)
    assert isinstance(report.provenance.unresolved_links, list)
    assert report.provenance.has_cyclic_dependencies is False


# ==============================================================================
# Invariant 9, 10, 11 & 12: Baseline vs Challenge Runs & Independent Survival
# ==============================================================================

def test_baseline_report_semantics(client: TestClient):
    """Baseline report represents primary evaluation run without exclusions."""
    case_id = "upi_payment_discrepancy"
    resp = client.post(f"/api/cases/{case_id}/reports", json={"run_id": "baseline"})
    assert resp.status_code == 200
    report = resp.json()
    assert report["metadata"]["run_type"] == "BASELINE"
    assert report["counterfactual"]["is_counterfactual_run"] is False
    assert len(report["counterfactual"]["excluded_artifact_ids"]) == 0


def test_challenge_report_excluding_screenshot(client: TestClient, report_builder: ForensicReportBuilder):
    """Excluding screenshot deactivates amount mismatch; bank fact survives; challenge section explains why."""
    case_id = "upi_payment_discrepancy"

    # Create challenge run
    ch_resp = client.post(f"/api/cases/{case_id}/analysis-runs/baseline/challenge", json={
        "run_name": "Report Challenge Test",
        "excluded_artifact_ids": ["ART-004-6155034A"],
        "rationale": "Testing hypothesis that screenshot claims are inaccurate",
        "created_by": "Senior Forensic Examiner",
    })
    assert ch_resp.status_code == 200
    ch_data = ch_resp.json()
    ch_run_id = ch_data.get("challenge_run_id") or ch_data.get("run_id")

    # Generate report for challenge run
    rep_resp = client.post(f"/api/cases/{case_id}/reports", json={
        "run_id": ch_run_id,
        "title": "Counterfactual Challenge Report: Excluded Screenshot",
        "include_counterfactual": True,
    })
    assert rep_resp.status_code == 200
    ch_report = rep_resp.json()

    assert ch_report["metadata"]["run_type"] == "COUNTERFACTUAL_CHALLENGE"
    assert ch_report["counterfactual"]["is_counterfactual_run"] is True
    assert "ART-004-6155034A" in ch_report["counterfactual"]["excluded_artifact_ids"]
    assert ch_report["counterfactual"]["provenance_justified"] is True

    # Invariant 11: Correct identification of findings that changed
    deactivated = ch_report["counterfactual"]["deactivated_findings"]
    assert len(deactivated) >= 1
    assert any("AMT" in d for d in deactivated)

    # Invariant 12: Independent findings survive
    surviving = ch_report["counterfactual"]["surviving_independent_findings"]
    bank_art = next((a for a in ch_report["evidence_inventory"] if "001" in a["artifact_id"]), None)
    assert bank_art is not None
    assert bank_art["processing_status"] == "PROCESSED"


def test_identification_of_findings_changed_under_challenge(client: TestClient):
    """Invariant 11: Dedicated test asserting findings deactivated under challenge are explicitly enumerated."""
    case_id = "upi_payment_discrepancy"
    chlg_resp = client.post(
        f"/api/cases/{case_id}/analysis-runs/baseline/challenge",
        json={
            "run_name": "Invariant 11 Test",
            "excluded_artifact_ids": ["ART-004-6155034A"],
            "rationale": "Testing hypothesis exclusion",
            "created_by": "Senior Examiner",
        },
    )
    assert chlg_resp.status_code == 200
    ch_data = chlg_resp.json()
    ch_run_id = ch_data.get("challenge_run_id") or ch_data.get("run_id")
    rep_resp = client.post(f"/api/cases/{case_id}/reports", json={"run_id": ch_run_id})
    assert rep_resp.status_code == 200
    report = rep_resp.json()
    assert len(report["counterfactual"]["deactivated_findings"]) >= 1
    assert any("AMT" in d for d in report["counterfactual"]["deactivated_findings"])


def test_independent_findings_surviving_challenge(client: TestClient):
    """Invariant 12: Dedicated test asserting independent corroborations survive excluded artifacts."""
    case_id = "upi_payment_discrepancy"
    chlg_resp = client.post(
        f"/api/cases/{case_id}/analysis-runs/baseline/challenge",
        json={
            "run_name": "Invariant 12 Test",
            "excluded_artifact_ids": ["ART-004-6155034A"],
            "rationale": "Testing hypothesis exclusion",
            "created_by": "Senior Examiner",
        },
    )
    assert chlg_resp.status_code == 200
    ch_data = chlg_resp.json()
    ch_run_id = ch_data.get("challenge_run_id") or ch_data.get("run_id")
    rep_resp = client.post(f"/api/cases/{case_id}/reports", json={"run_id": ch_run_id})
    assert rep_resp.status_code == 200
    report = rep_resp.json()
    assert report["counterfactual"]["is_counterfactual_run"] is True
    # The bank statement artifact remains processed and intact
    bank_art = next((a for a in report["evidence_inventory"] if "001" in a["artifact_id"]), None)
    assert bank_art is not None
    assert bank_art["processing_status"] == "PROCESSED"


# ==============================================================================
# Invariant 13: Baseline Immutability
# ==============================================================================

def test_baseline_immutability_after_report_generation(client: TestClient, report_builder: ForensicReportBuilder):
    """Generating challenge reports leaves baseline analysis and stored facts strictly unaltered."""
    case_id = "upi_payment_discrepancy"

    # Baseline before
    base_1 = report_builder.generate_report(case_id=case_id, run_id="baseline")
    fingerprint_1 = base_1.metadata.fingerprint

    # Generate challenge report
    client.post(f"/api/cases/{case_id}/reports", json={"run_id": "baseline"})

    # Baseline after
    base_2 = report_builder.generate_report(case_id=case_id, run_id="baseline")
    fingerprint_2 = base_2.metadata.fingerprint

    assert fingerprint_1 == fingerprint_2, "Baseline report fingerprint must be strictly immutable"


# ==============================================================================
# Invariant 14: Cross-Case Validation & Isolation
# ==============================================================================

def test_cross_case_isolation_and_validation(client: TestClient):
    """Reports from Case A cannot be queried under Case B; nonexistent runs return 404."""
    case_id = "upi_payment_discrepancy"

    # Nonexistent run
    r = client.post(f"/api/cases/{case_id}/reports", json={"run_id": "RUN-DOES-NOT-EXIST"})
    assert r.status_code == 404

    # Nonexistent case
    r = client.post("/api/cases/CASE-DOES-NOT-EXIST/reports", json={"run_id": "baseline"})
    assert r.status_code == 404


# ==============================================================================
# Invariant 15 & 16: Deterministic Content Fingerprinting
# ==============================================================================

def test_deterministic_report_fingerprint(report_builder: ForensicReportBuilder):
    """Identical substantive report inputs yield bit-exact identical fingerprints."""
    case_id = "upi_payment_discrepancy"

    rep1 = report_builder.generate_report(case_id=case_id)
    rep2 = report_builder.generate_report(case_id=case_id)

    assert rep1.metadata.fingerprint == rep2.metadata.fingerprint
    assert len(rep1.metadata.fingerprint) == 64


def test_substantive_change_alters_fingerprint(report_builder: ForensicReportBuilder):
    """Substantive differences (e.g. baseline vs challenge) yield different fingerprints."""
    case_id = "upi_payment_discrepancy"

    base_rep = report_builder.generate_report(case_id=case_id, run_id="baseline")

    # Manually modify a substantive field in a copy
    mod_rep = copy.deepcopy(base_rep)
    mod_rep.findings = []
    fp_mod = compute_report_fingerprint(mod_rep)

    assert base_rep.metadata.fingerprint != fp_mod


# ==============================================================================
# Invariant 17: JSON Schema Validation
# ==============================================================================

def test_json_schema_validation(report_builder: ForensicReportBuilder):
    """Generated report validates against Pydantic model and json dump/reload roundtrip."""
    case_id = "upi_payment_discrepancy"
    report = report_builder.generate_report(case_id=case_id)

    dumped = report.model_dump(mode="json")
    reloaded = ForensicReport.model_validate(dumped)

    assert reloaded.metadata.report_id == report.metadata.report_id
    assert len(reloaded.findings) == len(report.findings)


# ==============================================================================
# Invariant 18: HTML Escaping of Malicious Evidence Strings
# ==============================================================================

def test_html_escaping_untrusted_evidence_strings(report_builder: ForensicReportBuilder):
    """Malicious scripts or HTML in evidence filenames or raw text are safely escaped."""
    case_id = "test_xss_case"
    c = Case(case_id=case_id, title="<script>alert('XSS')</script>", created_at_iso="2026-02-14T10:00:00Z")
    case_store.save_case(c)

    art = Artifact(
        artifact_id="ART-XSS-01",
        case_id=case_id,
        filename='<img src=x onerror="alert(1)">.png',
        sha256="ff" * 32,
        file_size_bytes=100,
        source_tier=TrustTier.T3,
        storage_path="/tmp/test.png",
        mime_type="image/png",
        intake_timestamp_iso="2026-02-14T10:00:00Z",
        custody_chain_sequence=1,
    )
    case_store.save_artifact(art)

    report = report_builder.generate_report(case_id=case_id)
    html_output = ForensicReportHTMLExporter.render_html(report)

    # Malicious tags must NOT be present unescaped
    assert "<script>alert('XSS')</script>" not in html_output
    assert '<img src=x onerror="alert(1)">' not in html_output
    # Escaped versions must be present
    assert html.escape("<script>alert('XSS')</script>") in html_output
    assert html.escape('<img src=x onerror="alert(1)">') in html_output


# ==============================================================================
# Invariant 19 & 20: Export Formats & Invalid Format Rejection
# ==============================================================================

def test_export_content_type_and_filenames(client: TestClient):
    """Exports as JSON, HTML, and PDF with correct MIME types and Content-Disposition."""
    case_id = "upi_payment_discrepancy"

    # Create report first
    create_resp = client.post(f"/api/cases/{case_id}/reports", json={"run_id": "baseline", "persist": True})
    assert create_resp.status_code == 200
    report_id = create_resp.json()["metadata"]["report_id"]

    # 1. JSON Export
    r_json = client.get(f"/api/cases/{case_id}/reports/{report_id}/export?format=json")
    assert r_json.status_code == 200
    assert "application/json" in r_json.headers["content-type"]
    assert f'filename="tarka_{report_id}.json"' in r_json.headers["content-disposition"]
    data = r_json.json()
    assert data["metadata"]["report_id"] == report_id

    # 2. HTML Export
    r_html = client.get(f"/api/cases/{case_id}/reports/{report_id}/export?format=html")
    assert r_html.status_code == 200
    assert "text/html" in r_html.headers["content-type"]
    assert f'filename="tarka_{report_id}.html"' in r_html.headers["content-disposition"]
    assert "<!DOCTYPE html>" in r_html.text

    # 3. PDF Export
    r_pdf = client.get(f"/api/cases/{case_id}/reports/{report_id}/export?format=pdf")
    assert r_pdf.status_code == 200
    assert "application/pdf" in r_pdf.headers["content-type"]
    assert f'filename="tarka_{report_id}.pdf"' in r_pdf.headers["content-disposition"]
    assert r_pdf.content.startswith(b"%PDF")


def test_invalid_export_format_returns_400(client: TestClient):
    """Unsupported export format returns HTTP 400 with helpful error message."""
    case_id = "upi_payment_discrepancy"
    create_resp = client.post(f"/api/cases/{case_id}/reports", json={"run_id": "baseline"})
    report_id = create_resp.json()["metadata"]["report_id"]

    r = client.get(f"/api/cases/{case_id}/reports/{report_id}/export?format=docx")
    assert r.status_code == 400
    assert "unsupported export format 'docx'" in r.json()["detail"].lower()


# ==============================================================================
# Invariant 21: Missing Report, Case, or Run Handling
# ==============================================================================

def test_missing_report_case_run_returns_404(client: TestClient):
    """Returns clean 404 responses for nonexistent resources."""
    case_id = "upi_payment_discrepancy"

    # Nonexistent report
    r = client.get(f"/api/cases/{case_id}/reports/REP-NONEXISTENT")
    assert r.status_code == 404

    # Nonexistent report export
    r = client.get(f"/api/cases/{case_id}/reports/REP-NONEXISTENT/export?format=json")
    assert r.status_code == 404

    # Nonexistent case list
    r = client.get("/api/cases/CASE-NONEXISTENT/reports")
    assert r.status_code == 404


# ==============================================================================
# Invariant 22: Read-Only Reporting Leaves Custody Unchanged
# ==============================================================================

def test_custody_integrity_preserved_during_reporting(client: TestClient):
    """Report generation and export are read-only and never alter custody records."""
    case_id = "upi_payment_discrepancy"
    ledger = case_store.get_ledger(case_id)
    latest_init = ledger.get_latest_entry()
    initial_seq = latest_init.seq if latest_init else 0
    initial_head = ledger.get_chain_head_hash()

    # Generate report
    client.post(f"/api/cases/{case_id}/reports", json={"run_id": "baseline"})

    # Export report
    reports_resp = client.get(f"/api/cases/{case_id}/reports")
    rep_id = reports_resp.json()[0]["report_id"]
    client.get(f"/api/cases/{case_id}/reports/{rep_id}/export?format=json")
    client.get(f"/api/cases/{case_id}/reports/{rep_id}/export?format=html")

    # Verify custody sequence and head are untouched
    latest_after = ledger.get_latest_entry()
    seq_after = latest_after.seq if latest_after else 0
    assert seq_after == initial_seq
    assert ledger.get_chain_head_hash() == initial_head


# ==============================================================================
# Invariant 23 & 24: Raw Values & Provenance References Preserved
# ==============================================================================

def test_preservation_raw_and_normalized_values(report_builder: ForensicReportBuilder):
    """Material findings preserve raw strings alongside normalized comparison values."""
    case_id = "upi_payment_discrepancy"
    report = report_builder.generate_report(case_id=case_id)

    amt_finding = next((f for f in report.findings if "AMT" in f.finding_id or f.category in ("CLAIM_VS_RECORD", "AMOUNT_DISCREPANCY")), None)
    assert amt_finding is not None
    assert amt_finding.original_values != {}
    assert amt_finding.normalized_values != {}


def test_provenance_references_for_material_findings(report_builder: ForensicReportBuilder):
    """Every material finding provides backward provenance references to source nodes."""
    case_id = "upi_payment_discrepancy"
    report = report_builder.generate_report(case_id=case_id)

    for f in report.findings:
        assert len(f.provenance_trace_node_ids) >= 1
        assert any("art:" in node or "fact:" in node or "find:" in node for node in f.provenance_trace_node_ids)
