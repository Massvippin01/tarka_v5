from __future__ import annotations

from typing import Any, Dict, List, Optional
from app.domain.epistemic import Hypothesis
from app.repositories.unified_store import UnifiedStore


class HypothesisService:
    def __init__(self, store: Optional[UnifiedStore] = None):
        self.store = store or UnifiedStore.get_instance()

    def get_competing_hypotheses(self, case_id: str) -> List[Dict[str, Any]]:
        h1 = {
            "hypothesis_id": "HYP-001",
            "case_id": case_id,
            "code": "H1",
            "title": "Coordinated Criminal Syndicate",
            "description": "Vikram Singh (P001) and Rahul Verma (P044) operate a joint multi-state phishing & money laundering ring.",
            "confidence": 0.89,
            "status": "PRIMARY_HYPOTHESIS",
            "supporting_evidence": [
                {"id": "CDR001", "description": "340-second direct CDR call log between PH001 and PH002", "weight": 0.35},
                {"id": "TXN001", "description": "₹1,25,000 direct UPI transfer from SBI ACC992 to HDFC ACC481", "weight": 0.40},
                {"id": "EV-2026-101", "description": "Encrypted WhatsApp chat logs extracted from forensic phone dump", "weight": 0.25},
            ],
            "contradicting_evidence": [
                {"id": "CONTR-001", "description": "Cell tower location mismatch: P001 tower ping vs ANPR toll sighting at 09:38", "impact": "HIGH"},
            ],
            "neutral_evidence": [
                {"id": "VAHAN-V188", "description": "Hyundai Creta DL-01-AB-1888 ownership record"},
            ],
            "unknown_evidence": [
                {"id": "GAP-001", "description": "Unverified subscriber identity for Phone PH002"},
            ],
        }

        h2 = {
            "hypothesis_id": "HYP-002",
            "case_id": case_id,
            "code": "H2",
            "title": "Independent Money Mule Intermediary",
            "description": "Rahul Verma (P044) acted solely as an unwitting money mule without direct operational coordination.",
            "confidence": 0.45,
            "status": "ALTERNATIVE_HYPOTHESIS",
            "supporting_evidence": [
                {"id": "TXN001", "description": "Single high-value UPI transaction transfer to account ACC481", "weight": 0.60},
            ],
            "contradicting_evidence": [
                {"id": "EV-2026-101", "description": "Direct chat logs discussing commission splitting found on phone dump", "impact": "CRITICAL"},
            ],
            "neutral_evidence": [],
            "unknown_evidence": [],
        }

        h3 = {
            "hypothesis_id": "HYP-003",
            "case_id": case_id,
            "code": "H3",
            "title": "Shared Device Used by Unidentified Third Party",
            "description": "Phone PH002 was operated by an unidentified accomplice during the commission of the fraud.",
            "confidence": 0.30,
            "status": "ALTERNATIVE_HYPOTHESIS",
            "supporting_evidence": [
                {"id": "GAP-001", "description": "Lack of official CAF / biometric verification for subscriber PH002", "weight": 0.50},
            ],
            "contradicting_evidence": [
                {"id": "CDR001", "description": "Repeated call frequency over 30-day historical window", "impact": "HIGH"},
            ],
            "neutral_evidence": [],
            "unknown_evidence": [],
        }

        return [h1, h2, h3]
