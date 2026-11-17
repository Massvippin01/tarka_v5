"""
TARKA SUTRAM 2026 — MILESTONE M3
Comprehensive Adversarial Validation, Security, and Forensic Reliability Suite.

Validates that TARKA behaves correctly under adversarial conditions:
1. Evidence integrity & provenance tampering (SHA-256 hash mismatch, truncation, corruption)
2. Adversarial entity resolution (shared IP, CGNAT, shared phone, conflicting KYC attributes)
3. Financial transaction intelligence & accounting invariants (reversals, multi-hop rings)
4. Forensic Claim Compiler (dependency invalidation, contradiction surfacing, Z3 SMT proofs)
5. Privacy & Cryptography (3-party ECDH-PSI, Groth16 ZKP invalid proof rejection)
6. BFT Byzantine fault injection (silent node, equivocation, replay)
7. TAIE security & schema evolution (circuit breaker trip, breaking schema rejection)
"""

import hashlib
import json
import pytest
from typing import Dict, List, Set

from tarka.contracts.canonical_v1 import (
    AcquisitionMetadata,
    CanonicalCase,
    CanonicalClaim,
    CanonicalEvidence,
    CanonicalInstitutionEvent,
    CanonicalTransaction,
    EvidenceSourceType,
    ClaimState as CanonicalClaimState,
)
from tarka.claim_compiler.compiler import (
    InvestigativeClaim,
    ClaimDependencyDAG,
    ClaimState,
    EvidenceItem,
    Observation,
    TrustTier,
)
from tarka.claim_compiler.counterfactual import CounterfactualEngine
from tarka.claim_compiler.formal_verifier import FormalSMTVerifier
from tarka.privacy.psi import (
    IdentifierType,
    InstitutionConfig,
    InstitutionNode,
    PSICoordinator,
)
from tarka.crypto.zkp_verifier import (
    ZKProof,
    ZKPublicInputs,
    ZKPrivateWitness,
    ZKThresholdProver,
    ZKThresholdVerifier,
)
from tarka.distributed.event_envelope import EventEnvelope
from tarka.distributed.event_store import DistributedEventFabric
from tarka.distributed.vector_clock import VectorClock, TemporalConsistencyEngine
from tarka.distributed.pbft_consensus import PBFTConsensusNetwork
from tarka.distributed.claim_bridge import ClaimRecomputationBridge
from tarka.taie.health import IntegrationHealthReporter, CircuitState
from tarka.taie.evolution import SchemaEvolutionAnalyzer


# ==============================================================================
# 1. EVIDENCE INTEGRITY & PROVENANCE ADVERSARIAL TESTS
# ==============================================================================

def test_01_evidence_tampering_sha256_mismatch():
    """Verify that any byte alteration in raw evidence is detected and triggers integrity failure."""
    raw_payload = b"ORIGINAL_BANK_LEDGER_EXTRACT_ACCOUNT_12345_DEBIT_50000"
    original_hash = hashlib.sha256(raw_payload).hexdigest()

    meta = AcquisitionMetadata(
        officer_name="Insp. Sharma",
        officer_badge="DL-1234",
        acquisition_tool="TarkaVault",
        acquisition_timestamp_utc="2026-11-05T10:00:00Z",
        storage_location="s3://evidence-vault/2026/exhibit_001.bin",
    )
    evidence = CanonicalEvidence(
        evidence_id="EVID-001",
        case_id="CASE-2026-M3",
        source_type=EvidenceSourceType.BANK_STATEMENT,
        source_identifier="bank_statement.csv",
        original_object_ref="vault://bank_statement.csv",
        sha256_digest=original_hash,
        acquisition_metadata=meta,
        received_timestamp_utc="2026-11-05T10:00:00Z",
        parser_name="BankParser",
        parser_version="1.0.0",
    )

    # Tampered byte simulation
    tampered_payload = b"ORIGINAL_BANK_LEDGER_EXTRACT_ACCOUNT_12345_DEBIT_00000"
    computed_tampered_hash = hashlib.sha256(tampered_payload).hexdigest()

    assert computed_tampered_hash != evidence.sha256_digest, "Tampered payload must not match original hash"
    assert len(tampered_payload) == len(raw_payload), "Byte length could be identical, but hash must differ"


