"""TARKA AI — Investigative Reasoner.

Synthesizes structured forensic proposals, BNSS §106 asset freeze requisitions,
and contradiction summaries under constitutional governance:
- AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.
- Strictly DATA_ONLY containment.
- Never output GUILTY or INNOCENT verdicts.
"""

from __future__ import annotations

import datetime
import decimal
import json
import logging
from typing import Any, Dict, List, Optional

from tarka.ai.adapters import BaseLLMAdapter, DeterministicRuleAdapter, LLMInferenceResult
from tarka.ai.prompt_defense import PromptFirewall

logger = logging.getLogger("tarka.ai.reasoner")


class InvestigativeReasoner:
    """Forensic proposal generator bounded by constitutional invariants."""

    def __init__(self, adapter: Optional[BaseLLMAdapter] = None):
        self.adapter = adapter or DeterministicRuleAdapter()

    async def draft_freeze_requisition(
        self,
        case_id: str,
        fir_number: str,
        io_name: str,
        suspect_account: str,
        ifsc_code: str,
        bank_name: str,
        inflow_amount_inr: float,
        utr_ref: str,
        evidence_sha256: str,
    ) -> Dict[str, Any]:
        """Synthesizes a legally grounded bank account freeze proposal under BNSS §106."""
        evidence_summary = (
            f"Case: {case_id} ({fir_number})\n"
            f"Target Account: {suspect_account} at {bank_name} (IFSC: {ifsc_code})\n"
            f"Direct Defrauded Inflow: INR {inflow_amount_inr:,.2f}\n"
            f"Transaction UTR: {utr_ref}\n"
            f"Verifying Evidence SHA-256: {evidence_sha256}\n"
        )

        task = (
            "Draft a formal asset freezing proposal under Section 106 of the Bharatiya "
            "Nagarik Suraksha Sanhita, 2023 (BNSS). "
            "Identify the specific lien amount to protect innocent commercial merchant turnover. "
            "Include evidence hash and statutory citation."
        )

        sys_p, usr_p, warnings = PromptFirewall.build_safe_investigative_prompt(task, evidence_summary)
        res = await self.adapter.complete(sys_p, usr_p, temperature=0.0)

        # Standard proposal envelope
        return {
            "proposal_id": f"PROP-FREEZE-{case_id}-{suspect_account[-4:]}",
            "case_id": case_id,
            "fir_number": fir_number,
            "statutory_basis": "Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS) Section 106",
            "io_name": io_name,
            "target_account": suspect_account,
            "ifsc_code": ifsc_code,
            "bank_name": bank_name,
            "recommended_action": "SPECIFIC_LIEN_FREEZE",
            "tainted_lien_amount_inr": inflow_amount_inr,
            "evidence_hash": evidence_sha256,
            "transaction_utr": utr_ref,
            "status": "AWAITING_INVESTIGATOR_CONFIRMATION",
            "model_metadata": {
                "model": res.model_name,
                "latency_ms": res.latency_ms,
                "warnings": warnings + res.defense_warnings,
            },
        }

    async def summarize_conduit_velocity(
        self,
        account_number: str,
        inflow_time_utc: str,
        outflow_time_utc: str,
        inflow_amount: float,
        outflow_amount: float,
    ) -> Dict[str, Any]:
        """Calculates and explains rapid pass-through conduit behavior in money mule accounts."""
        t1 = datetime.datetime.fromisoformat(inflow_time_utc.replace("Z", "+00:00"))
        t2 = datetime.datetime.fromisoformat(outflow_time_utc.replace("Z", "+00:00"))
        delta_seconds = int((t2 - t1).total_seconds())

        is_rapid = 0 <= delta_seconds <= 120
        ratio = (outflow_amount / inflow_amount) if inflow_amount > 0 else 0.0

        rationale = (
            f"Account received INR {inflow_amount:,.2f} and disbursed INR {outflow_amount:,.2f} "
            f"({ratio:.1%} of inflow) within {delta_seconds} seconds."
        )

        return {
            "account_number": account_number,
            "delta_seconds": delta_seconds,
            "inflow_inr": inflow_amount,
            "outflow_inr": outflow_amount,
            "pass_through_ratio": round(ratio, 4),
            "is_rapid_conduit": is_rapid,
            "investigative_rationale": rationale,
            "proposed_classification": "ACTIVE_MULE_CONDUIT" if is_rapid and ratio >= 0.85 else "SUSPECT_LAYER_ACCOUNT",
            "review_status": "PENDING_IO_CONFIRMATION",
        }

