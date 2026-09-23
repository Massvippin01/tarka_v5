from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4


class AuditService:
    _instance: Optional[AuditService] = None

    def __init__(self):
        self.audit_records: List[Dict[str, Any]] = []
        self._last_hash: str = "GENESIS_HASH_SENTINELX_NEXUS_2026"

    @classmethod
    def get_instance(cls) -> AuditService:
        if cls._instance is None:
            cls._instance = AuditService()
        return cls._instance

    def _compute_event_hash(self, prev_hash: str, payload: Dict[str, Any]) -> str:
        serialized = json.dumps(payload, sort_keys=True)
        combined = f"{prev_hash}:{serialized}"
        return hashlib.sha256(combined.encode("utf-8")).hexdigest()

    def log_query_event(
        self,
        query: str,
        scope: Dict[str, Any],
        tools_invoked: List[str],
        records_accessed: List[str],
        response_id: str,
        verification_rate: float,
        session_id: str = "SESSION-ADMIN-01",
        user_id: str = "usr-delhi-01",
    ) -> Dict[str, Any]:
        audit_id = f"AUD-{uuid4().hex[:8]}"
        timestamp = datetime.now(UTC).isoformat()
        payload = {
            "audit_id": audit_id,
            "event_type": "COPILOT_QUERY_EXECUTED",
            "timestamp": timestamp,
            "session_id": session_id,
            "user_id": user_id,
            "query": query,
            "scope": scope,
            "tools_invoked": tools_invoked,
            "records_accessed": records_accessed,
            "response_id": response_id,
            "verification_rate": verification_rate,
            "model_version": "v2.4-governed-copilot",
        }
        event_hash = self._compute_event_hash(self._last_hash, payload)
        payload["previous_hash"] = self._last_hash
        payload["event_hash"] = event_hash
        self._last_hash = event_hash

        self.audit_records.append(payload)
        return payload

    def log_verification_event(
        self,
        claim_id: str,
        action: str,
        investigator_notes: Optional[str] = None,
        session_id: str = "SESSION-ADMIN-01",
        user_id: str = "usr-delhi-01",
    ) -> Dict[str, Any]:
        audit_id = f"AUD-{uuid4().hex[:8]}"
        timestamp = datetime.now(UTC).isoformat()
        payload = {
            "audit_id": audit_id,
            "event_type": "INVESTIGATOR_CLAIM_REVIEWED",
            "timestamp": timestamp,
            "session_id": session_id,
            "user_id": user_id,
            "claim_id": claim_id,
            "action": action,
            "investigator_notes": investigator_notes,
        }
        event_hash = self._compute_event_hash(self._last_hash, payload)
        payload["previous_hash"] = self._last_hash
        payload["event_hash"] = event_hash
        self._last_hash = event_hash

        self.audit_records.append(payload)
        return payload

    def log_access_event(
        self,
        user_id: str,
        resource_type: str,
        action: str,
        details: Dict[str, Any],
        session_id: str = "SESSION-ADMIN-01",
    ) -> Dict[str, Any]:
        audit_id = f"AUD-{uuid4().hex[:8]}"
        timestamp = datetime.now(UTC).isoformat()
        payload = {
            "audit_id": audit_id,
            "event_type": "ACCESS_POLICY_EVALUATION",
            "timestamp": timestamp,
            "session_id": session_id,
            "user_id": user_id,
            "resource_type": resource_type,
            "action": action,
            "details": details,
        }
        event_hash = self._compute_event_hash(self._last_hash, payload)
        payload["previous_hash"] = self._last_hash
        payload["event_hash"] = event_hash
        self._last_hash = event_hash

        self.audit_records.append(payload)
        return payload

    def get_audit_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self.audit_records[-limit:]

    def verify_integrity(self) -> Dict[str, Any]:
        if not self.audit_records:
            return {"total_records": 0, "tamper_detected": False, "chain_valid": True}

        current_prev = "GENESIS_HASH_SENTINELX_NEXUS_2026"
        for idx, record in enumerate(self.audit_records):
            expected_prev = record.get("previous_hash")
            if expected_prev != current_prev:
                return {
                    "total_records": len(self.audit_records),
                    "tamper_detected": True,
                    "chain_valid": False,
                    "failed_record_index": idx,
                    "reason": f"Previous hash mismatch at index {idx}",
                }
            # Copy payload without hashes to verify content
            p_copy = {k: v for k, v in record.items() if k not in ["previous_hash", "event_hash"]}
            computed = self._compute_event_hash(current_prev, p_copy)
            if computed != record.get("event_hash"):
                return {
                    "total_records": len(self.audit_records),
                    "tamper_detected": True,
                    "chain_valid": False,
                    "failed_record_index": idx,
                    "reason": f"Event hash corruption at index {idx}",
                }
            current_prev = record.get("event_hash")

        return {
            "total_records": len(self.audit_records),
            "tamper_detected": False,
            "chain_valid": True,
            "head_hash": self._last_hash,
        }
