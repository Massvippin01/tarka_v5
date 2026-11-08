"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
TAIE INTEGRATION FOUNDATION: MOCK LEGACY CBS ADAPTER (INSTITUTION C)

Simulates legacy mainframe / Core Banking Systems (Finacle/BaNCS).
Custom uppercase schemas, DD-MM-YYYY timestamps, debit/credit flags,
and teller/branch ledger metadata preservation.
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

from tarka.taie.health import IntegrationHealthReporter
from tarka.taie.manifest import InstitutionCapabilityManifest
from tarka.taie.mapping import CanonicalSchemaMappingEngine, MappingResult
from tarka.taie.provenance import TransformationProvenanceTracker
from tarka.taie.sdk import BaseInstitutionalAdapter


class MockLegacyCBSAdapter(BaseInstitutionalAdapter):
    """
    Institution C: Legacy Core Banking System mainframe simulator.
    """

    def __init__(self, institution_id: str = "PNB_LEGACY_CBS_MOCK", adapter_version: str = "1.0.0"):
        manifest = InstitutionCapabilityManifest(
            institution_id=institution_id,
            institution_name="Punjab National Bank Mainframe Switch (Legacy CBS)",
            institution_type="BANK",
            supported_protocols=["LEGACY_CBS", "TCP_SOCKET", "BATCH_FILE"],
            supported_schemas=["CANONICAL_V1", "CBS_8583_LEGACY"],
            rate_limits={"requests_per_minute": 180, "max_batch_size": 1000, "burst_limit": 10},
            concurrency_limits={"max_concurrent_connections": 2, "max_concurrent_batches": 1},
            statutory_scopes=["PMLA_2002", "CRPC_91"],
            data_classification_policy={
                "allowed_tiers": ["T1"],
                "encryption": "IPSEC_TUNNEL",
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
            "error_rate": report.error_rate
        }

    def fetch_raw(self, query: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate fetching raw legacy mainframe dump."""
        t0 = time.time()
        if not self.health_reporter.can_execute():
            raise RuntimeError(f"Circuit breaker tripped for {self.institution_id}.")

        limit = query.get("limit", 3)
        legacy_dump = [
            {
                "TXN_REF_NO": f"CBS_{800000 + i}",
                "SRC_ACC_NO": f"01290001000{100 + i}",
                "DEST_ACC_NO": f"09870001000{200 + i}",
                "TXN_AMT": f"₹ {15000 * (i + 1):,}.00",
                "VAL_DT": f"29-03-2026 14:{30 + i:02d}:00",
                "DR_CR_IND": "CR_REV" if i == 2 else "DR",  # Index 2 is a reversal
                "TXN_TYPE": "NEFT",
                "TELLER_ID": "TLR_5512",
                "BRANCH_CODE": "BR_DELHI_CONNAUGHT",
                "CBS_LEDGER_FOLIO": f"FOLIO_098_{i}"
            }
            for i in range(limit)
        ]

        dur_ms = (time.time() - t0) * 1000
        self.health_reporter.record_success(dur_ms)

        return {
            "institution": self.institution_id,
            "subsystem": "FINACLE_7X_EXTRACT",
            "records": legacy_dump,
            "extract_job_id": "JOB_EOD_20260329_99"
        }

    def transform(self, raw_payload: Dict[str, Any]) -> MappingResult:
        """Map legacy CBS format into Canonical v1 transactions."""
        records = raw_payload.get("records", [])
        return CanonicalSchemaMappingEngine.map_transaction_payload(
            raw_items=records,
            case_id=self.case_id,
            source_evidence_id=self.source_evidence_id,
            mapping_profile="CBS_8583_LEGACY"
        )

    def emit_provenance(self, raw_payload: Dict[str, Any], canonical_records: List[Any]) -> Dict[str, Any]:
        prov = TransformationProvenanceTracker.create_provenance_record(
            institution_id=self.institution_id,
            adapter_name="MockLegacyCBSAdapter",
            adapter_version=self.adapter_version,
            mapping_profile="CBS_8583_LEGACY",
            raw_payload=raw_payload,
            canonical_records=canonical_records,
            additional_notes="Mainframe Finacle 7x legacy extraction"
        )
        return prov.model_dump()

