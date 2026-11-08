"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
M1 ACCEPTANCE TEST SUITE: TAIE INTEGRATION FOUNDATION

Covers all 12 formal acceptance criteria:
1. Ingestion across all 3 mock adapters (REST, Batch, Legacy CBS).
2. Heterogeneous schema mapping to Canonical v1 contracts.
3. Preservation of unrecognised fields in metadata and quarantine of bad data.
4. Safe error handling and structured diagnostics on malformed payloads.
5. Idempotent deduplication of duplicate transmissions.
6. Detection and graceful handling of delayed and out-of-order events.
7. Schema evolution analysis (breaking vs non-breaking detection).
8. Downstream claim impact evaluation on evidence updates.
9. Statutory scope and capability manifest boundary verification.
10. Failure isolation and circuit breaker protection under high error rates.
11. Cryptographic transformation provenance (SHA-256 chain-of-custody).
12. Comprehensive compatibility simulation lab execution.
"""

import pytest
from tarka.contracts.canonical_v1 import (
    CanonicalClaim,
    CanonicalTransaction,
    ClaimState,
    ClaimType,
    TransactionValidationState,
)
from tarka.taie import (
    CircuitState,
    ClaimImpactEvaluator,
    CompatibilitySimulationLab,
    ConnectorRegistry,
    IdempotencyManager,
    IntegrationHealthReporter,
    MockBankBatchAdapter,
    MockBankRestAdapter,
    MockLegacyCBSAdapter,
    SchemaEvolutionAnalyzer,
    TransformationProvenanceTracker,
)


class TestTAIEIntegrationFoundation:
    """M1 Acceptance Test Suite for TAIE Integration Foundation."""

    # --------------------------------------------------------------------------
    # 1. Ingestion across all 3 mock adapters
    # --------------------------------------------------------------------------
    def test_01_ingestion_across_all_three_adapters(self):
        rest_adapter = MockBankRestAdapter()
        batch_adapter = MockBankBatchAdapter()
        cbs_adapter = MockLegacyCBSAdapter()

        # Connect
        assert rest_adapter.connect() is True
        assert batch_adapter.connect() is True
        assert cbs_adapter.connect() is True

        # Fetch raw payloads
        rest_raw = rest_adapter.fetch_raw({"limit": 3})
        batch_raw = batch_adapter.fetch_raw({"limit": 3})
        cbs_raw = cbs_adapter.fetch_raw({"limit": 3})

        assert rest_raw["statusCode"] == 200
        assert len(rest_raw["records"]) == 3

        assert batch_raw["file_format"] == "CSV"
        assert batch_raw["row_count"] == 3

        assert cbs_raw["subsystem"] == "FINACLE_7X_EXTRACT"
        assert len(cbs_raw["records"]) == 3

    # --------------------------------------------------------------------------
    # 2. Mapping of differing input schemas to Canonical v1 contracts
    # --------------------------------------------------------------------------
    def test_02_schema_mapping_to_canonical_v1(self):
        rest_adapter = MockBankRestAdapter()
        batch_adapter = MockBankBatchAdapter()
        cbs_adapter = MockLegacyCBSAdapter()

        # Transform REST (camelCase)
        rest_raw = rest_adapter.fetch_raw({"limit": 2})
        rest_res = rest_adapter.transform(rest_raw)
        assert len(rest_res.canonical_transactions) == 2
        for txn in rest_res.canonical_transactions:
            assert isinstance(txn, CanonicalTransaction)
            assert txn.schema_version == "v1.0.0"
            assert txn.validation_state == TransactionValidationState.VALID
            assert txn.amount > 0
            assert "Z" in txn.normalised_timestamp_utc

        # Transform Batch (CSV)
        batch_raw = batch_adapter.fetch_raw({"limit": 2})
        batch_res = batch_adapter.transform(batch_raw)
        assert len(batch_res.canonical_transactions) == 2
        for txn in batch_res.canonical_transactions:
            assert isinstance(txn, CanonicalTransaction)
            assert txn.amount > 0

        # Transform Legacy CBS (Uppercase + DD-MM-YYYY timestamps + Reversal)
        cbs_raw = cbs_adapter.fetch_raw({"limit": 3})
        cbs_res = cbs_adapter.transform(cbs_raw)
        assert len(cbs_res.canonical_transactions) == 3
        # Check reversal detection on 3rd transaction
        reversal_txn = cbs_res.canonical_transactions[2]
        assert reversal_txn.is_reversal is True
        assert reversal_txn.amount == 45000.0

    # --------------------------------------------------------------------------
    # 3. Preservation of unrecognised fields in metadata
    # --------------------------------------------------------------------------
    def test_03_metadata_preservation(self):
        cbs_adapter = MockLegacyCBSAdapter()
        cbs_raw = cbs_adapter.fetch_raw({"limit": 1})
        res = cbs_adapter.transform(cbs_raw)
        txn = res.canonical_transactions[0]

        # Verify unrecognised legacy keys were not dropped, but stored in metadata
        assert "TELLER_ID" in txn.metadata
        assert txn.metadata["TELLER_ID"] == "TLR_5512"
        assert "BRANCH_CODE" in txn.metadata
        assert txn.metadata["BRANCH_CODE"] == "BR_DELHI_CONNAUGHT"
        assert "CBS_LEDGER_FOLIO" in txn.metadata

    # --------------------------------------------------------------------------
    # 4. Safe error handling and quarantine on malformed payloads
    # --------------------------------------------------------------------------
    def test_04_quarantine_malformed_records(self):
        rest_adapter = MockBankRestAdapter()
        malformed_payload = {
            "records": [
                {"bad_key": "junk"},  # Missing accounts and amount
                {"transactionId": "TXN_ERR_1", "sourceAccount": "ACC1", "amount": "NOT_A_NUMBER"},  # Missing target + invalid amount
                {"transactionId": "TXN_ERR_2", "sourceAccount": "ACC1", "targetAccount": "ACC2", "amount": -500.0},  # Negative amount
                {"transactionId": "TXN_OK", "sourceAccount": "ACC1", "targetAccount": "ACC2", "amount": 1000.0}  # Valid
            ]
        }
        res = rest_adapter.transform(malformed_payload)
        assert res.total_processed == 4
        assert res.success_count == 1
        assert res.quarantine_count == 3
        assert len(res.quarantined_records) == 3
        assert len(res.warnings) >= 3
        # Valid item still processed cleanly
        assert res.canonical_transactions[0].transaction_id == "TXN_OK"

    # --------------------------------------------------------------------------
    # 5. Idempotent deduplication of duplicate events
    # --------------------------------------------------------------------------
    def test_05_idempotent_deduplication(self):
        mgr = IdempotencyManager()
        inst_id = "HDFC_BANK_MOCK"
        payload_hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        key = mgr.generate_idempotency_key(inst_id, "NAT_TXN_001", payload_hash)

        # First transmission: accepted
        accepted1, msg1 = mgr.check_and_record(key, "EVT_001", inst_id, 1, "2026-03-29T10:00:00Z")
        assert accepted1 is True
        assert "accepted" in msg1.lower()

        # Duplicate transmission: rejected
        accepted2, msg2 = mgr.check_and_record(key, "EVT_001", inst_id, 1, "2026-03-29T10:00:00Z")
        assert accepted2 is False
        assert "duplicate" in msg2.lower()
        assert mgr.seen_count == 1

    # --------------------------------------------------------------------------
    # 6. Handling of delayed and out-of-order events
    # --------------------------------------------------------------------------
    def test_06_delayed_and_out_of_order_events(self):
        mgr = IdempotencyManager()
        inst_id = "SBI_BANK_BATCH_MOCK"

        # Event 1: seq 10
        k1 = mgr.generate_idempotency_key(inst_id, "TXN_10", "hash10")
        acc1, msg1 = mgr.check_and_record(k1, "EVT_10", inst_id, 10, "2026-03-29T10:10:00Z")
        assert acc1 is True
        assert "In-order" in msg1

        # Event 2: seq 5 (Delayed / out of order arrival)
        k2 = mgr.generate_idempotency_key(inst_id, "TXN_5", "hash5")
        acc2, msg2 = mgr.check_and_record(k2, "EVT_5", inst_id, 5, "2026-03-29T10:05:00Z")
        assert acc2 is True  # Accepted without dropping
        assert "Out-of-order" in msg2
        assert mgr.out_of_order_count == 1
        entry2 = mgr.get_entry(k2)
        assert entry2 is not None
        assert entry2.is_out_of_order is True

    # --------------------------------------------------------------------------
    # 7. Detection of schema evolution and version mismatch
    # --------------------------------------------------------------------------
    def test_07_schema_evolution_detection(self):
        old_spec = {
            "account_id": {"type": "str", "required": True},
            "balance": {"type": "float", "required": True},
            "branch": {"type": "str", "required": False}
        }

        # Case A: Non-breaking change (added optional field)
        new_spec_compat = {
            "account_id": {"type": "str", "required": True},
            "balance": {"type": "float", "required": True},
            "branch": {"type": "str", "required": False},
            "ifsc_code": {"type": "str", "required": False}
        }
        report_compat = SchemaEvolutionAnalyzer.compare_schema_specs(
            old_spec, new_spec_compat, "1.0.0", "1.1.0"
        )
        assert report_compat.is_backward_compatible is True
        assert len(report_compat.breaking_changes) == 0
        assert "ifsc_code" in report_compat.added_fields

        # Case B: Breaking change (removed required field + changed type)
        new_spec_breaking = {
            "account_id": {"type": "int", "required": True},  # Type changed
            "branch": {"type": "str", "required": False}      # balance removed
        }
        report_breaking = SchemaEvolutionAnalyzer.compare_schema_specs(
            old_spec, new_spec_breaking, "1.0.0", "2.0.0"
        )
        assert report_breaking.is_backward_compatible is False
        assert len(report_breaking.breaking_changes) == 2
        assert "balance" in report_breaking.removed_fields

    # --------------------------------------------------------------------------
    # 8. Downstream claim impact evaluation on evidence updates
    # --------------------------------------------------------------------------
    def test_08_claim_impact_evaluation(self):
        claim1 = CanonicalClaim(
            claim_id="CLAIM_ALIBI_01",
            claim_statement="Subject was not in Delhi during withdrawal",
            claim_type=ClaimType.ALIBI,
            evidence_dependencies=["EVID_HDFC_001", "EVID_CDR_002"],
            version_and_replay_reference="replay_v1",
            claim_state=ClaimState.SUPPORTED
        )
        claim2 = CanonicalClaim(
            claim_id="CLAIM_MULE_02",
            claim_statement="Account is part of mule ring",
            claim_type=ClaimType.MULE_SYNDICATE,
            evidence_dependencies=["EVID_SBI_005"],
            version_and_replay_reference="replay_v1",
            claim_state=ClaimState.SUPPORTED
        )

        claims = [claim1, claim2]
        modified_evidence = ["EVID_HDFC_001"]

        report = ClaimImpactEvaluator.evaluate_evidence_modifications(
            claims=claims,
            modified_evidence_ids=modified_evidence,
            modification_reason="ADAPTER_REMAPPING"
        )

        assert report.total_claims_analyzed == 2
        assert report.impacted_claims_count == 1
        assert report.requires_solver_recomputation is True
        impacted_summary = report.impacted_claims[0]
        assert impacted_summary.claim_id == "CLAIM_ALIBI_01"
        assert impacted_summary.recommended_state == ClaimState.NOT_EVALUATED

    # --------------------------------------------------------------------------
    # 9. Institution statutory scopes and registry lifecycle
    # --------------------------------------------------------------------------
    def test_09_statutory_scopes_and_registry(self):
        registry = ConnectorRegistry()
        rest_adapter = MockBankRestAdapter()
        batch_adapter = MockBankBatchAdapter()

        registry.register(rest_adapter)
        registry.register(batch_adapter, is_active=False)

        # Lookup
        assert registry.get("HDFC_BANK_MOCK") is not None
        assert registry.is_active("HDFC_BANK_MOCK") is True
        assert registry.is_active("SBI_BANK_BATCH_MOCK") is False

        # Filter by capability / protocol
        rest_list = registry.list_adapters(protocol="REST", active_only=True)
        assert len(rest_list) == 1
        assert rest_list[0].institution_id == "HDFC_BANK_MOCK"

        # Verify statutory scopes
        manifest = rest_adapter.manifest
        assert manifest.check_statutory_scope("PMLA_2002") is True
        assert manifest.check_statutory_scope("IT_ACT_69A") is True
        assert manifest.check_statutory_scope("UNAUTHORIZED_STATUTE") is False

    # --------------------------------------------------------------------------
    # 10. Circuit breaker failure isolation
    # --------------------------------------------------------------------------
    def test_10_circuit_breaker_failure_isolation(self):
        reporter = IntegrationHealthReporter("TEST_INSTITUTION", failure_threshold=3, recovery_timeout_sec=0.1)
        assert reporter.can_execute() is True

        # Record 2 failures: circuit remains CLOSED
        reporter.record_failure("Timeout 1")
        reporter.record_failure("Timeout 2")
        assert reporter.circuit_state == CircuitState.CLOSED
        assert reporter.can_execute() is True

        # 3rd failure trips circuit to OPEN
        reporter.record_failure("Timeout 3")
        assert reporter.circuit_state == CircuitState.OPEN
        assert reporter.can_execute() is False

        # Health report shows DOWN
        report = reporter.get_report()
        assert report.status == "DOWN"
        assert report.failed_requests == 3

    # --------------------------------------------------------------------------
    # 11. Cryptographic transformation provenance
    # --------------------------------------------------------------------------
    def test_11_cryptographic_provenance_verification(self):
        rest_adapter = MockBankRestAdapter()
        raw_payload = rest_adapter.fetch_raw({"limit": 2})
        mapping_res = rest_adapter.transform(raw_payload)

        # Emit provenance
        prov_dict = rest_adapter.emit_provenance(raw_payload, mapping_res.canonical_transactions)
        prov_record = TransformationProvenanceTracker.create_provenance_record(
            institution_id=rest_adapter.institution_id,
            adapter_name="MockBankRestAdapter",
            adapter_version="1.0.0",
            mapping_profile="REST_JSON_V1",
            raw_payload=raw_payload,
            canonical_records=mapping_res.canonical_transactions
        )

        # Verification passes with original records
        is_valid = TransformationProvenanceTracker.verify_provenance(
            prov_record, raw_payload, mapping_res.canonical_transactions
        )
        assert is_valid is True

        # Tampering with raw payload fails verification
        tampered_raw = dict(raw_payload)
        tampered_raw["statusCode"] = 500
        assert TransformationProvenanceTracker.verify_provenance(
            prov_record, tampered_raw, mapping_res.canonical_transactions
        ) is False

    # --------------------------------------------------------------------------
    # 12. Compatibility simulation lab execution
    # --------------------------------------------------------------------------
    def test_12_simulation_lab_execution(self):
        rest_adapter = MockBankRestAdapter()
        lab = CompatibilitySimulationLab(rest_adapter)
        report = lab.run_all_scenarios(case_id="CASE_TEST_SIM")

        assert report.institution_id == "HDFC_BANK_MOCK"
        assert report.scenarios_run == 5
        assert report.scenarios_passed == 5
        assert report.scenarios_failed == 0
        assert report.overall_compatible is True

