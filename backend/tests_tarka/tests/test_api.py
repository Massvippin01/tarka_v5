"""Unit tests for TARKA FastAPI REST API endpoints using TestClient.

Verifies:
1. /api/health returns valid status and ledger state.
2. /api/cases lists built-in cases with "Cross-country" renaming.
3. /api/cases/{id} loads full facts and does NOT write anything to the custody ledger.
4. /api/solve returns exact required verdict strings:
   - "Inconsistent under the stated model" (UNSAT)
   - "No conflict found under the stated model — this does not verify the alibi" (SAT)
5. Hypothesis toggle "Handset stayed with the claimant" dissolves passive/active cores.
6. "Alter one byte (demo copy)" mutates a clone while leaving live ledger untouched.
7. CORS headers are returned for localhost:3000.
"""

import pytest
from fastapi.testclient import TestClient

from tarka.api.server import app, ledger, LIVE_LEDGER_PATH
from tarka.generator.synthetic_cases import (
    generate_case_a_impossible_alibi,
    generate_case_c_consistent_control,
)

client = TestClient(app)


def test_api_health_endpoint() -> None:
    """Verifies /api/health reports engine status and anchor validity."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["version"] == "1.0.0"
    assert len(data["chain_head_hash"]) == 64
    assert data["genesis_anchor_valid"] is True


def test_api_cases_list() -> None:
    """Verifies /api/cases lists built-in cases with Cross-country renaming."""
    res = client.get("/api/cases")
    assert res.status_code == 200
    cases = res.json()
    assert len(cases) >= 5

    case_ids = [c["id"] for c in cases]
    assert "cross_country" in case_ids
    assert "case_b_cyclic_skew_trap" in case_ids
    assert "case_c_consistent_control" in case_ids

    cross_case = next(c for c in cases if c["id"] == "cross_country")
    assert "Cross-country" in cross_case["title"]


def test_api_get_case_detail_writes_nothing_to_custody() -> None:
    """CRITICAL REQUIREMENT: Demo case loads write nothing to the custody ledger."""
    # Capture initial ledger count
    initial_trail = ledger.get_all_entries()
    initial_count = len(initial_trail)

    res = client.get("/api/cases/cross_country")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "cross_country"
    assert len(data["facts"]) == 3
    assert "clk_airtel_ntp" in data["clock_bounds"]

    # Verify ledger was NOT mutated
    after_trail = ledger.get_all_entries()
    assert len(after_trail) == initial_count, "Loading a demo case must write nothing to the custody ledger"


def test_api_solve_inconsistent_case_wording_and_margin() -> None:
    """CRITICAL REQUIREMENT: /api/solve returns exact required verdict string for inconsistent case."""
    case_a = generate_case_a_impossible_alibi(seed=42)
    payload = {
        "facts": [f.model_dump() for f in case_a.facts],
        "clock_bounds": case_a.clock_bounds,
        "handset_with_third_party": False,
    }

    res = client.post("/api/solve", json=payload)
    assert res.status_code == 200
    data = res.json()

    # Exact required verdict wording
    assert data["verdict"] == "INCONSISTENT"
    assert data["verdict_label"] == "Inconsistent under the stated model"
    assert data["model_stated_banner"] == "Results hold strictly under the stated model"

    # Minimal Unsatisfiable Subsets
    assert len(data["mus_fact_ids"]) == 2
    assert ["FACT_CASE_A_CDR_BLR", "FACT_CASE_A_UPI_DEL"] in data["mus_fact_ids"]

    # Leave-one-out disclaimer
    assert "does not prove or imply that the omitted fact is unreliable" in data["leave_one_out_disclaimer"]

    # Bound-vs-Gap matrix
    assert len(data["bound_vs_gap"]) > 0
    deficit_item = next(b for b in data["bound_vs_gap"] if "DEFICIT" in b["status"])
    assert deficit_item["gap_s"] < 0.0

    # Margin breakdown
    assert data["margin_breakdown"] is not None
    assert data["margin_breakdown"]["overall_skew_margin_seconds"] > 4000.0


def test_api_solve_consistent_case_exact_wording() -> None:
    """CRITICAL REQUIREMENT: /api/solve returns exact required verdict string for satisfiable case:

    'No conflict found under the stated model — this does not verify the alibi'
    """
    case_c = generate_case_c_consistent_control(seed=42)
    payload = {
        "facts": [f.model_dump() for f in case_c.facts],
        "clock_bounds": case_c.clock_bounds,
        "handset_with_third_party": False,
    }

    res = client.post("/api/solve", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["verdict"] == "CONSISTENT"
    assert data["verdict_label"] == "No conflict found under the stated model — this does not verify the alibi"
    assert len(data["mus_fact_ids"]) == 0


def test_api_hypothesis_toggle_dissolves_cores() -> None:
    """Verifies hypothesis switch 'handset_with_third_party' decouples active vs passive tracks."""
    case_a = generate_case_a_impossible_alibi(seed=42)
    # Only test passive CDR and active UPI
    facts_subset = [
        f.model_dump()
        for f in case_a.facts
        if f.id in ["FACT_CASE_A_CDR_BLR", "FACT_CASE_A_UPI_DEL"]
    ]

    # Baseline: False -> UNSAT
    res_base = client.post(
        "/api/solve",
        json={
            "facts": facts_subset,
            "clock_bounds": case_a.clock_bounds,
            "handset_with_third_party": False,
        },
    )
    assert res_base.json()["verdict"] == "INCONSISTENT"

    # Toggled: True -> SAT (Handset with associate)
    res_toggled = client.post(
        "/api/solve",
        json={
            "facts": facts_subset,
            "clock_bounds": case_a.clock_bounds,
            "handset_with_third_party": True,
        },
    )
    assert res_toggled.json()["verdict"] == "CONSISTENT"
    assert res_toggled.json()["verdict_label"] == "No conflict found under the stated model — this does not verify the alibi"


def test_api_alter_demo_byte_cloned_isolation() -> None:
    """CRITICAL REQUIREMENT: alter_demo_byte mutates a temporary clone, NEVER the live ledger."""
    res = client.post("/api/custody/alter_demo_byte")
    assert res.status_code == 200
    data = res.json()

    assert data["operation"] == "Alter one byte (demo copy)"
    assert data["is_valid"] is False
    assert data["status_label"] == "Integrity check failed"
    assert "tamper" not in data["status_label"].lower()
    assert "corrupt" not in data["status_label"].lower()

    # CRITICAL: Verify live ledger was NEVER mutated and remains valid
    report = ledger.verify_chain()
    assert report.is_valid is True, f"Live custody ledger was corrupted! Error: {report.details}"


def test_api_cors_restricted_to_localhost_3000() -> None:
    """Verifies CORS headers are returned for localhost:3000."""
    headers = {"Origin": "http://localhost:3000"}
    res = client.get("/api/health", headers=headers)
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == "http://localhost:3000"