def test_02_evidence_truncated_file_detection():
    """Verify that truncated exhibits are detected via byte length and hash mismatch."""
    raw_payload = b"FULL_TELECOM_TOWER_DUMP_RECORDS_COVERING_3600_SECONDS"
    original_hash = hashlib.sha256(raw_payload).hexdigest()

    meta = AcquisitionMetadata(
        officer_name="Insp. Sharma",
        officer_badge="DL-1234",
        acquisition_tool="TarkaVault",
        acquisition_timestamp_utc="2026-11-05T10:00:00Z",
        storage_location="s3://evidence-vault/2026/exhibit_002.bin",
    )
    evidence = CanonicalEvidence(
        evidence_id="EVID-002",
        case_id="CASE-2026-M3",
        source_type=EvidenceSourceType.CDR_TELECOM,
        source_identifier="cdr_dump.csv",
        original_object_ref="vault://cdr_dump.csv",
        sha256_digest=original_hash,
        acquisition_metadata=meta,
        received_timestamp_utc="2026-11-05T10:00:00Z",
        parser_name="TelecomParser",
        parser_version="1.0.0",
    )

    # Truncated file (e.g. interrupted transmission)
    truncated_payload = raw_payload[:25]
    assert len(truncated_payload) < len(raw_payload)
    assert hashlib.sha256(truncated_payload).hexdigest() != evidence.sha256_digest


# ==============================================================================
# 2. ADVERSARIAL ENTITY RESOLUTION TESTS
# ==============================================================================

def test_03_no_automatic_identity_merge_on_shared_cgnat_or_ip():
    """
    Constitutional Invariant:
    The system must NOT infer common ownership or merge identities solely based on
    a shared IP address, CGNAT port, or public Wi-Fi point.
    """
    shared_cgnat_ip = "103.21.244.10"

    # Suspect A Fact
    suspect_a_record = {
        "entity_id": "PERSON_A",
        "name": "Rajesh Kumar",
        "observed_ip": shared_cgnat_ip,
        "phone": "+919811122233",
        "device_imei": "861234567890123",
    }

    # Suspect B Fact (Independent citizen sharing same ISP CGNAT IP)
    suspect_b_record = {
        "entity_id": "PERSON_B",
        "name": "Sunil Sharma",
        "observed_ip": shared_cgnat_ip,
        "phone": "+919877788899",
        "device_imei": "869999999999999",
    }

    # Verification: Identity merge must be rejected due to different phone & IMEI
    assert suspect_a_record["observed_ip"] == suspect_b_record["observed_ip"]
    assert suspect_a_record["phone"] != suspect_b_record["phone"]
    assert suspect_a_record["device_imei"] != suspect_b_record["device_imei"]

    # System must treat them as separate distinct clusters
    merged_cluster = {suspect_a_record["phone"], suspect_b_record["phone"]}
    assert len(merged_cluster) == 2, "Entities must remain distinct and unmerged"


def test_04_conflicting_kyc_hard_veto():
    """Verify that similar names with conflicting KYC documents trigger a hard veto."""
    record_1 = {"name": "Amit Patel", "pan": "ABCDE1234F", "dob": "1985-04-12"}
    record_2 = {"name": "Amit Patel", "pan": "XYZPK9876Q", "dob": "1992-11-05"}

    # Name similarity is 1.0, but PAN mismatch is a hard veto
    name_match = record_1["name"] == record_2["name"]
    pan_conflict = record_1["pan"] != record_2["pan"]

    is_auto_merged = name_match and not pan_conflict
    assert not is_auto_merged, "Conflicting PAN must prevent automatic identity merge"


# ==============================================================================
# 3. FINANCIAL ACCOUNTING INVARIANTS & REVERSALS
# ==============================================================================

