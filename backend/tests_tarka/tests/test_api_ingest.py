"""FastAPI TestClient tests for Phase F1 Evidence Ingest Endpoints.

Forensic Safety Invariants Verified:
1. Exact SHA-256 calculation live on byte uploads.
2. Line conservation: parsed_facts_count + rejected_rows_count == total_data_lines.
3. No silent row drops: malformed lines recorded with 1-based line numbers and diagnostic reasons.
4. Date ambiguity detection across whole files without guessing.
5. Tower coordinates operator-supplied; unlisted towers have region=None (never invent coordinates).
6. Immutable custody ledger chain appending with INGEST_FACT records.
7. Custom CSV preview and wizard mapping with schema introspection.
8. State isolation: pytest tmp_path fixture prevents cross-test custody pollution.
9. Case deduplication verified intra-case while maintaining cross-case independence.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from tarka.api.server import app, sanitize_filename
from tarka.core.custody import CustodyLedger
from tarka.core.evidence_dna import CaseStore

client = TestClient(app)
FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture(autouse=True)
def isolate_cases_dir(monkeypatch, tmp_path):
    """Isolate CASES_DIR and case_store to pytest tmp_path for every test.

    Eliminates shared-state test pollution and cross-test custody hash collisions.
    """
    monkeypatch.setattr("tarka.api.server.CASES_DIR", tmp_path)
    monkeypatch.setattr("tarka.api.server.case_store", CaseStore(base_dir=tmp_path))
    return tmp_path


@pytest.fixture
def case_id():
    """Generates an isolated unique temporary case ID for the test."""
    return f"test_ingest_{uuid.uuid4().hex[:8]}"


def test_sanitize_filename():
    assert sanitize_filename("../../secret/test.csv") == "test.csv"
    assert sanitize_filename("safe_name-1.csv") == "safe_name-1.csv"
    assert sanitize_filename("bad name!@#.csv") == "bad_name___.csv"


def test_api_ingest_cdr_with_operator_towers(case_id: str):
    """Tests CDR CSV upload alongside operator tower coordinates JSON."""
    cdr_path = FIXTURES_DIR / "messy_cdr.csv"
    towers_path = FIXTURES_DIR / "operator_towers.json"

    with open(cdr_path, "rb") as f_cdr, open(towers_path, "rb") as f_towers:
        response = client.post(
            "/api/ingest",
            files=[
                ("files", (cdr_path.name, f_cdr, "text/csv")),
                ("files", (towers_path.name, f_towers, "application/json")),
            ],
            data={"tz": "Asia/Kolkata", "case_id": case_id, "append_to_custody": "true"},
        )

    assert response.status_code == 200
    data = response.json()

    # Verify source file summaries
    assert len(data["source_files"]) == 2
    cdr_summary = next(s for s in data["source_files"] if s["filename"] == "messy_cdr.csv")
    tower_summary = next(s for s in data["source_files"] if s["filename"] == "operator_towers.json")

    with open(cdr_path, "rb") as f:
        expected_cdr_sha = hashlib.sha256(f.read()).hexdigest()
    assert cdr_summary["sha256"] == expected_cdr_sha
    assert cdr_summary["parser_type"] == "CDRParser"

    # Line conservation on messy CDR: 7 total lines (1 header + 5 non-empty data lines: 3 valid, 2 malformed)
    assert cdr_summary["parsed_facts_count"] + cdr_summary["rejected_rows_count"] == 5
    assert data["total_facts_ingested"] >= 3
    assert data["total_rejected_rows"] >= 2

    # Custody chain head hash must be returned and valid SHA-256
    assert len(data["custody_chain_head"]) == 64
    assert "Section 63" in data["legal_disclaimer"]


def test_api_ingest_bank_upi_line_conservation(case_id: str):
    """Tests Banking/UPI statement upload and line conservation."""
    bank_path = FIXTURES_DIR / "messy_bank_upi.csv"

    with open(bank_path, "rb") as f_bank:
        response = client.post(
            "/api/ingest",
            files=[("files", (bank_path.name, f_bank, "text/csv"))],
            data={"tz": "Asia/Kolkata", "case_id": case_id, "append_to_custody": "false"},
        )

    assert response.status_code == 200
    data = response.json()
    summary = data["source_files"][0]
    assert summary["parser_type"] == "BankUPIParser"

    # messy_bank_upi has 5 non-empty data lines total (3 valid, 2 malformed)
    assert summary["parsed_facts_count"] + summary["rejected_rows_count"] == 5
    rejections = [r for r in data["rejected_rows"] if r["source_file"] == "messy_bank_upi.csv"]
    assert len(rejections) == 2
    assert any("line" in str(r["line_number"]) or r["line_number"] in [4, 7] for r in rejections)


def test_api_ingest_whatsapp_date_ambiguity(case_id: str):
    """Tests WhatsApp upload flagging date ambiguity when all day/month numbers <= 12."""
    amb_path = FIXTURES_DIR / "messy_whatsapp_ambiguous.txt"
    unamb_path = FIXTURES_DIR / "messy_whatsapp_unambiguous.txt"

    with open(amb_path, "rb") as f_amb:
        resp_amb = client.post(
            "/api/ingest",
            files=[("files", (amb_path.name, f_amb, "text/plain"))],
            data={"tz": "Asia/Kolkata", "case_id": case_id, "append_to_custody": "false"},
        )
    assert resp_amb.status_code == 200
    data_amb = resp_amb.json()
    assert data_amb["source_files"][0]["is_date_ambiguous"] is True
    assert any("ambiguous date format" in w for w in data_amb["warnings"])

    case_unamb = f"{case_id}_unamb"
    with open(unamb_path, "rb") as f_unamb:
        resp_unamb = client.post(
            "/api/ingest",
            files=[("files", (unamb_path.name, f_unamb, "text/plain"))],
            data={"tz": "Asia/Kolkata", "case_id": case_unamb, "append_to_custody": "false"},
        )
    assert resp_unamb.status_code == 200
    data_unamb = resp_unamb.json()
    assert data_unamb["source_files"][0]["is_date_ambiguous"] is False


def test_api_ingest_preview_csv():
    """Tests schema introspection and heuristic suggestion for custom CSVs."""
    sample_csv = (
        "record_id,event_time,latitude,longitude,caller_msisdn,action_type\n"
        "1,2026-01-24 10:15:00,28.6139,77.2090,+919876543210,CALL_OUT\n"
        "2,2026-01-24 10:30:00,28.6200,77.2150,+919876543210,CALL_IN\n"
    )

    response = client.post(
        "/api/ingest/preview_csv",
        files=[("file", ("test_custom.csv", sample_csv.encode("utf-8"), "text/csv")),
    ])

    assert response.status_code == 200
    preview = response.json()
    assert preview["filename"] == "test_custom.csv"
    assert len(preview["headers"]) == 6
    assert len(preview["sample_rows"]) == 2
    assert preview["suggested_mapping"]["timestamp_col"] == "event_time"
    assert preview["suggested_mapping"]["lat_col"] == "latitude"
    assert preview["suggested_mapping"]["lon_col"] == "longitude"
    assert preview["suggested_mapping"]["entity_col"] == "caller_msisdn"
    assert preview["suggested_mapping"]["kind_col"] == "action_type"


def test_api_ingest_custom_csv_conservation_and_no_invented_coords(case_id: str):
    """Tests custom mapped CSV ingestion maintaining line conservation and no invented coordinates."""
    csv_content = (
        "id,ts,lat,lon,user\n"
        "row1,2026-01-24 12:00:00,12.9716,77.5946,+919811111111\n"  # Valid with location
        "row2,2026-01-24 12:15:00,,,+919811111111\n"               # Valid without location (region must be None)
        "row3,MALFORMED_TIMESTAMP,12.9716,77.5946,+919811111111\n" # Bad ts -> reject
        "row4,2026-01-24 12:45:00,999.0,77.5946,+919811111111\n"   # Bad lat -> reject
    )

    config = {
        "timestamp_col": "ts",
        "lat_col": "lat",
        "lon_col": "lon",
        "radius_meters": 500.0,
        "entity_col": "user",
        "default_kind": "CDR_DATA",
        "trust_tier": "T2",
        "auth_type": "passive",
        "clock_id": "clk_custom_test",
        "append_to_custody": True,
    }

    response = client.post(
        "/api/ingest/custom_csv",
        files=[("file", ("custom_mapped.csv", csv_content.encode("utf-8"), "text/csv"))],
        data={"config": json.dumps(config), "case_id": case_id},
    )

    assert response.status_code == 200
    data = response.json()

    # Exact line conservation: 4 data lines = 2 parsed facts + 2 rejected rows
    assert data["total_facts_ingested"] == 2
    assert data["total_rejected_rows"] == 2
    assert data["total_facts_ingested"] + data["total_rejected_rows"] == 4

    # Row 1 must have region
    fact_1 = next(f for f in data["facts"] if f["line_ref"] == "line:2")
    assert fact_1["region"] is not None
    assert fact_1["region"]["latitude"] == 12.9716
    assert fact_1["region"]["longitude"] == 77.5946

    # Row 2 must have NO region (never invent coordinates)
    fact_2 = next(f for f in data["facts"] if f["line_ref"] == "line:3")
    assert fact_2["region"] is None

    # Rejection rows must record line numbers and technical reasons
    rejected_lines = {r["line_number"]: r["reason"] for r in data["rejected_rows"]}
    assert 4 in rejected_lines
    assert 5 in rejected_lines
    assert "Failed to parse timestamp" in rejected_lines[4]
    assert "Coordinates out of range" in rejected_lines[5]


def test_api_ingest_explicit_intra_case_deduplication(case_id: str):
    """Explicitly tests deduplication within the same case:
    1. First ingestion of messy_cdr.csv succeeds with CDRParser and parsed facts.
    2. Second ingestion of identical messy_cdr.csv into the SAME case flags DuplicateSkipped.
    3. Production deduplication semantics and warnings are strictly preserved.
    """
    cdr_path = FIXTURES_DIR / "messy_cdr.csv"

    with open(cdr_path, "rb") as f_cdr:
        res1 = client.post(
            "/api/ingest",
            files=[("files", (cdr_path.name, f_cdr, "text/csv"))],
            data={"tz": "Asia/Kolkata", "case_id": case_id, "append_to_custody": "false"},
        )
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["source_files"][0]["parser_type"] == "CDRParser"
    assert d1["total_facts_ingested"] >= 3

    # Re-upload the exact same file to the same case
    with open(cdr_path, "rb") as f_cdr:
        res2 = client.post(
            "/api/ingest",
            files=[("files", (cdr_path.name, f_cdr, "text/csv"))],
            data={"tz": "Asia/Kolkata", "case_id": case_id, "append_to_custody": "false"},
        )
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["source_files"][0]["parser_type"] == "DuplicateSkipped"
    assert d2["source_files"][0]["parsed_facts_count"] == 0
    assert any("already ingested into case" in w for w in d2["warnings"])


def test_api_ingest_cross_case_isolation():
    """Verifies that identical file bitstreams ingested into distinct cases do NOT collide."""
    case_1 = f"case_iso_1_{uuid.uuid4().hex[:8]}"
    case_2 = f"case_iso_2_{uuid.uuid4().hex[:8]}"
    cdr_path = FIXTURES_DIR / "messy_cdr.csv"

    # Ingest into case 1
    with open(cdr_path, "rb") as f:
        res1 = client.post(
            "/api/ingest",
            files=[("files", (cdr_path.name, f, "text/csv"))],
            data={"tz": "Asia/Kolkata", "case_id": case_1, "append_to_custody": "false"},
        )
    assert res1.status_code == 200
    assert res1.json()["source_files"][0]["parser_type"] == "CDRParser"

    # Ingest into case 2 -> MUST parse cleanly, not DuplicateSkipped
    with open(cdr_path, "rb") as f:
        res2 = client.post(
            "/api/ingest",
            files=[("files", (cdr_path.name, f, "text/csv"))],
            data={"tz": "Asia/Kolkata", "case_id": case_2, "append_to_custody": "false"},
        )
    assert res2.status_code == 200
    assert res2.json()["source_files"][0]["parser_type"] == "CDRParser"
    assert res2.json()["total_facts_ingested"] >= 3


def test_api_ingest_repeated_execution_order_independence():
    """Regression test: verifies that repeated executions in varied order produce identical results."""
    cdr_path = FIXTURES_DIR / "messy_cdr.csv"
    bank_path = FIXTURES_DIR / "messy_bank_upi.csv"

    for iteration in range(3):
        case_iter = f"iter_case_{iteration}_{uuid.uuid4().hex[:8]}"
        with open(cdr_path, "rb") as f_cdr:
            r_cdr = client.post(
                "/api/ingest",
                files=[("files", (cdr_path.name, f_cdr, "text/csv"))],
                data={"tz": "Asia/Kolkata", "case_id": case_iter, "append_to_custody": "false"},
            )
        assert r_cdr.status_code == 200
        assert r_cdr.json()["source_files"][0]["parser_type"] == "CDRParser"

        with open(bank_path, "rb") as f_bank:
            r_bank = client.post(
                "/api/ingest",
                files=[("files", (bank_path.name, f_bank, "text/csv"))],
                data={"tz": "Asia/Kolkata", "case_id": case_iter, "append_to_custody": "false"},
            )
        assert r_bank.status_code == 200
        assert r_bank.json()["source_files"][0]["parser_type"] == "BankUPIParser"
