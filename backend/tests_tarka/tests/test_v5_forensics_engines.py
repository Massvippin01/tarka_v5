"""
TARKA v5.0 — Comprehensive Forensic Engines Test Suite
======================================================
Verifies:
1. Intake Running-Balance Invariant & Same-Second Permutations
2. Multi-Rail RRN/UTR Reference Decoding
3. PDF Structural Tamper & CGNAT Merkle Shield
4. CGNAT Candidate Intersection Funnel (340 -> 41 -> 6 -> 1)
5. Dual-SIM IMEI Luhn Check & Wi-Fi Hotspot TTL Collision
6. Taint Accounting (LIBR vs FIFO vs Pro-Rata) & Dinic Min-Cut
7. Leave-One-Out Defense Admissibility & BSA 63(4) Split Schedules
"""

import pytest
from tarka.core.intake_falsifier import (
    validate_running_balance,
    decode_rail_reference,
    analyze_pdf_structural_tamper,
    build_cgnat_merkle_shield,
    LedgerRowInput,
)
from tarka.core.cgnat_attribution import (
    solve_cgnat_funnel,
    validate_imei_luhn,
    analyze_dual_sim_hardware,
    detect_hotspot_collision,
    MuleSessionInput,
)
from tarka.core.taint_lien_engine import compute_taint_and_mincut
from tarka.core.court_proof_bundle import (
    evaluate_leave_one_out,
    generate_bsa63_split_schedules,
    get_paper_anchor,
    get_cbi_syndicate_memo,
    CaseArtifactInput,
)


def test_intake_running_balance_conservation():
    # Pristine rows: Balance[k] = Balance[k-1] + Credit[k] - Debit[k]
    rows = [
        LedgerRowInput(id="r1", sequence_no=1, timestamp="2026-09-22 09:30:00", description="OPEN", balance=4210.0),
        LedgerRowInput(id="r2", sequence_no=2, timestamp="2026-09-22 10:35:00", description="UPI IN", credit=50000.0, balance=54210.0),
        LedgerRowInput(id="r3", sequence_no=3, timestamp="2026-09-22 10:35:00", description="IMPS OUT", debit=20000.0, balance=34210.0),
    ]
    res = validate_running_balance(rows, "ASC")
    assert res.is_valid is True
    assert res.discrepancy_delta == 0.0

    # Tampered row: Balance jump +100,000 (claimed screenshot)
    rows_tampered = [
        LedgerRowInput(id="r1", sequence_no=1, timestamp="2026-09-22 09:30:00", description="OPEN", balance=4210.0),
        LedgerRowInput(id="r2", sequence_no=2, timestamp="2026-09-22 10:35:00", description="UPI IN", credit=150000.0, balance=154210.0),
        LedgerRowInput(id="r3", sequence_no=3, timestamp="2026-09-22 10:35:00", description="IMPS OUT", debit=20000.0, balance=34210.0),
    ]
    res_tampered = validate_running_balance(rows_tampered, "ASC")
    assert res_tampered.is_valid is False
    assert res_tampered.discrepancy_delta > 0


def test_multi_rail_reference_decoder():
    # 1. Valid 12-digit UPI RRN: YDDDHHSSSSSS
    rrn_res = decode_rail_reference("202602149921", "2026-01-21T14:00:00")
    assert rrn_res.is_valid is True
    assert rrn_res.rail == "UPI"
    assert rrn_res.julian_day == 26
    assert rrn_res.hour == 2

    # 2. 22-character RTGS UTR
    rtgs_res = decode_rail_reference("SBINR52026092200123456")
    assert rtgs_res.is_valid is True
    assert rtgs_res.rail == "RTGS"
    assert rtgs_res.bank_code == "SBIN"

    # 3. 16-character NEFT UTR
    neft_res = decode_rail_reference("SBIN260922123456")
    assert neft_res.is_valid is True
    assert neft_res.rail == "NEFT"


def test_pdf_tamper_and_cgnat_merkle():
    pdf_res = analyze_pdf_structural_tamper(
        filename="sbi_statement.pdf",
        sha256="b198302ca876...",
        file_size_bytes=142800,
        eof_markers=2,
        has_overlaid_text=True
    )
    assert pdf_res.eof_marker_count == 2
    assert pdf_res.verdict == "FORGED_POST_SIGNING_INJECTION"
    assert len(pdf_res.tamper_findings) >= 2

    # CGNAT Merkle Shield
    subs = [
        {"msisdn": "9871123941", "private_ip": "10.0.0.1", "port": 49210, "is_suspect": True},
        {"msisdn": "9810044912", "private_ip": "10.0.0.2", "port": 49214, "is_suspect": False},
        {"msisdn": "9711890021", "private_ip": "10.0.0.3", "port": 49220, "is_suspect": False},
        {"msisdn": "9958012849", "private_ip": "10.0.0.4", "port": 49228, "is_suspect": False},
    ]
    merkle_res = build_cgnat_merkle_shield(subs)
    assert merkle_res.is_proof_valid is True
    assert len(merkle_res.inclusion_proof) == 2
    assert len(merkle_res.root_hash) == 64