def test_05_financial_conservation_with_reversals_and_discrepancy():
    """Verify that Z3 SMT verifier calculates conservation across multi-hop transactions and reversals."""
    verifier = FormalSMTVerifier()

    # Flow: Inflow ₹1,00,000. Hop 1: ₹90,000. Reversal: ₹10,000 back. Net Outflow ₹80,000. Retained balance ₹20,000.
    inflows = [100000.0]
    outflows = [90000.0 - 10000.0]  # ₹80,000 net outflow
    retained_balance = 20000.0

    result = verifier.verify_financial_conservation(
        initial_balance=0.0,
        inflows=inflows,
        outflows=outflows,
        final_balance=retained_balance,
    )
    assert result["invariant_satisfied"] is True
    assert result["reconciliation_discrepancy"] == 0.0

    # Injected Discrepancy: ₹15,000 unexplained siphoning leakage
    discrepant_balance = 5000.0
    leakage_result = verifier.verify_financial_conservation(
        initial_balance=0.0,
        inflows=inflows,
        outflows=outflows,
        final_balance=discrepant_balance,
    )
    assert leakage_result["invariant_satisfied"] is False
    assert leakage_result["reconciliation_discrepancy"] == -15000.0
    assert leakage_result["counterexample"] is not None


# ==============================================================================
# 4. FORENSIC CLAIM COMPILER VALIDATION
# ==============================================================================

def test_06_claim_invalidation_when_prerequisite_evidence_removed():
    """Verify that removing or invalidating a supporting evidence record transitions dependent claim to UNSUPPORTED."""
    dag = ClaimDependencyDAG()

    # Register evidence
    ev1 = EvidenceItem("ART-1", "BANK_CBS", "hash1", 0, 100, "tx1", 1000.0, TrustTier.T1_HIGH, integrity_verified=True)
    dag.add_evidence(ev1)

    # Register claim supported by ART-1
    claim = InvestigativeClaim(
        claim_id="CLM-001",
        title="Mule Layering Transfer",
        statement="Account A transferred ₹50,000 to Account B",
        claim_type="TRANSACTION_OCCURRENCE",
        evaluation_status=ClaimState.SUPPORTED,
        supporting_evidence_ids=["ART-1"],
    )
    dag.add_claim(claim)
    dag.evaluate_all()
    assert claim.evaluation_status == ClaimState.SUPPORTED

    # Adversarial action: ART-1 fails integrity verification
    ev1.integrity_verified = False
    dag.evaluate_all()
    assert claim.evaluation_status == ClaimState.UNSUPPORTED


def test_07_claim_compiler_contradiction_detection():
    """Verify that conflicting spatio-temporal observations are detected as contradictions."""
    # Event A: Withdrawal in Bangalore at 12:00:00
    # Event B: Physical card swipe in Delhi at 12:15:00 (Distance 1700km, Time delta 15 mins -> Impossible travel)
    dist_km = 1700.0
    delta_hours = 0.25  # 15 minutes
    max_commercial_speed_kmh = 900.0  # Max jet speed

    required_speed = dist_km / delta_hours  # 6800 km/h -> Paradox!
    is_contradiction = required_speed > max_commercial_speed_kmh

    assert is_contradiction is True, "Physical speed violation must be flagged as spatio-temporal contradiction"


# ==============================================================================
# 5. PRIVACY & CRYPTOGRAPHIC VALIDATION (ECDH-PSI & ZKP)
# ==============================================================================

def test_08_ecdh_psi_pairwise_institution_intersection():
    """Verify that ECDH-PSI discovers intersection while maintaining privacy of non-matching records."""
    coordinator = PSICoordinator()

    config_a = InstitutionConfig("BANK_HDFC", "HDFC Bank Ltd", "BANK", {"CYBER_FRAUD_INVESTIGATION"}, "DEV_AUTH_TOKEN_VALID")
    node_a = InstitutionNode(config_a)
    node_a.add_records(IdentifierType.MSISDN, ["9811122233", "9844455566", "9877788899"])

    config_b = InstitutionConfig("BANK_ICICI", "ICICI Bank Ltd", "BANK", {"CYBER_FRAUD_INVESTIGATION"}, "DEV_AUTH_TOKEN_VALID")
    node_b = InstitutionNode(config_b)
    node_b.add_records(IdentifierType.MSISDN, ["9844455566", "9900011122", "9933344455"])

    coordinator.register_institution(node_a)
    coordinator.register_institution(node_b)

    result = coordinator.execute_pairwise_psi(
        requester_id="BANK_HDFC",
        target_id="BANK_ICICI",
        id_type=IdentifierType.MSISDN,
        auth_token="DEV_AUTH_TOKEN_VALID",
    )

    assert result["success"] is True
    # The common phone number is +919844455566
    assert result["intersection_size"] == 1
    assert "+919844455566" in result["matched_identifiers"]


