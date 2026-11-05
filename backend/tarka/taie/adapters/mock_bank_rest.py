"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
TAIE INTEGRATION FOUNDATION: MOCK BANK REST ADAPTER (INSTITUTION A)

Simulates modern REST/HTTPS JSON API communication with a private sector bank.
CamelCase schema, standard ISO 8601 timestamps, live health checks.
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

from tarka.taie.health import IntegrationHealthReporter
from tarka.taie.manifest import InstitutionCapabilityManifest
from tarka.taie.mapping import CanonicalSchemaMappingEngine, MappingResult
from tarka.taie.provenance import TransformationProvenanceTracker
from tarka.taie.sdk import BaseInstitutionalAdapter


class MockBankRestAdapter(BaseInstitutionalAdapter):
    """
    Institution A: High-availability RESTful core banking simulator.
    """

    def __init__(self, institution_id: str = "HDFC_BANK_MOCK", adapter_version: str = "1.0.0"):
        manifest = InstitutionCapabilityManifest(
            institution_id=institution_id,
            institution_name="HDFC Bank Core Switch (Mock)",
            institution_type="BANK",
            supported_protocols=["REST", "HTTPS"],
            supported_schemas=["CANONICAL_V1", "REST_JSON_V1"],
            rate_limits={"requests_per_minute": 1200, "max_batch_size": 5000, "burst_limit": 100},
            concurrency_limits={"max_concurrent_connections": 20, "max_concurrent_batches": 5},
            statutory_scopes=["PMLA_2002", "IT_ACT_69A", "CRPC_91", "RBI_MASTER_DIRECTION"],
            data_classification_policy={
                "allowed_tiers": ["T1", "T2"],
                "encryption": "TLS_1_3_AES_256_GCM",
                "retention_days": 3650
            },
            consent_framework_policy={
                "requires_warrant_ref": True,
                "customer_notification": False,
                "mandate_type": "STATUTORY_SUMMONS"
            }
        )
        super().__init__(manifest, adapter_version=adapter_version)
        self.health_reporter = IntegrationHealthReporter(institution_id)
        self.case_id = "CASE_2026_MOCK"
        self.source_evidence_id = f"EVID_{institution_id}_001"

    def connect(self) -> bool:
        self.connected = True
        return True

    def disconnect(self) -> bool:
        self.connected = False
        return True

    def health_check(self) -> Dict[str, Any]:
        report = self.health_reporter.get_report()
        return {
            "status": report.status,
            "circuit_state": report.circuit_state.value,
            "uptime_seconds": report.uptime_seconds,
            "error_rate": report.error_rate,
            "p50_latency_ms": report.p50_latency_ms
        }

    def fetch_raw(self, query: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate fetching JSON transaction list from REST API endpoint."""
        t0 = time.time()
        if not self.health_reporter.can_execute():
            raise RuntimeError(f"Circuit breaker tripped for {self.institution_id}.")

        limit = query.get("limit", 3)
        sample_records = [
            {
                "transactionId": f"HDFC_REST_TXN_{i:04d}",
                "sourceAccount": f"HDFC_ACC_{1000 + i}",
                "targetAccount": f"SBI_ACC_{2000 + i}",
                "amount": 25000.0 * (i + 1),
                "currency": "INR",
                "timestampUtc": f"2026-03-29T10:{15 + i:02d}:00Z",
                "type": "UPI_P2P",
                "status": "SUCCESS",
                "rbiRefNumber": f"RBI_REF_{888800 + i}"
            }
            for i in range(limit)
        ]

        dur_ms = (time.time() - t0) * 1000
        self.health_reporter.record_success(dur_ms)

        return {
            "institution": self.institution_id,
            "endpoint": "/api/v1/forensics/transactions",
            "statusCode": 200,
            "records": sample_records,
            "fetchedAt": "2026-03-29T10:30:00Z"
        }

    def transform(self, raw_payload: Dict[str, Any]) -> MappingResult:
        """Map REST camelCase payload into Canonical v1 transactions."""
        records = raw_payload.get("records", [])
        return CanonicalSchemaMappingEngine.map_transaction_payload(
            raw_items=records,
            case_id=self.case_id,
            source_evidence_id=self.source_evidence_id,
            mapping_profile="REST_JSON_V1"
        )

    def emit_provenance(self, raw_payload: Dict[str, Any], canonical_records: List[Any]) -> Dict[str, Any]:
        prov = TransformationProvenanceTracker.create_provenance_record(
            institution_id=self.institution_id,
            adapter_name="MockBankRestAdapter",
            adapter_version=self.adapter_version,
            mapping_profile="REST_JSON_V1",
            raw_payload=raw_payload,
            canonical_records=canonical_records
        )
        return prov.model_dump()