def test_cgnat_funnel_intersection():
    sessions = [
        MuleSessionInput(
            session_id="S1",
            bank_name="SBI",
            login_time_utc="02:18:04 UTC",
            login_time_ist="07:48:04 IST",
            public_ip="103.21.144.92",
            tower_pool_count=340,
            active_subscriber_ids=["SUSPECT_A"] + [f"CAND_{i}" for i in range(339)]
        ),
        MuleSessionInput(
            session_id="S2",
            bank_name="HDFC",
            login_time_utc="02:21:19 UTC",
            login_time_ist="07:51:19 IST",
            public_ip="103.21.144.92",
            tower_pool_count=285,
            active_subscriber_ids=["SUSPECT_A"] + [f"CAND_{i}" for i in range(40)]
        ),
        MuleSessionInput(
            session_id="S3",
            bank_name="Axis",
            login_time_utc="02:24:51 UTC",
            login_time_ist="07:54:51 IST",
            public_ip="103.21.144.92",
            tower_pool_count=312,
            active_subscriber_ids=["SUSPECT_A"] + [f"CAND_{i}" for i in range(5)]
        ),
        MuleSessionInput(
            session_id="S4",
            bank_name="Paytm",
            login_time_utc="02:28:10 UTC",
            login_time_ist="07:58:10 IST",
            public_ip="103.21.144.92",
            tower_pool_count=198,
            active_subscriber_ids=["SUSPECT_A"]
        ),
    ]

    funnel = solve_cgnat_funnel(sessions, drop_source_port=False)
    assert funnel.final_candidate_count == 1
    assert funnel.attributed_subscriber_id == "SUSPECT_A"
    assert funnel.verdict == "UNIQUE_SINGLE_SUBSCRIBER_ATTRIBUTED"

    # With drop_source_port active:
    funnel_dropped = solve_cgnat_funnel(sessions, drop_source_port=True)
    assert funnel_dropped.final_candidate_count == 340
    assert funnel_dropped.verdict == "AMBIGUOUS_MULTI_CANDIDATE"


def test_dual_sim_luhn_and_hotspot():
    # 15-digit IMEI Luhn
    assert validate_imei_luhn("867492061234564") is True
    assert validate_imei_luhn("867492061234567") is False  # Invalid checksum

    dual = analyze_dual_sim_hardware("867492061234564", "867492061234572")
    assert dual.is_hardware_twin is True
    assert dual.tac1 == "86749206"
    assert dual.verdict == "HARDWARE_TWIN_CONFIRMED"

    # Hotspot TTL hop
    hotspot = detect_hotspot_collision(observed_ttl=63, expected_ttl=64)
    assert hotspot.is_hotspot_detected is True
    assert hotspot.ttl_hops_decremented == 1


def test_taint_libr_vs_fifo_and_mincut():
    # Concordant
    t_base = compute_taint_and_mincut(inject_merchant_clean_deposit=False, freeze_budget_k=3)
    assert t_base.summary.divergence_detected is False
    assert t_base.min_cut.is_freeze_complete is True

    # Divergence when merchant clean deposit is injected
    t_div = compute_taint_and_mincut(inject_merchant_clean_deposit=True, freeze_budget_k=3)
    assert t_div.summary.divergence_detected is True
    assert t_div.summary.clean_funds_protected_libr == 250000.0
    assert t_div.summary.libr_recoverable == 440000.0
    assert t_div.summary.fifo_recoverable == 400000.0

    # Incomplete freeze budget K=1
    t_leak = compute_taint_and_mincut(inject_merchant_clean_deposit=False, freeze_budget_k=1)
    assert t_leak.min_cut.is_freeze_complete is False
    assert t_leak.min_cut.verdict == "RESIDUAL_ESCAPE_PATH_DETECTED"


def test_court_proof_and_bsa63():
    loo = evaluate_leave_one_out(whatsapp_excluded=True)
    assert loo.proof_survives is True
    assert loo.confidence_score >= 90.0

    schedules = generate_bsa63_split_schedules("CASE-2026-001")
    assert schedules.pune_bar_compliant is True
    assert "SCHEDULE 'A'" in schedules.part_a_bank_nodal
    assert "SCHEDULE 'B'" in schedules.part_b_forensic_expert

    anchor = get_paper_anchor("CASE-2026-001")
    assert len(anchor.bip39_mnemonic) == 24

    cbi = get_cbi_syndicate_memo()
    assert cbi.total_loss_inr > 100000000
    assert len(cbi.states_involved) == 4