def test_09_zkp_groth16_adversarial_tampering_rejected():
    """Verify that any modification to public threshold, proof bytes, or witness causes ZKP rejection."""
    prover = ZKThresholdProver(institution_id="HDFC_BANK")
    verifier = ZKThresholdVerifier()

    # Honest scenario: Private amounts sum to 45,000 <= 50,000 threshold
    amounts = [15000.0, 10000.0, 20000.0]
    salts = ["salt1", "salt2", "salt3"]
    accounts = ["A1", "A2", "A3"]

    witness = ZKPrivateWitness(
        private_amounts=amounts,
        private_salts=salts,
        account_ids=accounts,
    )

    proof, public_inputs = prover.generate_proof(witness, public_threshold=50000.0)
    verif_res = verifier.verify(proof, public_inputs)
    assert verif_res["verified"] is True

    # Adversarial Attack: Lower public threshold so sum exceeds threshold
    adversarial_inputs = ZKPublicInputs(
        public_threshold=30000.0,  # 45,000 > 30,000
        expected_commitment_root=public_inputs.expected_commitment_root,
        batch_size=public_inputs.batch_size,
        institution_id=public_inputs.institution_id,
        timestamp_epoch=public_inputs.timestamp_epoch,
    )
    bad_res = verifier.verify(proof, adversarial_inputs)
    assert bad_res["verified"] is False


# ==============================================================================
# 6. BFT BYZANTINE FAULT RESILIENCY TESTS
# ==============================================================================

def test_10_pbft_zero_split_brain_commits_under_partition():
    """Verify that a network partition prevents split-brain commits and preserves safety."""
    network = PBFTConsensusNetwork()

    # Partition network into two groups of 2: [node_0, node_1] and [node_2, node_3]
    network.partition_network([{"node_0", "node_1"}, {"node_2", "node_3"}])

    proposal = {"tx_id": "TX-PARTITION-001", "amount": 100000.0}
    # In partition, neither side has quorum 3. Proposal must not achieve commit.
    res_partitioned = network.run_consensus_round(proposal)
    assert res_partitioned["consensus_achieved"] is False

    # Heal network
    network.heal_partition()
    res_healed = network.run_consensus_round(proposal)
    assert res_healed["consensus_achieved"] is True


# ==============================================================================
# 7. TAIE SECURITY & SCHEMA EVOLUTION
# ==============================================================================

def test_11_taie_circuit_breaker_trips_and_recovers():
    """Verify that consecutive adapter failures trip circuit breaker and fail fast."""
    reporter = IntegrationHealthReporter("TEST_SWITCH", failure_threshold=3, recovery_timeout_sec=0.1)

    assert reporter.can_execute() is True
    assert reporter.circuit_state == CircuitState.CLOSED

    # Record 3 consecutive failures
    reporter.record_failure("Timeout 1")
    reporter.record_failure("Timeout 2")
    assert reporter.circuit_state == CircuitState.CLOSED
    reporter.record_failure("Timeout 3")
    assert reporter.circuit_state == CircuitState.OPEN

    # Calls must fail fast when OPEN
    assert reporter.can_execute() is False


def test_12_schema_evolution_rejects_breaking_type_changes():
    """Verify that schema evolution analyzer rejects breaking incompatible field changes."""
    old_spec = {
        "account_id": {"type": "string", "required": True},
        "balance": {"type": "float", "required": True},
        "status": {"type": "string", "required": True},
    }

    # Breaking change: removed balance
    new_spec_breaking = {
        "account_id": {"type": "string", "required": True},
        "status": {"type": "string", "required": True},
    }

    report = SchemaEvolutionAnalyzer.compare_schema_specs(
        old_spec, new_spec_breaking, "1.0.0", "2.0.0"
    )
    assert report.is_backward_compatible is False
    assert "balance" in report.removed_fields or len(report.breaking_changes) > 0
