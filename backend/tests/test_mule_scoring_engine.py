"""
Tests for Explainable Mule-Account Scoring Engine (Prompt 8).
Validates topological & temporal feature calculation, feature waterfall explanations,
merchant hard-veto mitigation, and score sensitivity to fixture mutations.
"""

import copy
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth_service import AuthService
from app.services.mule_scoring_service import MuleScoringEngine


@pytest.fixture
def auth_header():
    auth = AuthService.get_instance()
    token = auth.create_jwt_token("SUPERVISOR_NCR")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_client():
    return TestClient(app)


def test_mule_scoring_case_001_vikram_shah():
    """Verify that primary Layer 1 mule Vikram Shah receives a high investigative lead score with explainable contributions."""
    engine = MuleScoringEngine()
    result = engine.score_case("CASE-2026-001")

    assert result["caseId"] == "CASE-2026-001"
    assert result["totalAccountsScored"] >= 5

    # Find Vikram Shah's account
    vikram = next((a for a in result["accounts"] if "Vikram Shah" in a["holderName"]), None)
    assert vikram is not None, "Vikram Shah account should be in scored accounts"

    # Score assertions
    assert vikram["investigativeLeadStrength"] >= 80
    assert vikram["riskBand"] == "CRITICAL_MULE_LEAD"
    assert vikram["muleLayer"] == "L1"

    # Metrics assertions
    metrics = vikram["metrics"]
    assert metrics["passThroughRatio"] >= 0.85
    assert metrics["medianDwellTimeSeconds"] is not None
    assert metrics["medianDwellTimeSeconds"] <= 300  # < 5 mins rapid siphon (298s)
    assert metrics["fanOutDegree"] >= 2

    # Contribution waterfall assertions
    contributions = vikram["featureContributions"]
    contrib_features = [c["feature"] for c in contributions]
    assert any("Pass-through" in f for f in contrib_features)
    assert any("Dwell Time" in f for f in contrib_features)
    assert any("Layer 1" in f for f in contrib_features)

    # Every contribution must have points, direction, and evidence string
    for c in contributions:
        assert "points" in c
        assert c["direction"] in ("INCREASES_RISK", "MITIGATES_RISK")
        assert len(c["evidence"]) > 5


def test_mule_scoring_apex_electronics_merchant_hard_veto():
    """Verify that legitimate merchant Apex Electronics is mitigated by hard-veto and receives low risk score."""
    engine = MuleScoringEngine()
    result = engine.score_case("CASE-2026-001")

    apex = next((a for a in result["accounts"] if "Apex Electronics" in a["holderName"]), None)
    assert apex is not None, "Apex Electronics should be present in scored accounts"

    # Must be low risk legitimate
    assert apex["investigativeLeadStrength"] <= 35
    assert apex["riskBand"] == "LOW_RISK_LEGITIMATE"

    # Veto mitigation must be explicitly documented in waterfall
    veto_contrib = next((c for c in apex["featureContributions"] if "Merchant Veto" in c["feature"] or "Escrow" in c["feature"]), None)
    assert veto_contrib is not None
    assert veto_contrib["points"] < 0
    assert veto_contrib["direction"] == "MITIGATES_RISK"


def test_mule_scoring_sensitivity_to_mutation():
    """Changing transaction parameters must dynamically alter the computed score and contribution text."""
    engine = MuleScoringEngine()

    base_txs = [
        {
            "id": "TX-01",
            "fromAccount": "VIC-01",
            "toAccount": "MULE-01",
            "amount": 100000,
            "timestampUtc": "2026-09-22T10:00:00Z",
            "paymentRail": "IMPS",
        },
        {
            "id": "TX-02",
            "fromAccount": "MULE-01",
            "toAccount": "LAYER-02",
            "amount": 95000,
            "timestampUtc": "2026-09-22T10:02:00Z",  # 120s dwell
            "paymentRail": "IMPS",
        },
    ]

    accounts = [
        {"nodeId": "VIC-01", "accountNumber": "VIC-01", "holderName": "Victim User", "holderType": "VICTIM", "muleLayer": "L0"},
        {"nodeId": "MULE-01", "accountNumber": "MULE-01", "holderName": "Suspect Mule", "holderType": "SUSPECT", "muleLayer": "L1"},
        {"nodeId": "LAYER-02", "accountNumber": "LAYER-02", "holderName": "Downstream Mule", "holderType": "SUSPECT", "muleLayer": "L2"},
    ]

    # Run 1: Rapid 120s dwell, high pass-through (95%)
    res1 = engine.score_transaction_graph(transactions=base_txs, accounts=accounts)
    mule1 = next(a for a in res1["accounts"] if a["nodeId"] == "MULE-01")
    score1 = mule1["investigativeLeadStrength"]
    assert score1 >= 60

    # Run 2: Delay outbound transaction to 5 hours later (dwell = 18000s)
    delayed_txs = copy.deepcopy(base_txs)
    delayed_txs[1]["timestampUtc"] = "2026-09-22T15:00:00Z"

    res2 = engine.score_transaction_graph(transactions=delayed_txs, accounts=accounts)
    mule2 = next(a for a in res2["accounts"] if a["nodeId"] == "MULE-01")
    score2 = mule2["investigativeLeadStrength"]

    # Delayed dwell time must produce a strictly lower lead score
    assert score2 < score1
    assert mule2["metrics"]["medianDwellTimeSeconds"] == 18000


def test_api_case_mule_scores_route(test_client, auth_header):
    """GET /api/v1/cases/{id}/mule-scores returns HTTP 200 with JSON payload."""
    resp = test_client.get("/api/v1/cases/CASE-2026-001/mule-scores", headers=auth_header)
    assert resp.status_code == 200
    data = resp.json()
    assert data["caseId"] == "CASE-2026-001"
    assert "accounts" in data
    assert len(data["accounts"]) >= 5


def test_api_analyze_mule_scores_route(test_client, auth_header):
    """POST /api/v1/analyze/mule-scores accepts arbitrary transaction list and returns scores."""
    payload = {
        "case_id": "TEST-DYNAMIC-01",
        "transactions": [
            {
                "id": "T1",
                "fromAccount": "ACC-V",
                "toAccount": "ACC-M",
                "amount": 50000,
                "timestampUtc": "2026-09-22T10:00:00Z",
            },
            {
                "id": "T2",
                "fromAccount": "ACC-M",
                "toAccount": "ACC-D",
                "amount": 49000,
                "timestampUtc": "2026-09-22T10:01:30Z",
            },
        ],
        "accounts": [
            {"nodeId": "ACC-V", "accountNumber": "ACC-V", "holderName": "Complainant", "holderType": "VICTIM"},
            {"nodeId": "ACC-M", "accountNumber": "ACC-M", "holderName": "Mule Target", "holderType": "SUSPECT"},
        ],
    }
    resp = test_client.post("/api/v1/analyze/mule-scores", json=payload, headers=auth_header)
    assert resp.status_code == 200
    data = resp.json()
    assert data["caseId"] == "TEST-DYNAMIC-01"
    assert len(data["accounts"]) >= 1
