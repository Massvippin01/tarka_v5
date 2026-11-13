"""
Unit and integration tests for SentinelX / TARKA Case Entity Resolution Engine.

Validates:
1. Indian phone normalization (+91, 0 prefixes, formatting)
2. UPI VPA handle stem decomposition and alias matching
3. IFSC-to-bank name resolution
4. Indic transliteration variants (Shah/Sha, Mohd/Mohammed, Kumar/K.)
5. Exact identifier match boosts (PAN, Account, IMEI)
6. Hard Vetoes:
   - Conflicting PAN numbers (fails closed)
   - Verified merchant with active GSTIN vs illicit mule (fails closed)
7. End-to-end clustering on canonical case mentions
8. Dynamic mention addition ("VIKRAM SHA, 98711-23941" attaches to Vikram Shah)
9. REST endpoints for entity resolution and investigator decisions (Accept/Reject/Split)
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services.case_entity_resolution_service import (
    CaseEntityResolutionEngine,
    compute_soundex,
    decompose_vpa,
    extract_default_mentions_for_case,
    ifsc_to_bank_name,
    indic_name_similarity,
    normalize_indian_phone,
)
from app.services.auth_service import AuthService


def test_01_phone_normalization():
    assert normalize_indian_phone("+91-98711-23941") == "9871123941"
    assert normalize_indian_phone("09871123941") == "9871123941"
    assert normalize_indian_phone("+91 98711 23941") == "9871123941"
    assert normalize_indian_phone("98711-23941") == "9871123941"
    assert normalize_indian_phone("9871123941") == "9871123941"
    assert normalize_indian_phone(None) is None


def test_02_vpa_decomposition():
    handle, psp, stem = decompose_vpa("vikram.pay@okaxis")
    assert handle == "vikram.pay"
    assert psp == "okaxis"
    assert stem == "vikram"

    handle2, psp2, stem2 = decompose_vpa("vikramshah@okaxis")
    assert handle2 == "vikramshah"
    assert psp2 == "okaxis"
    assert stem2 == "vikramshah"


def test_03_ifsc_to_bank_name():
    assert ifsc_to_bank_name("SBIN0004821") == "State Bank of India"
    assert ifsc_to_bank_name("UTIB0000412") == "Axis Bank"
    assert ifsc_to_bank_name("HDFC0001209") == "HDFC Bank"
    assert ifsc_to_bank_name("ICIC0000042") == "ICICI Bank"
    assert ifsc_to_bank_name("PUNB0142000") == "Punjab National Bank"


def test_04_indic_transliteration_shah_sha():
    score, reasons = indic_name_similarity("Vikram Shah", "VIKRAM SHA")
    assert score >= 0.90
    assert any("Indic transliteration equivalence" in r for r in reasons)


def test_05_indic_transliteration_mohd_mohammed():
    score, reasons = indic_name_similarity("Mohd Farooq", "Mohammed Farooq")
    assert score >= 0.90
    assert any("Indic transliteration equivalence" in r for r in reasons)


def test_06_indic_transliteration_kumar_initials():
    score, reasons = indic_name_similarity("Sunil Kumar", "Sunil K.")
    assert score >= 0.90
    assert any("initial" in r.lower() or "transliteration" in r.lower() for r in reasons)


def test_07_exact_pan_match_boost():
    engine = CaseEntityResolutionEngine()
    m1 = {"id": "M1", "name": "V. Shah", "pan": "ABCPS9102K"}
    m2 = {"id": "M2", "name": "Vikram", "pan": "ABCPS9102K"}
    score, reasons, veto = engine.compute_mention_similarity(m1, m2)
    assert veto is None
    assert score == 1.0
    assert any("PAN Exact Match" in r for r in reasons)


def test_08_exact_account_ifsc_match():
    engine = CaseEntityResolutionEngine()
    m1 = {"id": "M1", "account": "92102004810291", "ifsc": "UTIB0000412"}
    m2 = {"id": "M2", "account": "92102004810291", "ifsc": "UTIB0000412"}
    score, reasons, veto = engine.compute_mention_similarity(m1, m2)
    assert veto is None
    assert score == 1.0
    assert any("Bank Account Exact Match" in r for r in reasons)


def test_09_exact_imei_device_match():
    engine = CaseEntityResolutionEngine()
    m1 = {"id": "M1", "imei": "867492061234564", "name": "Shah"}
    m2 = {"id": "M2", "imei": "867492061234564", "name": "V. Shah"}
    score, reasons, veto = engine.compute_mention_similarity(m1, m2)
    assert veto is None
    assert score >= 0.95
    assert any("Device IMEI Exact Match" in r for r in reasons)


def test_10_hard_veto_conflicting_pan():
    engine = CaseEntityResolutionEngine()
    m1 = {"id": "M1", "name": "Vikram Shah", "pan": "ABCPS9102K"}
    m2 = {"id": "M2", "name": "Vikram Shah", "pan": "BVPVR4109L"}  # Discrepant PAN
    score, reasons, veto = engine.compute_mention_similarity(m1, m2)
    assert score == 0.0
    assert veto is not None
    assert "HARD_VETO: Discrepant PAN numbers" in veto


def test_11_hard_veto_verified_merchant_vs_mule():
    engine = CaseEntityResolutionEngine()
    merchant = {
        "id": "MERCH-01",
        "name": "Apex Electronics Pvt Ltd",
        "is_merchant": True,
        "gstin": "07AAACA1234F1Z8",
        "role": "BONA_FIDE_MERCHANT",
    }
    mule = {
        "id": "MULE-01",
        "name": "Apex Trading",
        "role": "LAYER_1_MULE",
    }
    score, reasons, veto = engine.compute_mention_similarity(merchant, mule)
    assert score == 0.0
    assert veto is not None
    assert "Verified retail merchant" in veto


def test_12_dynamic_mention_addition_attaches_to_vikram():
    """
    Acceptance test from Prompt 9:
    Adding a new mention 'VIKRAM SHA, 98711-23941' attaches it to Vikram Shah with visible reason.
    """
    engine = CaseEntityResolutionEngine()
    base_mentions = extract_default_mentions_for_case("CASE-2026-001")

    # Add new raw mention
    new_mention = {
        "id": "NEW-MENTION-01",
        "name": "VIKRAM SHA",
        "phone": "98711-23941",
        "source": "Interception Wiretap",
        "sourceType": "cdr",
    }
    all_mentions = base_mentions + [new_mention]

    clusters = engine.cluster_mentions(all_mentions, threshold=0.75)

    # Find cluster containing NEW-MENTION-01
    vikram_cluster = None
    for c in clusters:
        member_ids = [m["id"] for m in c["members"]]
        if "NEW-MENTION-01" in member_ids:
            vikram_cluster = c
            break

    assert vikram_cluster is not None
    # Must also contain Vikram's primary account mention
    member_names = [m.get("name") for m in vikram_cluster["members"]]
    assert any("Vikram Shah" in n for n in member_names)
    assert "VIKRAM SHA" in member_names
    # Must have visible evidence
    assert len(vikram_cluster["linkEvidence"]) > 0
    assert any("Phone Exact Match" in ev or "transliteration" in ev.lower() for ev in vikram_cluster["linkEvidence"])


@pytest.mark.asyncio
async def test_13_rest_resolve_entities_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = AuthService.get_instance().create_jwt_token("SUPERVISOR_NCR", expires_in_seconds=300)
        response = await client.post(
            "/api/v1/cases/CASE-2026-001/resolve-entities",
            headers={"Authorization": f"Bearer {token}"},
            json={"threshold": 0.75},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["caseId"] == "CASE-2026-001"
        assert data["totalClusters"] > 0
        assert data["totalMentions"] > 0
        assert data["auditProof"].startswith("0x")


@pytest.mark.asyncio
async def test_14_rest_entity_decision_audit_logging():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = AuthService.get_instance().create_jwt_token("SUPERVISOR_NCR", expires_in_seconds=300)
        response = await client.post(
            "/api/v1/cases/CASE-2026-001/entity-decisions",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "clusterId": "ENT-02",
                "mentionId": "M-VIKRAM-WA",
                "decision": "ACCEPT",
                "notes": "Verified alias matching via shared phone and VPA stem.",
                "officerId": "IO-409",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["decision"] == "ACCEPT"
        assert data["auditEventId"].startswith("AUD-")
        assert len(data["sha256Hash"]) == 64
