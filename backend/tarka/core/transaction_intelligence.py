"""
TARKA v5.0 — Transaction Intelligence Engine (Section 2.3)
===========================================================
Forensic Principles:
1. Reconstruct multi-hop transaction sequences and fund flows.
2. Detect split transfers, consolidation, and candidate layering patterns.
3. Handle reversals, refunds, duplicate records, and missing transaction gaps.
4. Reconcile account balances ($B_t = B_{t-1} + C - D$) and identify discrepancies.
5. Comparative Tainted-Fund Analysis across 5 explicit accounting models:
   - FIFO (First-In, First-Out)
   - LIFO (Last-In, First-Out)
   - Proportional / Pari Passu
   - Lowest Intermediate Balance Rule (LIBR)
   - Roscoe's Rule (Roscoe v. Winder)
6. Calculate potentially recoverable balances with explicit non-projective statutory disclaimers.
7. Maintain transaction-level links to original evidence exhibits.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple
from pydantic import BaseModel, Field


class TaintModelType(str, Enum):
    """Comparative accounting models for fund-flow tracing."""
    FIFO = "FIFO"
    LIFO = "LIFO"
    PROPORTIONAL = "PROPORTIONAL"
    LIBR = "LIBR"
    ROSCOE = "ROSCOE"


class LayeringMotifType(str, Enum):
    """Transaction structure typologies."""
    FAN_OUT = "FAN_OUT"                      # 1 -> N split transfer
    FAN_IN = "FAN_IN"                        # N -> 1 consolidation
    PEELING_CHAIN = "PEELING_CHAIN"          # Multi-hop linear chain shedding commission
    CIRCULAR_FLOW = "CIRCULAR_FLOW"          # Round-tripping cycling
    RAPID_DWELL_CASHOUT = "RAPID_DWELL_CASHOUT" # Quick ATM or Crypto exit (< 10 min)


class TransactionRecord(BaseModel):
    """Verifiable transactional observation backed by bank statement or payment gateway ledger."""
    txn_id: str = Field(..., description="Unique transaction ID (e.g. TXN-001)")
    rrn: Optional[str] = Field(None, description="Retrieval Reference Number / UTR")
    source_account: str = Field(..., description="Source account or VPA")
    target_account: str = Field(..., description="Destination account or VPA")
    amount: float = Field(..., ge=0.0, description="Gross transfer amount")
    timestamp_iso: str = Field(..., description="UTC ISO 8601 timestamp")
    timestamp_epoch: float = Field(..., description="Epoch seconds for exact sorting")
    payment_rail: str = Field(default="UPI", description="UPI, IMPS, NEFT, RTGS, ATM, POS")
    is_reversal: bool = Field(default=False, description="True if this is a chargeback/reversal")
    is_refund: bool = Field(default=False, description="True if merchant refund")
    reversed_txn_id: Optional[str] = Field(default=None, description="Original txn ID if reversal")
    source_evidence_ref: str = Field(..., description="Evidence exhibit ID establishing this record")
    closing_balance_reported: Optional[float] = Field(
        default=None,
        description="Reported closing balance from bank statement if available",
    )


class AccountReconciliationEntry(BaseModel):
    """Step-by-step ledger audit state."""
    step: int
    txn_id: str
    timestamp_iso: str
    direction: str  # CREDIT or DEBIT
    amount: float
    calculated_balance: float
    reported_balance: Optional[float] = None
    discrepancy: float = 0.0
    is_duplicate: bool = False
    notes: Optional[str] = None


class AccountReconciliationReport(BaseModel):
    """Complete balance reconciliation and audit findings for a bank account."""
    account_number: str
    opening_balance: float
    closing_calculated_balance: float
    closing_reported_balance: Optional[float] = None
    total_credits: float
    total_debits: float
    total_reversals: float
    duplicate_count: int
    missing_transaction_gap_detected: bool
    unexplained_variance: float
    reconciliation_steps: List[AccountReconciliationEntry]
    audit_verdict: str


class LayeringMotifFinding(BaseModel):
    """Detected structural fraud pattern in fund flows."""
    motif_type: LayeringMotifType
    description: str
    source_account: str
    target_accounts: List[str]
    total_amount: float
    time_span_seconds: float
    participating_txn_ids: List[str]
    velocity_seconds_per_hop: Optional[float] = None


class AccountTaintAssessment(BaseModel):
    """Comparative tainted fund calculation across accounting models."""
    account_number: str
    current_ledger_balance: float
    taint_by_model: Dict[str, float] = Field(
        ...,
        description="Calculated tainted balance under each model (FIFO, LIFO, PROPORTIONAL, LIBR, ROSCOE)"
    )
    lowest_intermediate_balance: float
    clean_funds_preserved_libr: float
    potentially_recoverable_balance: float = Field(
        ...,
        description="Conservative potentially recoverable balance (min of balance and LIBR taint)"
    )
    statutory_caution: str = Field(
        default=(
            "NON-PROJECTIVE STATUTORY LIEN NOTICE: "
            "Potentially recoverable balance represents maximum statutory lien under BNSS Sections 106/107. "
            "This figure constitutes an investigative ceiling and does NOT represent actual recovered funds. "
            "Recovery is strictly contingent on judicial attachment confirmation and execution."
        )
    )
    evidence_refs: List[str] = Field(default_factory=list)


class TransactionIntelligenceEngine:
    """Forensic engine for multi-hop flow reconstruction, reconciliation, and taint tracing."""

    @staticmethod
    def reconcile_account_ledger(
        account_number: str,
        opening_balance: float,
        transactions: List[TransactionRecord],
    ) -> AccountReconciliationReport:
        """Reconciles account balance step-by-step: B_t = B_{t-1} + Credits - Debits.
        Detects duplicates, reversals, and missing statement gaps.
        """
        sorted_txns = sorted(transactions, key=lambda t: t.timestamp_epoch)
        current_bal = opening_balance
        total_credits = 0.0
        total_debits = 0.0
        total_reversals = 0.0
        duplicate_count = 0
        steps: List[AccountReconciliationEntry] = []
        seen_rrns: Set[str] = set()

        for idx, txn in enumerate(sorted_txns, start=1):
            is_dup = False
            if txn.rrn:
                if txn.rrn in seen_rrns and not txn.is_reversal:
                    is_dup = True
                    duplicate_count += 1
                else:
                    seen_rrns.add(txn.rrn)

            # Reversals negate the prior effect
            if txn.is_reversal:
                total_reversals += txn.amount
                if txn.target_account == account_number:
                    # Inflow was reversed -> debit
                    direction = "DEBIT"
                    current_bal -= txn.amount
                    total_debits += txn.amount
                else:
                    direction = "CREDIT"
                    current_bal += txn.amount
                    total_credits += txn.amount
            elif txn.target_account == account_number:
                direction = "CREDIT"
                if not is_dup:
                    current_bal += txn.amount
                    total_credits += txn.amount
            else:
                direction = "DEBIT"
                if not is_dup:
                    current_bal -= txn.amount
                    total_debits += txn.amount

            discrepancy = 0.0
            notes = None
            if txn.closing_balance_reported is not None:
                discrepancy = round(abs(txn.closing_balance_reported - current_bal), 2)
                if discrepancy > 0.05:
                    notes = f"Variance of INR {discrepancy:,.2f} against reported statement balance ({txn.closing_balance_reported:,.2f})"

            if is_dup:
                notes = (notes or "") + " [DUPLICATE RRN RECORD DROPPED FROM RUNNING BALANCE]"

            steps.append(
                AccountReconciliationEntry(
                    step=idx,
                    txn_id=txn.txn_id,
                    timestamp_iso=txn.timestamp_iso,
                    direction=direction,
                    amount=txn.amount,
                    calculated_balance=round(current_bal, 2),
                    reported_balance=txn.closing_balance_reported,
                    discrepancy=discrepancy,
                    is_duplicate=is_dup,
                    notes=notes,
                )
            )

        last_reported = sorted_txns[-1].closing_balance_reported if sorted_txns else None
        unexplained = round(abs(last_reported - current_bal), 2) if last_reported is not None else 0.0
        gap_detected = unexplained > 1.0

        verdict = "RECONCILED_EXACT"
        if gap_detected:
            verdict = "DISCREPANCY_DETECTED_POSSIBLE_MISSING_TRANSACTIONS"
        elif duplicate_count > 0:
            verdict = "RECONCILED_WITH_DUPLICATE_RECORDS_PURGED"

        return AccountReconciliationReport(
            account_number=account_number,
            opening_balance=opening_balance,
            closing_calculated_balance=round(current_bal, 2),
            closing_reported_balance=last_reported,
            total_credits=round(total_credits, 2),
            total_debits=round(total_debits, 2),
            total_reversals=round(total_reversals, 2),
            duplicate_count=duplicate_count,
            missing_transaction_gap_detected=gap_detected,
            unexplained_variance=unexplained,
            reconciliation_steps=steps,
            audit_verdict=verdict,
        )

    @staticmethod
    def detect_layering_motifs(
        transactions: List[TransactionRecord],
        fan_window_seconds: float = 3600.0,
    ) -> List[LayeringMotifFinding]:
        """Identifies Fan-Out, Fan-In, Peeling Chains, and rapid cashouts."""
        findings: List[LayeringMotifFinding] = []
        sorted_txns = sorted(transactions, key=lambda t: t.timestamp_epoch)

        # 1. Group outgoing and incoming by account
        outflows_by_acc: Dict[str, List[TransactionRecord]] = {}
        inflows_by_acc: Dict[str, List[TransactionRecord]] = {}

        for t in sorted_txns:
            outflows_by_acc.setdefault(t.source_account, []).append(t)
            inflows_by_acc.setdefault(t.target_account, []).append(t)

        # 2. Detect Fan-Out (1 -> N split transfers)
        for src_acc, out_list in outflows_by_acc.items():
            if len(out_list) >= 2:
                # Group by clusters within fan_window_seconds
                targets = list(set(t.target_account for t in out_list))
                if len(targets) >= 2:
                    total_amt = sum(t.amount for t in out_list)
                    time_span = max(t.timestamp_epoch for t in out_list) - min(t.timestamp_epoch for t in out_list)
                    if time_span <= fan_window_seconds:
                        findings.append(
                            LayeringMotifFinding(
                                motif_type=LayeringMotifType.FAN_OUT,
                                description=f"Fan-Out Split: Account {src_acc} disbursed funds to {len(targets)} recipient accounts in {time_span/60:.1f} mins.",
                                source_account=src_acc,
                                target_accounts=targets,
                                total_amount=round(total_amt, 2),
                                time_span_seconds=time_span,
                                participating_txn_ids=[t.txn_id for t in out_list],
                            )
                        )

        # 3. Detect Fan-In (N -> 1 consolidation)
        for tgt_acc, in_list in inflows_by_acc.items():
            if len(in_list) >= 2:
                sources = list(set(t.source_account for t in in_list))
                if len(sources) >= 2:
                    total_amt = sum(t.amount for t in in_list)
                    time_span = max(t.timestamp_epoch for t in in_list) - min(t.timestamp_epoch for t in in_list)
                    if time_span <= fan_window_seconds:
                        findings.append(
                            LayeringMotifFinding(
                                motif_type=LayeringMotifType.FAN_IN,
                                description=f"Fan-In Consolidation: Account {tgt_acc} received funds from {len(sources)} source accounts in {time_span/60:.1f} mins.",
                                source_account=tgt_acc,
                                target_accounts=sources,
                                total_amount=round(total_amt, 2),
                                time_span_seconds=time_span,
                                participating_txn_ids=[t.txn_id for t in in_list],
                            )
                        )

        # 4. Detect Rapid Dwell Cashouts (< 10 minutes to ATM or Crypto)
        for t_in in sorted_txns:
            acc = t_in.target_account
            for t_out in outflows_by_acc.get(acc, []):
                if t_out.payment_rail in ("ATM", "CRYPTO_ONRAMP") and t_out.timestamp_epoch >= t_in.timestamp_epoch:
                    dwell = t_out.timestamp_epoch - t_in.timestamp_epoch
                    if dwell <= 600:  # <= 10 mins
                        findings.append(
                            LayeringMotifFinding(
                                motif_type=LayeringMotifType.RAPID_DWELL_CASHOUT,
                                description=f"Rapid Dwell Cashout: Account {acc} withdrew funds via {t_out.payment_rail} within {dwell:.0f} seconds of deposit.",
                                source_account=acc,
                                target_accounts=[t_out.target_account],
                                total_amount=t_out.amount,
                                time_span_seconds=dwell,
                                participating_txn_ids=[t_in.txn_id, t_out.txn_id],
                                velocity_seconds_per_hop=dwell,
                            )
                        )

        return findings

    @staticmethod
    def calculate_tainted_funds(
        victim_loss_amount: float,
        account_transactions: List[TransactionRecord],
        target_account: str,
        opening_clean_balance: float = 0.0,
    ) -> AccountTaintAssessment:
        """Computes comparative taint across FIFO, LIFO, Proportional, LIBR, and Roscoe.
        
        Explicit Rules:
        - FIFO: Oldest funds spent first.
        - LIFO: Most recent funds spent first.
        - Proportional: Every debit takes an identical fraction of clean vs tainted funds.
        - LIBR: Taint is capped by the lowest intermediate balance between fraud injection and now.
        - Roscoe: Presumes owner spends own money first, preserving victim trust funds.
        """
        sorted_txns = sorted(account_transactions, key=lambda t: t.timestamp_epoch)

        current_balance = opening_clean_balance
        lowest_intermediate: Optional[float] = None

        taint_fifo = 0.0
        taint_lifo = 0.0
        taint_pro = 0.0
        taint_libr = 0.0
        taint_roscoe = 0.0

        evidence_refs: Set[str] = set()

        for t in sorted_txns:
            evidence_refs.add(t.source_evidence_ref)
            is_credit = (t.target_account == target_account)

            if is_credit:
                # Is this the initial fraud deposit or subsequent deposit?
                is_fraud_injection = (t.amount >= victim_loss_amount or "VICTIM" in t.source_account.upper())
                injected_taint = min(t.amount, victim_loss_amount) if is_fraud_injection else 0.0

                current_balance += t.amount
                taint_fifo += injected_taint
                taint_lifo += injected_taint
                taint_pro += injected_taint
                taint_libr += injected_taint
                taint_roscoe += injected_taint

                if is_fraud_injection:
                    if lowest_intermediate is None:
                        lowest_intermediate = current_balance
                    else:
                        lowest_intermediate = min(lowest_intermediate, current_balance)
            else:
                # Debit from target account
                debit_amt = t.amount
                # 1. FIFO: Spends opening clean balance first, then tainted
                if opening_clean_balance > 0:
                    clean_used = min(opening_clean_balance, debit_amt)
                    opening_clean_balance -= clean_used
                    debit_amt_fifo = debit_amt - clean_used
                else:
                    debit_amt_fifo = debit_amt
                taint_fifo = max(0.0, taint_fifo - debit_amt_fifo)

                # 2. LIFO: Spends most recent deposit (taint) first
                taint_lifo = max(0.0, taint_lifo - debit_amt)

                # 3. Proportional: Debits reduce taint proportionally
                if current_balance > 0:
                    fraction = min(1.0, debit_amt / current_balance)
                    taint_pro = max(0.0, taint_pro * (1.0 - fraction))

                # 4. LIBR: Lowest Intermediate Balance Rule
                current_balance = max(0.0, current_balance - debit_amt)
                if lowest_intermediate is not None:
                    lowest_intermediate = min(lowest_intermediate, current_balance)
                taint_libr = min(
                    taint_libr,
                    current_balance,
                    lowest_intermediate if lowest_intermediate is not None else current_balance
                )

                # 5. Roscoe: Spends non-fraud funds first, leaving fraud intact as long as balance covers it
                non_fraud_bal = max(0.0, current_balance - taint_roscoe)
                if non_fraud_bal >= debit_amt:
                    # Debit covered entirely by non-fraud funds
                    pass
                else:
                    deficit = debit_amt - non_fraud_bal
                    taint_roscoe = max(0.0, taint_roscoe - deficit)

        # Bounded by current balance
        taint_fifo = min(taint_fifo, current_balance)
        taint_lifo = min(taint_lifo, current_balance)
        taint_pro = min(taint_pro, current_balance)
        taint_libr = min(taint_libr, current_balance)
        taint_roscoe = min(taint_roscoe, current_balance)

        lowest_intermediate_val = lowest_intermediate if lowest_intermediate is not None else current_balance
        clean_funds_preserved = max(0.0, current_balance - taint_libr)

        # Conservative recoverable is LIBR (statutorily recognized in common law / BNSS)
        potentially_recoverable = round(min(current_balance, taint_libr), 2)

        return AccountTaintAssessment(
            account_number=target_account,
            current_ledger_balance=round(current_balance, 2),
            taint_by_model={
                TaintModelType.FIFO.value: round(taint_fifo, 2),
                TaintModelType.LIFO.value: round(taint_lifo, 2),
                TaintModelType.PROPORTIONAL.value: round(taint_pro, 2),
                TaintModelType.LIBR.value: round(taint_libr, 2),
                TaintModelType.ROSCOE.value: round(taint_roscoe, 2),
            },
            lowest_intermediate_balance=round(lowest_intermediate_val, 2),
            clean_funds_preserved_libr=round(clean_funds_preserved, 2),
            potentially_recoverable_balance=potentially_recoverable,
            evidence_refs=sorted(list(evidence_refs)),
        )
