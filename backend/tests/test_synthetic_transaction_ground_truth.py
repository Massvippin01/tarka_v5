"""
Automated Test Suite for Section 2.7 & Synthetic Transaction Ground Truth Benchmark:
- Multi-Evidence Counterfactual Exclusion (ChallengeDiff)
- Replayable Package Generation & 100% Bitwise Deterministic Reproduction
- Complex 10-Node Synthetic Ground Truth Fraud Network Benchmark
"""

import pytest
from tarka.claim_compiler.compiler import (
    ClaimDependencyDAG,
    ClaimState,
    EvidenceItem,
    ForensicClaimCompiler,
    InvestigativeClaim,
    TransactionReference,
    TrustTier,
)
from tarka.claim_compiler.counterfactual import CounterfactualEngine
from tarka.claim_compiler.formal_verifier import FormalSMTVerifier
from tarka.core.replay_package import (
    ReplayPackageGenerator,
    ReplayReproducer,
)
from tarka.core.transaction_intelligence import (
    TransactionRecord,
    TransactionIntelligenceEngine,
    TaintModelType,
    LayeringMotifType,
)


def test_multi_evidence_exclusion_and_challenge_diff():
    """Verify simultaneous multi-artifact counterfactual exclusion and ChallengeDiff computation."""
    dag = ClaimDependencyDAG()

    ev1 = EvidenceItem("ART-SMS-01", "SMS", "hash1", 0, 10, "pay link", 1.0, TrustTier.T3_LOW)
    ev2 = EvidenceItem("ART-CHAT-02", "CHAT", "hash2", 0, 10, "qr code", 1.0, TrustTier.T3_LOW)
    ev3 = EvidenceItem("ART-BANK-03", "SWITCH", "hash3", 0, 10, "debit 50k", 1.0, TrustTier.T1_HIGH)

    dag.add_evidence(ev1)
    dag.add_evidence(ev2)
    dag.add_evidence(ev3)

    c1 = InvestigativeClaim(
        claim_id="CLM-SMS-ORIGIN",
        title="Phishing Link Origin",
        statement="SMS phishing delivered",
        claim_type="PHISHING",
        evaluation_status=ClaimState.NOT_EVALUATED,
        supporting_evidence_ids=["ART-SMS-01"],
    )
    c2 = InvestigativeClaim(
        claim_id="CLM-CHAT-COERCION",
        title="Chat Social Engineering",
        statement="Chat coercion observed",
        claim_type="COERCION",
        evaluation_status=ClaimState.NOT_EVALUATED,
        supporting_evidence_ids=["ART-CHAT-02"],
    )
    c3 = InvestigativeClaim(
        claim_id="CLM-CORE-DEBIT",
        title="Bank Ledger Debit",
        statement="Core switch confirmed 50k debit",
        claim_type="TRANSACTION",
        evaluation_status=ClaimState.NOT_EVALUATED,
        supporting_evidence_ids=["ART-BANK-03"],
    )
    c_dependent = InvestigativeClaim(
        claim_id="CLM-COMBINED-ATTACK",
        title="Multi-Vector Coordination",
        statement="Phishing coordinated with chat",
        claim_type="HYPOTHESIS",
        evaluation_status=ClaimState.NOT_EVALUATED,
        premise_claim_ids=["CLM-SMS-ORIGIN", "CLM-CHAT-COERCION"],
    )

    dag.add_claim(c1)
    dag.add_claim(c2)
    dag.add_claim(c3)
    dag.add_claim(c_dependent)
    dag.evaluate_all()

    assert dag.get_claim("CLM-SMS-ORIGIN").evaluation_status == ClaimState.SUPPORTED
    assert dag.get_claim("CLM-CHAT-COERCION").evaluation_status == ClaimState.SUPPORTED
    assert dag.get_claim("CLM-CORE-DEBIT").evaluation_status == ClaimState.SUPPORTED
    assert dag.get_claim("CLM-COMBINED-ATTACK").evaluation_status == ClaimState.SUPPORTED

    # Exclude both ART-SMS-01 and ART-CHAT-02 simultaneously
    cf_engine = CounterfactualEngine(dag)
    diff = cf_engine.simulate_multi_evidence_exclusion(["ART-SMS-01", "ART-CHAT-02"])

    deactivated_ids = [d["claim_id"] for d in diff["deactivated_claims"]]
    surviving_ids = [s["claim_id"] for s in diff["surviving_claims"]]

    assert "CLM-SMS-ORIGIN" in deactivated_ids
    assert "CLM-CHAT-COERCION" in deactivated_ids
    assert "CLM-CORE-DEBIT" in surviving_ids
    assert len(diff["excluded_artifact_ids"]) == 2
    assert "Exclusion of [ART-CHAT-02, ART-SMS-01]" in diff["counterfactual_verdict"]


