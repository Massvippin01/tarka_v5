"""TARKA Universal Connector SDK — NCRP Webhook Adapter.

Ingests cyber-fraud complaints and freeze requisitions directly from the National Cyber Crime Reporting Portal (NCRP) / 1930 Helpline:
- Formats incoming complaint JSON payloads
- Emits Case, Evidence, and Alert entities
- Automates Golden-Hour freeze alert prioritization
"""

from __future__ import annotations

import datetime
import decimal
import hashlib
import hmac
import json
import logging
from typing import Any, AsyncIterator, Dict, List, Optional, Union
from pydantic import BaseModel, Field

from tarka.connectors.base import (
    BaseConnector,
    ConnectorHealth,
    ConnectorState,
    NormalizedEntity,
)

logger = logging.getLogger("tarka.connectors.ncrp")


class NCRPComplaintPayload(BaseModel):
    acknowledgement_number: str = Field(description="14-digit NCRP complaint reference, e.g. 20261126001428")
    fir_number: Optional[str] = None
    complainant_name: str
    complainant_phone: str
    incident_date_utc: str
    total_defrauded_amount_inr: float
    fraud_category: str
    suspect_accounts: List[Dict[str, Any]] = Field(default_factory=list)
    suspect_phones: List[str] = Field(default_factory=list)


class NCRPWebhookConnector(BaseConnector):
    """Adapter for NCRP 1930 Cyber Crime Portal incident feeds."""

    def __init__(self, connector_id: str = "CONN-LE-NCRP-01"):
        super().__init__(
            connector_id=connector_id,
            connector_type="NCRP_WEBHOOK",
            rate_limit_rps=100.0,
            failure_threshold=5,
        )
        self.webhook_secret: Optional[str] = None

    async def _on_initialize(self, config: Dict[str, Any]) -> None:
        self.webhook_secret = config.get("webhook_secret")

    def verify_signature(self, raw_payload: str, signature: str) -> bool:
        """Verifies HMAC-SHA256 signature against incoming raw webhook payload."""
        if not self.webhook_secret:
            logger.error("Cannot verify webhook signature: webhook_secret is not configured")
            return False
        computed = hmac.new(
            self.webhook_secret.encode("utf-8"),
            raw_payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(computed, signature)

    async def health_check(self) -> ConnectorHealth:
        return ConnectorHealth(
            connector_id=self.connector_id,
            state=self.state,
            circuit_state=self.circuit_breaker.state,
            last_check_timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            details={"portal": "National Cyber Crime Reporting Portal (NCRP / 1930)"},
        )

    async def fetch_records(self, query: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
        payload = query.get("ncrp_json", {})
        yield payload

    def normalize_record(self, raw_record: Union[str, Dict[str, Any]]) -> List[NormalizedEntity]:
        """Maps NCRP incident to Canonical Fraud Schema Case, Person, and Alert entities."""
        if isinstance(raw_record, str):
            try:
                data = json.loads(raw_record)
            except Exception as e:
                logger.error(f"Failed to parse NCRP JSON payload: {e}")
                data = {}
        elif isinstance(raw_record, dict):
            data = raw_record
        else:
            data = {}

        ack_no = str(data.get("acknowledgement_number", "NCRP-UNKNOWN"))
        loss = float(data.get("reported_loss_inr") or data.get("total_defrauded_amount_inr") or 0.0)
        complainant_name = str(data.get("complainant_name") or "UNKNOWN COMPLAINANT").upper()
        complainant_phone = str(data.get("complainant_mobile") or data.get("complainant_phone") or "")
        typology = str(data.get("crime_sub_category") or data.get("fraud_category") or "CYBER_FRAUD")
        fir_no = data.get("fir_number") or f"NCRP Ack: {ack_no}"

        entities: List[NormalizedEntity] = [
            NormalizedEntity(
                entity_type="Case",
                entity_id=f"CASE-NCRP-{ack_no[-6:]}",
                attributes={
                    "acknowledgement_number": ack_no,
                    "fir_number": fir_no,
                    "booked_loss_inr": loss,
                    "typology": typology,
                    "status": "GOLDEN_HOUR_PURSUIT" if loss > 500000 else "ACTIVE_INVESTIGATION",
                    "state_police_station": data.get("state_police_station", "Cyber Crime Unit"),
                },
                provenance_connector=self.connector_id,
            ),
            NormalizedEntity(
                entity_type="Person",
                entity_id=f"PERSON-{complainant_phone.replace('+', '') or ack_no[-6:]}",
                attributes={
                    "full_name": complainant_name,
                    "role": "VICTIM",
                    "phone": complainant_phone,
                },
                provenance_connector=self.connector_id,
            ),
            NormalizedEntity(
                entity_type="Alert",
                entity_id=f"ALERT-NCRP-{ack_no[-6:]}",
                attributes={
                    "severity": "CRITICAL" if loss >= 1000000.0 else "HIGH",
                    "alert_type": "NCRP_INCIDENT",
                    "description": f"Incident reported via 1930 Helpline: {typology}",
                    "loss_inr": loss,
                },
                provenance_connector=self.connector_id,
            ),
        ]
        return entities
