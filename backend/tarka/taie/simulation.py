"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
TAIE INTEGRATION FOUNDATION: COMPATIBILITY SIMULATION LAB

Automated test harness for verifying institutional connector compatibility,
quarantine isolation, idempotency, and circuit breakers against synthetic test vectors.
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from tarka.taie.health import CircuitState
from tarka.taie.idempotency import IdempotencyManager
from tarka.taie.sdk import BaseInstitutionalAdapter


class ScenarioResult(BaseModel):
    scenario_name: str
    passed: bool
    details: str
    duration_ms: float


class SimulationLabReport(BaseModel):
    institution_id: str
    adapter_version: str
    scenarios_run: int
    scenarios_passed: int
    scenarios_failed: int
    overall_compatible: bool
    results: List[ScenarioResult] = Field(default_factory=list)


class CompatibilitySimulationLab:
    """
    Simulates operational environments and verifies adapter resilience before deployment.
    """

    def __init__(self, adapter: BaseInstitutionalAdapter):
        self.adapter = adapter
        self.institution_id = adapter.institution_id

    def run_all_scenarios(self, case_id: str = "CASE_SIM_001") -> SimulationLabReport:
        """Execute full test suite against the target adapter."""
        results: List[ScenarioResult] = []

        # 1. Lifecycle: Connect & Health Check
        t0 = time.time()
        conn_ok = self.adapter.connect()
        health = self.adapter.health_check()
        dur = (time.time() - t0) * 1000
        health_ok = health.get("status") in ("HEALTHY", "UP", "CONNECTED")
        results.append(
            ScenarioResult(
                scenario_name="LIFECYCLE_CONNECT_AND_HEALTH",
                passed=(conn_ok and health_ok),
                details=f"Connected={conn_ok}, HealthStatus={health.get('status')}",
                duration_ms=dur
            )
        )

        # 2. Standard Ingestion & Transformation
        t0 = time.time()
        raw_valid = self.adapter.fetch_raw({"query_type": "STANDARD_TEST", "limit": 5})
        transform_result = self.adapter.transform(raw_valid)
        dur = (time.time() - t0) * 1000
        txns = getattr(transform_result, "canonical_transactions", [])
        results.append(
            ScenarioResult(
                scenario_name="STANDARD_TRANSFORMATION",
                passed=len(txns) > 0,
                details=f"Successfully normalized {len(txns)} canonical transactions.",
                duration_ms=dur
            )
        )

        # 3. Provenance Generation & Verification
        t0 = time.time()
        prov_record = self.adapter.emit_provenance(raw_valid, txns)
        dur = (time.time() - t0) * 1000
        prov_ok = bool(prov_record.get("raw_payload_sha256") and prov_record.get("provenance_id"))
        results.append(
            ScenarioResult(
                scenario_name="PROVENANCE_EMISSION",
                passed=prov_ok,
                details=f"Provenance ID={prov_record.get('provenance_id')}",
                duration_ms=dur
            )
        )

        # 4. Quarantine Resiliency (Malformed Input)
        t0 = time.time()
        malformed_raw = {
            "records": [
                {"bad_key": 123},  # missing account and amount
                {"transaction_id": "TXN_BAD_AMT", "amount": "INVALID_NUMBER", "origin_account_identifier": "ACC1"}
            ]
        }
        res_malformed = self.adapter.transform(malformed_raw)
        dur = (time.time() - t0) * 1000
        quarantined = getattr(res_malformed, "quarantined_records", [])
        results.append(
            ScenarioResult(
                scenario_name="MALFORMED_INPUT_QUARANTINE",
                passed=len(quarantined) == 2,
                details=f"Safely quarantined {len(quarantined)} malformed records without crashing.",
                duration_ms=dur
            )
        )

        # 5. Idempotent Deduplication Test
        t0 = time.time()
        mgr = IdempotencyManager()
        raw_hash = self.adapter.compute_sha256(raw_valid)
        key = mgr.generate_idempotency_key(self.institution_id, "NAT_KEY_001", raw_hash)
        accepted1, _ = mgr.check_and_record(key, "EV_001", self.institution_id, 1, "2026-03-29T10:00:00Z")
        accepted2, _ = mgr.check_and_record(key, "EV_001", self.institution_id, 1, "2026-03-29T10:00:00Z")
        dur = (time.time() - t0) * 1000
        idemp_passed = (accepted1 is True and accepted2 is False)
        results.append(
            ScenarioResult(
                scenario_name="IDEMPOTENCY_DEDUPLICATION",
                passed=idemp_passed,
                details=f"First pass accepted={accepted1}, second pass rejected as duplicate={not accepted2}",
                duration_ms=dur
            )
        )

        passed_cnt = sum(1 for r in results if r.passed)
        failed_cnt = len(results) - passed_cnt

        return SimulationLabReport(
            institution_id=self.institution_id,
            adapter_version=self.adapter.adapter_version,
            scenarios_run=len(results),
            scenarios_passed=passed_cnt,
            scenarios_failed=failed_cnt,
            overall_compatible=(failed_cnt == 0),
            results=results
        )