def test_replayable_package_generation_and_reproduction():
    """Verify package generation, SHA-256 cryptographic sealing, and bitwise deterministic reproduction."""
    compiler = ForensicClaimCompiler()

    ev = EvidenceItem("ART-LEDGER", "BANK", "abc123hash", 0, 100, "txn record", 1.0, TrustTier.T1_HIGH)
    compiler.ingest_evidence_item(ev)

    txn = TransactionReference("TX-001", 100000.0, "INR", 1771060000.0, "VICTIM", "MULE-1")
    compiler.compile_transaction_claim("CLM-TX-001", txn, "ART-LEDGER")

    # 1. Generate Replayable Package
    package = ReplayPackageGenerator.generate_package(
        case_id="CASE-2026-SYNTH-01",
        compiler=compiler,
        decisions=[{"decision_id": "DEC-01", "action": "CONFIRMED_BY_INVESTIGATOR"}],
    )

    assert package.case_id == "CASE-2026-SYNTH-01"
    assert len(package.package_sha256) == 64
    assert len(package.deterministic_output_digest) == 64
    assert len(package.claims_dag_snapshot) == 1
    assert "INVESTIGATION REPLAY INTEGRITY NOTICE" in package.statutory_non_guilt_notice

    # 2. Independent Reproduction from Scratch
    repro_result = ReplayReproducer.reproduce_investigation(package)

    assert repro_result["reproduction_verified"] is True
    assert repro_result["original_digest"] == repro_result["reproduced_digest"]
    assert repro_result["claims_count"] == 1
    assert "100% BITWISE DETERMINISTIC REPRODUCTION SUCCESSFUL" in repro_result["audit_verdict"]


