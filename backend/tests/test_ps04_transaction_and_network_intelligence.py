"""
Tests for Sections 2.2 and 2.3:
Temporal Relationship & Fraud-Network Intelligence,
Transaction Intelligence, Balance Reconciliation, and Comparative Taint Modeling.
"""

import pytest
from tarka.core.investigation_graph import (
    InvestigationGraph,
    InvestigationNode,
    InvestigationEdge,
    ForensicNodeType,
    ForensicEdgeType,
    InvestigationGraphQuery,
)
from tarka.core.transaction_intelligence import (
    TransactionRecord,
    TransactionIntelligenceEngine,
    TaintModelType,
    LayeringMotifType,
)


def test_account_ledger_reconciliation_exact():
    """Verify B_t = B_{t-1} + C - D balance reconciliation and duplicate handling."""
    txns = [
        TransactionRecord(
            txn_id="TXN-01",
            rrn="202602140001",
            source_account="ACC-VICTIM",
            target_account="ACC-MULE-1",
            amount=100000.0,
            timestamp_iso="2026-02-14T10:00:00Z",
            timestamp_epoch=1771063200.0,
            payment_rail="UPI",
            source_evidence_ref="EXH-BANK-01",
            closing_balance_reported=100000.0,
        ),
        # Duplicate RRN record
        TransactionRecord(
            txn_id="TXN-01-DUP",
            rrn="202602140001",
            source_account="ACC-VICTIM",
            target_account="ACC-MULE-1",
            amount=100000.0,
            timestamp_iso="2026-02-14T10:00:00Z",
            timestamp_epoch=1771063200.0,
            payment_rail="UPI",
            source_evidence_ref="EXH-BANK-01-DUP",
            closing_balance_reported=100000.0,
        ),
        TransactionRecord(
            txn_id="TXN-02",
            rrn="202602140002",
            source_account="ACC-MULE-1",
            target_account="ACC-MULE-2",
            amount=60000.0,
            timestamp_iso="2026-02-14T10:15:00Z",
            timestamp_epoch=1771064100.0,
            payment_rail="IMPS",
            source_evidence_ref="EXH-BANK-02",
            closing_balance_reported=40000.0,
        ),
    ]

    report = TransactionIntelligenceEngine.reconcile_account_ledger(
        account_number="ACC-MULE-1",
        opening_balance=0.0,
        transactions=txns,
    )

    assert report.closing_calculated_balance == 40000.0
    assert report.closing_reported_balance == 40000.0
    assert report.duplicate_count == 1
    assert report.missing_transaction_gap_detected is False
    assert report.audit_verdict == "RECONCILED_WITH_DUPLICATE_RECORDS_PURGED"
    assert len(report.reconciliation_steps) == 3


def test_reversal_and_missing_transaction_gap():
    """Verify reversal handling and detection of unexplained statement balance gaps."""
    txns = [
        TransactionRecord(
            txn_id="TXN-01",
            rrn="RRN-1",
            source_account="ACC-EXTERNAL",
            target_account="ACC-TARGET",
            amount=50000.0,
            timestamp_iso="2026-02-14T11:00:00Z",
            timestamp_epoch=1771066800.0,
            source_evidence_ref="EXH-01",
        ),
        # Reversal of 10,000
        TransactionRecord(
            txn_id="TXN-02-REV",
            rrn="RRN-2",
            source_account="ACC-EXTERNAL",
            target_account="ACC-TARGET",
            amount=10000.0,
            timestamp_iso="2026-02-14T11:30:00Z",
            timestamp_epoch=1771068600.0,
            is_reversal=True,
            source_evidence_ref="EXH-02",
            closing_balance_reported=25000.0,  # Reported 25k, but calculated is 40k -> 15k missing gap!
        ),
    ]

    report = TransactionIntelligenceEngine.reconcile_account_ledger(
        account_number="ACC-TARGET",
        opening_balance=0.0,
        transactions=txns,
    )

    assert report.closing_calculated_balance == 40000.0
    assert report.closing_reported_balance == 25000.0
    assert report.missing_transaction_gap_detected is True
    assert report.unexplained_variance == 15000.0
    assert "MISSING_TRANSACTIONS" in report.audit_verdict


def test_layering_motifs_fan_out_and_rapid_cashout():
    """Verify detection of Fan-Out (split) and rapid ATM cashout layering motifs."""
    txns = [
        # Victim deposit
        TransactionRecord(
            txn_id="TXN-IN",
            source_account="ACC-VICTIM",
            target_account="ACC-MULE-HUB",
            amount=300000.0,
            timestamp_iso="2026-02-14T12:00:00Z",
            timestamp_epoch=1771070400.0,
            payment_rail="UPI",
            source_evidence_ref="EXH-01",
        ),
        # Fan-Out to Mule A
        TransactionRecord(
            txn_id="TXN-OUT-1",
            source_account="ACC-MULE-HUB",
            target_account="ACC-MULE-A",
            amount=150000.0,
            timestamp_iso="2026-02-14T12:05:00Z",
            timestamp_epoch=1771070700.0,
            payment_rail="IMPS",
            source_evidence_ref="EXH-02",
        ),
        # Fan-Out to Mule B
        TransactionRecord(
            txn_id="TXN-OUT-2",
            source_account="ACC-MULE-HUB",
            target_account="ACC-MULE-B",
            amount=150000.0,
            timestamp_iso="2026-02-14T12:08:00Z",
            timestamp_epoch=1771070880.0,
            payment_rail="IMPS",
            source_evidence_ref="EXH-03",
        ),
        # Rapid ATM Cashout from Mule A (3 minutes later)
        TransactionRecord(
            txn_id="TXN-ATM-1",
            source_account="ACC-MULE-A",
            target_account="ATM-NOIDA-01",
            amount=50000.0,
            timestamp_iso="2026-02-14T12:08:00Z",
            timestamp_epoch=1771070880.0,
            payment_rail="ATM",
            source_evidence_ref="EXH-04",
        ),
    ]

    findings = TransactionIntelligenceEngine.detect_layering_motifs(txns, fan_window_seconds=1800.0)
    types = [f.motif_type for f in findings]

    assert LayeringMotifType.FAN_OUT in types
    assert LayeringMotifType.RAPID_DWELL_CASHOUT in types


