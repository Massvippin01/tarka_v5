from __future__ import annotations

import json
from typing import Any, Dict, List, Tuple

from app.adapters.source_adapter import SourceAdapter
from app.domain.canonical_evidence_ir import (
    CorroborationLevel,
    EpistemicStatus,
    EvidenceArtifact,
    EvidenceFact,
    EvidenceObservation,
    EvidenceSourceType,
    SourceReliability,
)


class FinancialTransactionAdapter(SourceAdapter):
    """
    Adapter for Financial Transactions (Banking Ledgers, UPI, NEFT, IMPS).
    """

    def __init__(self):
        super().__init__(
            adapter_id="FINANCIAL_TRANSACTION_ADAPTER",
            adapter_version="2.0.0",
            source_type=EvidenceSourceType.FINANCIAL_TRANSACTION,
        )

    def identify(self, data: bytes, metadata: Dict[str, Any]) -> bool:
        if metadata.get("source_type") == EvidenceSourceType.FINANCIAL_TRANSACTION:
            return True
        try:
            sample = json.loads(data.decode("utf-8", errors="ignore"))
            txns = sample.get("transactions", [sample]) if isinstance(sample, dict) else sample
            if isinstance(txns, list) and len(txns) > 0:
                first = txns[0]
                return "amount" in first and ("from_account" in first or "remitter_account" in first or "source_account" in first)
            return False
        except Exception:
            return False

    def validate(self, artifact: EvidenceArtifact, data: bytes) -> Tuple[bool, List[str]]:
        errors = []
        try:
            payload = json.loads(data.decode("utf-8"))
            txns = payload.get("transactions", [payload]) if isinstance(payload, dict) else payload
            if not isinstance(txns, list) or len(txns) == 0:
                errors.append("Financial payload must contain transactions list")
        except Exception as e:
            errors.append(f"Invalid JSON: {e}")
        return len(errors) == 0, errors

    def parse(self, artifact: EvidenceArtifact, data: bytes) -> Dict[str, Any]:
        parsed = json.loads(data.decode("utf-8"))
        if isinstance(parsed, list):
            return {"transactions": parsed}
        if "transactions" not in parsed:
            return {"transactions": [parsed]}
        return parsed

    def normalize(self, raw_record: Dict[str, Any]) -> Dict[str, Any]:
        return raw_record

    def extract_observations(
        self, artifact: EvidenceArtifact, parsed_data: Dict[str, Any]
    ) -> List[EvidenceObservation]:
        observations = []
        for idx, txn in enumerate(parsed_data.get("transactions", [])):
            txn_ref = txn.get("txn_ref") or txn.get("reference_number", f"TXN-{idx}")
            observations.append(
                EvidenceObservation(
                    artifact_id=artifact.artifact_id,
                    case_id=artifact.case_id,
                    source_location=f"txn_index={idx}; ref={txn_ref}",
                    observation_type="FINANCIAL_TRANSFER",
                    observed_at=txn.get("timestamp", artifact.observed_at),
                    location_label=txn.get("bank_branch", "Banking Gateway"),
                    raw_data=txn,
                    extraction_method="FINANCIAL_PARSER_JSON_V2",
                    parser_version=self.adapter_version,
                )
            )
        return observations

    def extract_facts(
        self, artifact: EvidenceArtifact, observations: List[EvidenceObservation]
    ) -> List[EvidenceFact]:
        facts = []
        for obs in observations:
            txn = obs.raw_data
            src_acc = txn.get("from_account") or txn.get("source_account") or txn.get("remitter_account")
            tgt_acc = txn.get("to_account") or txn.get("target_account") or txn.get("beneficiary_account")
            amt = txn.get("amount", 0.0)

            if src_acc and tgt_acc:
                facts.append(
                    EvidenceFact(
                        case_id=artifact.case_id,
                        subject=src_acc,
                        predicate="TRANSFERRED_TO",
                        object=tgt_acc,
                        source_artifact_id=artifact.artifact_id,
                        source_observation_id=obs.observation_id,
                        source_location=obs.source_location,
                        observed_at=obs.observed_at,
                        extraction_method="FINANCIAL_DETERMINISTIC_EXTRACTION",
                        extraction_confidence=1.0,
                        source_reliability=SourceReliability.A_COMPLETELY_RELIABLE,
                        corroboration_level=CorroborationLevel.CORROBORATED,
                        epistemic_status=EpistemicStatus.FACT,
                        supporting_evidence_ids=[artifact.artifact_id],
                    )
                )

        return facts

    def extract_events(
        self, artifact: EvidenceArtifact, observations: List[EvidenceObservation]
    ) -> List[Dict[str, Any]]:
        events = []
        for obs in observations:
            txn = obs.raw_data
            events.append({
                "event_type": "FUNDS_MOVEMENT",
                "timestamp": obs.observed_at,
                "title": f"Transfer ₹{txn.get('amount', 0):,.2f}: {txn.get('from_account')} -> {txn.get('to_account')}",
                "description": f"Reference: {txn.get('reference_number', 'N/A')}",
                "source_artifact_id": artifact.artifact_id,
            })
        return events

    def health(self) -> Dict[str, Any]:
        return {"status": "HEALTHY", "adapter": self.adapter_id, "version": self.adapter_version}

    def schema(self) -> Dict[str, Any]:
        return {"version": "2.0.0", "type": "object", "required": ["transactions"]}

    def capabilities(self) -> List[str]:
        return ["UPI_LOGS", "BANK_LEDGERS", "MULE_ROUTE_DETECTION"]
