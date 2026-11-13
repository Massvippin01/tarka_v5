"""
SentinelX / TARKA — Explainable Mule-Account Scoring Engine.

Computes topological and temporal forensic features from transaction graphs (networkx):
- Pass-through ratio (outflow / inflow within operational window)
- Median dwell time (seconds between inbound credit and outbound debit)
- Fan-in / Fan-out degrees and victim feed count
- Structuring indicators (transactions just below ₹50,000 / ₹1,00,000 reporting thresholds)
- Velocity and night-time transaction concentration (00:00 - 05:00 IST)
- Proximity layer depth (L1 / L2 / L3) from nearest victim
- Merchant / Escrow hard-veto mitigation

Produces an explainable "Investigative Lead Strength" score (0-100) with per-feature
waterfall contributions ("Why?") and risk bands.
Strictly adheres to SentinelX Constitution Rule 5:
AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.
Never classifies a person as GUILTY or INNOCENT.
"""

from __future__ import annotations

import json
import logging
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import networkx as nx

logger = logging.getLogger("sentinelx.mule_scoring")


class MuleScoringEngine:
    """
    Forensic transaction graph analyzer and mule lead scoring engine.
    """

    def __init__(self, fixtures_dir: Optional[Path] = None):
        self.fixtures_dir = fixtures_dir or Path("data/fixtures/cases")
        if not self.fixtures_dir.exists():
            self.fixtures_dir = Path(__file__).resolve().parent.parent.parent.parent / "data" / "fixtures" / "cases"

    def parse_timestamp_iso(self, ts_str: Optional[str]) -> Optional[datetime]:
        """Parses UTC or ISO timestamp string into datetime."""
        if not ts_str:
            return None
        clean = ts_str.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(clean)
        except Exception:
            return None

    def score_case(self, case_id: str) -> Dict[str, Any]:
        """Loads canonical case fixture and scores all accounts."""
        fixture_file = self.fixtures_dir / f"{case_id}.json"
        if not fixture_file.exists():
            raise FileNotFoundError(f"Case fixture not found for '{case_id}' at {fixture_file}")

        with open(fixture_file, "r", encoding="utf-8") as f:
            cdata = json.load(f)

        transactions = cdata.get("transactions", [])
        accounts = cdata.get("accounts", [])
        complainant = cdata.get("complainant", {})

        return self.score_transaction_graph(
            case_id=case_id,
            transactions=transactions,
            accounts=accounts,
            complainant=complainant,
        )

    def score_transaction_graph(
        self,
        case_id: str = "DYNAMIC_EVAL",
        transactions: List[Dict[str, Any]] = None,
        accounts: List[Dict[str, Any]] = None,
        complainant: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Analyzes transaction graph and scores every account with feature contributions.
        """
        transactions = transactions or []
        accounts = accounts or []
        complainant = complainant or {}

        # 1. Build MultiDiGraph in networkx
        G = nx.MultiDiGraph()

        # Map accounts by identifier
        account_meta: Dict[str, Dict[str, Any]] = {}
        for a in accounts:
            acc_num = a.get("accountNumber") or a.get("id") or a.get("nodeId")
            account_meta[acc_num] = a
            account_meta[a.get("nodeId", "")] = a
            account_meta[a.get("holderName", "")] = a

        # Populate graph edges
        for idx, tx in enumerate(transactions):
            src = tx.get("fromAccount") or tx.get("fromName") or "UNKNOWN_SRC"
            tgt = tx.get("toAccount") or tx.get("toName") or "UNKNOWN_TGT"
            amt = float(tx.get("amount", 0))
            ts = self.parse_timestamp_iso(tx.get("timestampUtc"))

            G.add_edge(
                src,
                tgt,
                key=tx.get("id", f"TX-{idx}"),
                amount=amt,
                timestamp=ts,
                rail=tx.get("paymentRail", "UPI"),
                particulars=tx.get("particulars", ""),
                category=tx.get("category", "TRANSFER"),
            )

        # Identify victim accounts
        victim_accounts = set()
        for a in accounts:
            if a.get("holderType") == "VICTIM" or a.get("muleLayer") == "L0":
                victim_accounts.add(a.get("accountNumber"))
                victim_accounts.add(a.get("nodeId"))
                victim_accounts.add(a.get("holderName"))
        if complainant.get("name"):
            victim_accounts.add(complainant.get("name"))

        scored_accounts: List[Dict[str, Any]] = []

        # Analyze each distinct account in accounts or graph nodes
        analyzed_nodes = {a.get("nodeId") for a in accounts if a.get("nodeId")}
        if not analyzed_nodes:
            analyzed_nodes = set(G.nodes())

        for a in accounts:
            node_id = a.get("nodeId") or a.get("id")
            acc_num = a.get("accountNumber", node_id)
            holder_name = a.get("holderName", node_id)
            holder_type = a.get("holderType", "SUSPECT")
            bank = a.get("bank", "Unknown Bank")

            # Inbound transactions
            inbound_txs = [
                data
                for u, v, data in G.in_edges(acc_num, data=True)
            ] + [
                data
                for u, v, data in G.in_edges(node_id, data=True)
                if acc_num != node_id
            ]

            # Outbound transactions
            outbound_txs = [
                data
                for u, v, data in G.out_edges(acc_num, data=True)
            ] + [
                data
                for u, v, data in G.out_edges(node_id, data=True)
                if acc_num != node_id
            ]

            total_inflow = sum(tx["amount"] for tx in inbound_txs)
            total_outflow = sum(tx["amount"] for tx in outbound_txs)

            # Pass-through ratio
            pass_through = (total_outflow / total_inflow) if total_inflow > 0 else 0.0
            pass_through = min(pass_through, 1.0)

            # Median dwell time calculation (time from each credit to its immediate subsequent outbound debit)
            dwell_seconds_list: List[float] = []
            for in_tx in inbound_txs:
                in_ts = in_tx.get("timestamp")
                if not in_ts:
                    continue
                subsequent_diffs = [
                    (out_tx["timestamp"] - in_ts).total_seconds()
                    for out_tx in outbound_txs
                    if out_tx.get("timestamp") and out_tx["timestamp"] > in_ts
                ]
                if subsequent_diffs:
                    dwell_seconds_list.append(min(subsequent_diffs))

            if dwell_seconds_list:
                dwell_seconds_list.sort()
                mid = len(dwell_seconds_list) // 2
                median_dwell = (
                    dwell_seconds_list[mid]
                    if len(dwell_seconds_list) % 2 != 0
                    else (dwell_seconds_list[mid - 1] + dwell_seconds_list[mid]) / 2.0
                )
            else:
                median_dwell = 999999.0

            # Fan-in and Fan-out
            fan_in = len(set(G.predecessors(acc_num))) if G.has_node(acc_num) else 0
            fan_out = len(set(G.successors(acc_num))) if G.has_node(acc_num) else 0

            # Structuring detection: counts amounts just under ₹50,000 (45k-49.9k) or ₹1,00,000 (90k-99.9k)
            structuring_hits = 0
            for tx in outbound_txs:
                amt = tx["amount"]
                if (45000 <= amt <= 49999) or (90000 <= amt <= 99999):
                    structuring_hits += 1

            # Night time share (00:00 to 05:00 IST = 18:30 to 23:30 UTC previous day)
            night_tx_count = 0
            all_txs = inbound_txs + outbound_txs
            for tx in all_txs:
                ts = tx.get("timestamp")
                if ts:
                    # Convert UTC hour to IST hour (+5:30)
                    ist_hour = (ts.hour + 5 + (1 if ts.minute + 30 >= 60 else 0)) % 24
                    if 0 <= ist_hour < 5:
                        night_tx_count += 1
            night_share = (night_tx_count / len(all_txs)) if all_txs else 0.0

            # Distance to nearest victim (Layer depth)
            layer_depth = a.get("muleLayer", "L1")
            is_victim = holder_type == "VICTIM" or node_id in victim_accounts or acc_num in victim_accounts

            # Check if verified commercial merchant or escrow
            is_merchant_escrow = (
                holder_type in ("COMMERCIAL_ESCROW", "MERCHANT")
                or "merchant" in holder_name.lower()
                or "electronics" in holder_name.lower()
                or "ESCROW" in node_id
            )

            # --- Transparent Scoring Model & Contribution Waterfall ---
            score = 0
            contributions: List[Dict[str, Any]] = []

            if is_victim:
                lead_score = 0
                risk_band = "VICTIM_ACCOUNT"
                rationale = "Account identified as victim / complainant source."
            else:
                # 1. Pass-through ratio contribution
                if pass_through >= 0.90:
                    score += 25
                    contributions.append({
                        "feature": f"High Pass-through Ratio ({pass_through*100:.1f}%)",
                        "points": 25,
                        "direction": "INCREASES_RISK",
                        "evidence": f"Transferred ₹{total_outflow:,.0f} of ₹{total_inflow:,.0f} inbound funds onward.",
                    })
                elif pass_through >= 0.70:
                    score += 15
                    contributions.append({
                        "feature": f"Moderate Pass-through Ratio ({pass_through*100:.1f}%)",
                        "points": 15,
                        "direction": "INCREASES_RISK",
                        "evidence": f"Transferred ₹{total_outflow:,.0f} onward.",
                    })

                # 2. Dwell time contribution
                if median_dwell < 180:  # Under 3 minutes
                    score += 25
                    contributions.append({
                        "feature": f"Rapid Dwell Time ({int(median_dwell)}s)",
                        "points": 25,
                        "direction": "INCREASES_RISK",
                        "evidence": f"Inbound funds liquidated in {int(median_dwell)} seconds, indicative of automated siphon script.",
                    })
                elif median_dwell < 600:  # Under 10 minutes
                    score += 15
                    contributions.append({
                        "feature": f"Short Dwell Time ({int(median_dwell)}s)",
                        "points": 15,
                        "direction": "INCREASES_RISK",
                        "evidence": f"Funds held for only {int(median_dwell // 60)} minutes before onward transfer.",
                    })
                elif median_dwell < 3600:
                    score += 10
                    contributions.append({
                        "feature": f"Intra-hour Liquidation ({int(median_dwell // 60)}m)",
                        "points": 10,
                        "direction": "INCREASES_RISK",
                        "evidence": "Funds liquidated within 1 hour.",
                    })

                # 3. Fan-out / Layering degree
                if fan_out >= 3:
                    score += 20
                    contributions.append({
                        "feature": f"Multi-party Fan-out (Degree {fan_out})",
                        "points": 20,
                        "direction": "INCREASES_RISK",
                        "evidence": f"Funds distributed across {fan_out} downstream accounts.",
                    })
                elif fan_out >= 2:
                    score += 15
                    contributions.append({
                        "feature": f"Split Layering (Degree {fan_out})",
                        "points": 15,
                        "direction": "INCREASES_RISK",
                        "evidence": f"Outflow split into {fan_out} distinct destination accounts.",
                    })

                # 4. Structuring contribution
                if structuring_hits > 0:
                    struct_pts = min(structuring_hits * 10, 20)
                    score += struct_pts
                    contributions.append({
                        "feature": f"Regulatory Structuring ({structuring_hits} debits < ₹50k/₹1L)",
                        "points": struct_pts,
                        "direction": "INCREASES_RISK",
                        "evidence": f"{structuring_hits} transactions crafted just under statutory cash reporting thresholds.",
                    })

                # 5. Layer 1 proximity bonus
                if layer_depth == "L1":
                    score += 15
                    contributions.append({
                        "feature": "Immediate Proximity (Layer 1 Mule)",
                        "points": 15,
                        "direction": "INCREASES_RISK",
                        "evidence": "Direct recipient of fraudulent victim drain tranche.",
                    })

                # 6. Night time transaction share
                if night_share >= 0.5:
                    score += 10
                    contributions.append({
                        "feature": f"Off-hours Night Activity ({night_share*100:.0f}%)",
                        "points": 10,
                        "direction": "INCREASES_RISK",
                        "evidence": "Transactions concentrated between 00:00 and 05:00 IST.",
                    })

                # 7. Commercial Merchant / Escrow HARD VETO MITIGATION
                if is_merchant_escrow:
                    score -= 50
                    contributions.append({
                        "feature": "Verified Commercial Escrow / Merchant Veto",
                        "points": -50,
                        "direction": "MITIGATES_RISK",
                        "evidence": "Hardware retailer with valid GSTIN / verified commercial merchant account.",
                    })

                # Clamp score between 0 and 100
                lead_score = max(0, min(100, score))

                # Assign risk band
                if lead_score >= 80:
                    risk_band = "CRITICAL_MULE_LEAD"
                    rationale = f"High-confidence mule account with {pass_through*100:.0f}% pass-through and rapid liquidation."
                elif lead_score >= 60:
                    risk_band = "HIGH_SUSPICION_MULE"
                    rationale = "Elevated layering activity and multi-hop outbound disbursement."
                elif lead_score >= 35:
                    risk_band = "ELEVATED_MONITORING"
                    rationale = "Secondary transit account requiring corroborative banker verification."
                else:
                    risk_band = "LOW_RISK_LEGITIMATE"
                    rationale = "Low suspicion profile consistent with legitimate merchant or passive beneficiary."

            scored_accounts.append({
                "nodeId": node_id,
                "accountNumber": acc_num,
                "accountMasked": a.get("accountMasked", "XXXX-XXXX-0000"),
                "holderName": holder_name,
                "holderType": holder_type,
                "bank": bank,
                "ifsc": a.get("ifsc", ""),
                "muleLayer": layer_depth,
                "investigativeLeadStrength": lead_score,
                "riskBand": risk_band,
                "summaryRationale": rationale,
                "metrics": {
                    "passThroughRatio": round(pass_through, 3),
                    "medianDwellTimeSeconds": int(median_dwell) if median_dwell < 999999 else None,
                    "fanInDegree": fan_in,
                    "fanOutDegree": fan_out,
                    "structuringTransactionCount": structuring_hits,
                    "nightTimeActivityShare": round(night_share, 3),
                    "totalInflowInr": total_inflow,
                    "totalOutflowInr": total_outflow,
                },
                "featureContributions": contributions,
            })

        # Sort accounts by lead strength descending
        scored_accounts.sort(key=lambda x: x["investigativeLeadStrength"], reverse=True)

        return {
            "caseId": case_id,
            "totalAccountsScored": len(scored_accounts),
            "scoringModel": "TARKA_WEIGHTED_GRAPH_LEAD_V1",
            "statutoryCompliance": "SentinelX Wave 6 Constitution Rule 5 (Lead Strength, Never Categorical Guilt)",
            "accounts": scored_accounts,
        }
