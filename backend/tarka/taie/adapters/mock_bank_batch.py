"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
TAIE INTEGRATION FOUNDATION: MOCK BANK BATCH ADAPTER (INSTITUTION B)

Simulates scheduled batch file exchange (CSV / NDJSON settlement files)
from public sector clearing houses.
"""

from __future__ import annotations

import csv
import io
import time
from typing import Any, Dict, List, Optional

from tarka.taie.health import IntegrationHealthReporter
from tarka.taie.manifest import InstitutionCapabilityManifest
from tarka.taie.mapping import CanonicalSchemaMappingEngine, MappingResult
from tarka.taie.provenance import TransformationProvenanceTracker
from tarka.taie.sdk import BaseInstitutionalAdapter


class MockBankBatchAdapter(BaseInstitutionalAdapter):
    """
    Institution B: Batch EOD settlement and bank statement file exchange simulator.
    """

    def __init__(self, institution_id: str = "SBI_BANK_BATCH_MOCK", adapter_version: str = "1.0.0"):
        manifest = InstitutionCapabilityManifest(
            institution_id=institution_id,
            institution_name="SBI Clearing Switch (Batch File Mock)",
            institution_type="BANK",
            supported_protocols=["BATCH_FILE", "SFTP", "S3_VAULT"],
            supported_schemas=["CANONICAL_V1", "CSV_BATCH_V1"],
            rate_limits={"requests_per_minute": 60, "max_batch_size": 20000, "burst_limit": 5},
            concurrency_limits={"max_concurrent_connections": 5, "max_concurrent_batches": 2},
            statutory_scopes=["PMLA_2002", "CRPC_91", "RBI_MASTER_DIRECTION"],
            data_classification_policy={
                "allowed_tiers": ["T1"],
                "encryption": "GPG_AES256",
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
        """Simulate fetching an EOD CSV settlement file."""
        t0 = time.time()
        if not self.health_reporter.can_execute():
            raise RuntimeError(f"Circuit breaker tripped for {self.institution_id}.")

        limit = query.get("limit", 4)
        csv_rows = [
            "txn_ref,remitter_account,beneficiary_account,txn_amount,transaction_time,txn_type,settlement_batch",
        ]
        for i in range(limit):
            csv_rows.append(
                f"SBI_BATCH_{10000 + i},SBI_ACC_{3000 + i},AXIS_ACC_{4000 + i},"
                f"{50000.0 * (i + 1)},2026-03-29 12:{10 + i:02d}:00,IMPS,BATCH_20260329_01"
            )

        csv_content = "\n".join(csv_rows)
        dur_ms = (time.time() - t0) * 1000
        self.health_reporter.record_success(dur_ms)

        return {
            "institution": self.institution_id,
            "batch_file_name": "EOD_SETTLEMENT_20260329.csv",
            "file_format": "CSV",
            "raw_csv": csv_content,
            "row_count": limit
        }

    def transform(self, raw_payload: Dict[str, Any]) -> MappingResult:
        """Parse raw CSV payload into Canonical v1 transactions."""
        raw_csv = raw_payload.get("raw_csv", "")
        parsed_items: List[Dict[str, Any]] = []

        if raw_csv:
            reader = csv.DictReader(io.StringIO(raw_csv.strip()))
            for row in reader:
                parsed_items.append(dict(row))
        elif "records" in raw_payload:
            parsed_items = raw_payload.get("records", [])

        return CanonicalSchemaMappingEngine.map_transaction_payload(
            raw_items=parsed_items,
            case_id=self.case_id,
            source_evidence_id=self.source_evidence_id,
            mapping_profile="CSV_BATCH_V1"
        )

    def emit_provenance(self, raw_payload: Dict[str, Any], canonical_records: List[Any]) -> Dict[str, Any]:
        prov = TransformationProvenanceTracker.create_provenance_record(
            institution_id=self.institution_id,
            adapter_name="MockBankBatchAdapter",
            adapter_version=self.adapter_version,
            mapping_profile="CSV_BATCH_V1",
            raw_payload=raw_payload,
            canonical_records=canonical_records
        )
        return prov.model_dump()