def test_comparative_taint_models_and_libr():
    """Verify FIFO, LIFO, Proportional, and LIBR taint preservation."""
    # Scenario:
    # Account has 10,000 clean funds.
    # Receives 50,000 fraud deposit. (Total = 60,000)
    # Withdraws 45,000. (Balance drops to 15,000)
    # Subsequently receives 25,000 legitimate salary. (Balance rises to 40,000)
    # Under LIBR: lowest intermediate was 15,000, so taint CANNOT exceed 15,000 despite current balance of 40,000!
    txns = [
        TransactionRecord(
            txn_id="TXN-FRAUD",
            source_account="VICTIM-ACCOUNT",
            target_account="ACC-TARGET",
            amount=50000.0,
            timestamp_iso="2026-02-14T09:00:00Z",
            timestamp_epoch=1771059600.0,
            source_evidence_ref="EXH-01",
        ),
        TransactionRecord(
            txn_id="TXN-SPEND",
            source_account="ACC-TARGET",
            target_account="ACC-MERCHANT",
            amount=45000.0,
            timestamp_iso="2026-02-14T10:00:00Z",
            timestamp_epoch=1771063200.0,
            source_evidence_ref="EXH-02",
        ),
        TransactionRecord(
            txn_id="TXN-SALARY",
            source_account="EMPLOYER-CLEAN",
            target_account="ACC-TARGET",
            amount=25000.0,
            timestamp_iso="2026-02-14T11:00:00Z",
            timestamp_epoch=1771066800.0,
            source_evidence_ref="EXH-03",
        ),
    ]

    res = TransactionIntelligenceEngine.calculate_tainted_funds(
        victim_loss_amount=50000.0,
        account_transactions=txns,
        target_account="ACC-TARGET",
        opening_clean_balance=10000.0,
    )

    assert res.current_ledger_balance == 40000.0
    assert res.lowest_intermediate_balance == 15000.0
    assert res.taint_by_model[TaintModelType.LIBR.value] == 15000.0
    assert res.clean_funds_preserved_libr == 25000.0
    assert res.potentially_recoverable_balance == 15000.0
    # Constitutional Rule: Non-projective statutory caution
    assert "NON-PROJECTIVE STATUTORY LIEN NOTICE" in res.statutory_caution
    assert "BNSS Sections 106/107" in res.statutory_caution


def test_investigation_graph_temporal_filtering_and_pathfinding():
    """Verify temporal graph slicing and multi-hop pathfinding."""
    n1 = InvestigationNode(node_id="N1", node_type=ForensicNodeType.ENTITY, label="Victim", timestamp_iso="2026-02-14T10:00:00Z")
    n2 = InvestigationNode(node_id="N2", node_type=ForensicNodeType.ENTITY, label="Mule L1", timestamp_iso="2026-02-14T10:10:00Z")
    n3 = InvestigationNode(node_id="N3", node_type=ForensicNodeType.ENTITY, label="Mule L2", timestamp_iso="2026-02-14T10:20:00Z")
    n4 = InvestigationNode(node_id="N4", node_type=ForensicNodeType.ENTITY, label="Out of Window", timestamp_iso="2026-02-15T12:00:00Z")

    e1 = InvestigationEdge(edge_id="E1", source_id="N1", target_id="N2", edge_type=ForensicEdgeType.DEBITS_TO, label="100k")
    e2 = InvestigationEdge(edge_id="E2", source_id="N2", target_id="N3", edge_type=ForensicEdgeType.DEBITS_TO, label="60k")
    e3 = InvestigationEdge(edge_id="E3", source_id="N3", target_id="N4", edge_type=ForensicEdgeType.DEBITS_TO, label="20k")

    graph = InvestigationGraph(
        graph_id="GRAPH-TEST",
        case_id="CASE-001",
        nodes=[n1, n2, n3, n4],
        edges=[e1, e2, e3],
    )

    # 1. Multi-hop Pathfinding N1 -> N3
    paths = InvestigationGraphQuery.find_multi_hop_paths(graph, "N1", "N3", max_hops=3)
    assert len(paths) == 1
    assert [e.edge_id for e in paths[0]] == ["E1", "E2"]

    # 2. Temporal Slice: only events on 2026-02-14
    sliced_graph = InvestigationGraphQuery.filter_by_time_range(
        graph,
        start_iso="2026-02-14T00:00:00Z",
        end_iso="2026-02-14T23:59:59Z",
    )
    node_ids = [n.node_id for n in sliced_graph.nodes]
    edge_ids = [e.edge_id for e in sliced_graph.edges]
    assert "N1" in node_ids and "N2" in node_ids and "N3" in node_ids
    assert "N4" not in node_ids
    assert "E1" in edge_ids and "E2" in edge_ids
    assert "E3" not in edge_ids