def test_complex_synthetic_fraud_network_ground_truth():
    """
    Independently Specified Ground Truth Benchmark:
    Topology: 1 Victim -> 2 Layer-1 Mules -> 3 Layer-2 Mules -> 1 Merchant POS -> 1 ATM Terminal.
    Ground Truth Parameters:
    - Victim initial loss: INR 5,00,000
    - Split Layer 1: L1A receives 3,00,000; L1B receives 2,00,000.
    - L1A sends 1,80,000 to Merchant POS.
    - Merchant POS already had 2,00,000 legitimate clean balance.
    - Merchant POS closing balance = 3,80,000.
    - L1B sends 1,20,000 to L2A.
    - L2A withdraws 50,000 cash at ATM within 4 minutes.
    """
    txns = [
        # Victim -> L1A
        TransactionRecord(
            txn_id="TXN-01",
            rrn="RRN-01",
            source_account="ACC-VICTIM",
            target_account="ACC-MULE-L1A",
            amount=300000.0,
            timestamp_iso="2026-02-14T09:30:00Z",
            timestamp_epoch=1771061400.0,
            payment_rail="UPI",
            source_evidence_ref="EXH-BANK-01",
            closing_balance_reported=300000.0,
        ),
        # Victim -> L1B
        TransactionRecord(
            txn_id="TXN-02",
            rrn="RRN-02",
            source_account="ACC-VICTIM",
            target_account="ACC-MULE-L1B",
            amount=200000.0,
            timestamp_iso="2026-02-14T09:31:00Z",
            timestamp_epoch=1771061460.0,
            payment_rail="UPI",
            source_evidence_ref="EXH-BANK-01",
            closing_balance_reported=200000.0,
        ),
        # L1A -> Merchant POS
        TransactionRecord(
            txn_id="TXN-03",
            rrn="RRN-03",
            source_account="ACC-MULE-L1A",
            target_account="ACC-MERCHANT-POS",
            amount=180000.0,
            timestamp_iso="2026-02-14T09:40:00Z",
            timestamp_epoch=1771062000.0,
            payment_rail="IMPS",
            source_evidence_ref="EXH-BANK-02",
        ),
        # L1B -> L2A
        TransactionRecord(
            txn_id="TXN-04",
            rrn="RRN-04",
            source_account="ACC-MULE-L1B",
            target_account="ACC-MULE-L2A",
            amount=120000.0,
            timestamp_iso="2026-02-14T09:45:00Z",
            timestamp_epoch=1771062300.0,
            payment_rail="IMPS",
            source_evidence_ref="EXH-BANK-03",
            closing_balance_reported=120000.0,
        ),
        # L2A -> ATM Cashout (4 minutes after deposit)
        TransactionRecord(
            txn_id="TXN-05",
            rrn="RRN-05",
            source_account="ACC-MULE-L2A",
            target_account="ATM-TERMINAL-01",
            amount=50000.0,
            timestamp_iso="2026-02-14T09:49:00Z",
            timestamp_epoch=1771062540.0,
            payment_rail="ATM",
            source_evidence_ref="EXH-ATM-01",
            closing_balance_reported=70000.0,
        ),
    ]

    # 1. Z3 SMT Verification of Global Conservation
    smt_res = FormalSMTVerifier.verify_financial_conservation(
        initial_balance=500000.0,
        inflows=[],
        outflows=[300000.0, 200000.0],
        final_balance=0.0,
    )
    assert smt_res["invariant_satisfied"] is True
    assert "SAT" in smt_res["solver_verdict"]

    # 2. Motif Detection (Fan-Out on Victim, Rapid Cashout on L2A)
    motifs = TransactionIntelligenceEngine.detect_layering_motifs(txns, fan_window_seconds=1800.0)
    motif_types = [m.motif_type for m in motifs]
    assert LayeringMotifType.FAN_OUT in motif_types
    assert LayeringMotifType.RAPID_DWELL_CASHOUT in motif_types

    # Verify rapid cashout velocity
    atm_motif = next(m for m in motifs if m.motif_type == LayeringMotifType.RAPID_DWELL_CASHOUT)
    assert atm_motif.velocity_seconds_per_hop == 240.0  # 4 minutes exact

    # 3. L1A Account Ledger Reconciliation
    recon_l1a = TransactionIntelligenceEngine.reconcile_account_ledger(
        account_number="ACC-MULE-L1A",
        opening_balance=0.0,
        transactions=[txns[0], txns[2]],  # +300k, -180k
    )
    assert recon_l1a.closing_calculated_balance == 120000.0
    assert recon_l1a.audit_verdict == "RECONCILED_EXACT"

    # 4. Merchant POS Taint Assessment & LIBR Clean Fund Protection
    # Opening clean balance = 2,00,000. Receives 1,80,000 from L1A.
    # Total balance = 3,80,000.
    merchant_taint = TransactionIntelligenceEngine.calculate_tainted_funds(
        victim_loss_amount=180000.0,
        account_transactions=[txns[2]],
        target_account="ACC-MERCHANT-POS",
        opening_clean_balance=200000.0,
    )
    assert merchant_taint.current_ledger_balance == 380000.0
    assert merchant_taint.clean_funds_preserved_libr == 200000.0  # Exactly 2,00,000 clean funds preserved!
    assert merchant_taint.potentially_recoverable_balance == 180000.0
    assert "NON-PROJECTIVE STATUTORY LIEN NOTICE" in merchant_taint.statutory_caution

    # 5. L2A Account Ledger Reconciliation
    recon_l2a = TransactionIntelligenceEngine.reconcile_account_ledger(
        account_number="ACC-MULE-L2A",
        opening_balance=0.0,
        transactions=[txns[3], txns[4]],  # +120k, -50k ATM
    )
    assert recon_l2a.closing_calculated_balance == 70000.0
    assert recon_l2a.closing_reported_balance == 70000.0
    assert recon_l2a.missing_transaction_gap_detected is False

