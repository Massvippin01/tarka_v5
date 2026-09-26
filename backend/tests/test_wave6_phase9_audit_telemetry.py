"""
SentinelX Phase 9 — Cryptographic Audit Trail & Telemetry Tests.
Verifies SHA-256 parent hash-chaining, tamper detection, and OpenTelemetry service.
"""

import pytest
from app.services.audit_service import AuditService
from app.core.telemetry import TelemetryService


class TestWave6Phase9AuditTelemetry:

    def test_audit_hash_chaining_and_integrity_verification(self):
        audit = AuditService()
        audit.audit_records.clear()
        audit._last_hash = "GENESIS_HASH_SENTINELX_NEXUS_2026"

        # Log 3 events
        ev1 = audit.log_access_event("usr-delhi-01", "CASE", "READ", {"case_id": "C102"})
        ev2 = audit.log_verification_event("CLM-001", "CORROBORATE", "Verified CDR match")
        ev3 = audit.log_query_event("Find burner SIM links", {"case_id": "C102"}, ["SEARCH_CDR"], ["ART-001"], "RESP-01", 1.0)

        assert ev1["previous_hash"] == "GENESIS_HASH_SENTINELX_NEXUS_2026"
        assert ev2["previous_hash"] == ev1["event_hash"]
        assert ev3["previous_hash"] == ev2["event_hash"]

        res = audit.verify_integrity()
        assert res["tamper_detected"] is False
        assert res["chain_valid"] is True
        assert res["total_records"] == 3

    def test_audit_tamper_detection(self):
        audit = AuditService()
        audit.audit_records.clear()
        audit._last_hash = "GENESIS_HASH_SENTINELX_NEXUS_2026"

        audit.log_access_event("usr-delhi-01", "CASE", "READ", {"case_id": "C102"})
        audit.log_verification_event("CLM-001", "CORROBORATE", "Verified CDR match")

        # Tamper with event 0 payload
        audit.audit_records[0]["user_id"] = "usr-hacker-99"

        res = audit.verify_integrity()
        assert res["tamper_detected"] is True
        assert res["chain_valid"] is False

    def test_telemetry_service_initialization(self):
        tel = TelemetryService.get_instance()
        assert tel is not None
        assert tel.service_name == "sentinelx-core-api"
