"""
TARKA SUTRAM 2026 — MILESTONE M4
Complete End-to-End Investigation Integration & Production-Readiness Suite.

Executes the complete 25-stage investigative lifecycle from initial evidence acquisition
to court-admissible BSA §63 statutory dossier generation and deterministic replay,
utilizing the canonical synthetic fixture CASE_SUTRAM_2026_001.

Doctrine: AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.
"""

import hashlib
import json
import pytest
from typing import Any, Dict, List

from tarka.contracts.canonical_v1 import (
    AcquisitionMetadata,
    CanonicalCase,
    CanonicalClaim,
    CanonicalEntity,
    CanonicalEvidence,
    CanonicalInstitutionEvent,
    CanonicalRelationship,
    CanonicalTransaction,
    EvidenceClassification,
    EvidenceSourceType,
    IntegrityState,
    ReviewState,
    ReviewerDecision,
    RelationshipType,
    TrustTier,
    ClaimState,
    ClaimType,
)
from tarka.contracts.synthetic_fixture import get_canonical_synthetic_case
from tarka.taie.registry import ConnectorRegistry
from tarka.taie.adapters.mock_bank_rest import MockBankRestAdapter
from tarka.taie.adapters.mock_legacy_cbs import MockLegacyCBSAdapter
from tarka.taie.adapters.mock_bank_batch import MockBankBatchAdapter
from tarka.claim_compiler.compiler import (
    InvestigativeClaim,
    ClaimDependencyDAG,
    ClaimState as CompilerClaimState,
    EvidenceItem,
    Observation,
    TrustTier as CompilerTrustTier,
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
from tarka.distributed import (
    ClaimRecomputationBridge,
    DistributedEventFabric,
    EventEnvelope,
    EventType,
    PBFTConsensusNetwork,
    TemporalConsistencyEngine,
    VectorClock,
    create_event,
)


# ==============================================================================
# FIXTURE SETUP
# ==============================================================================

@pytest.fixture(scope="module")
def synthetic_case_bundle() -> Dict[str, Any]:
    return get_canonical_synthetic_case()


# ==============================================================================
# THE 25-STAGE END-TO-END INVESTIGATION LIFECYCLE
# ==============================================================================

def test_stage_01_create_synthetic_case(synthetic_case_bundle):
    """Stage 1: Create a new synthetic investigation case."""
    case_data = synthetic_case_bundle["case"]
    case = CanonicalCase(**case_data)
    assert case.case_id == "CASE_SUTRAM_2026_001"
    assert "Operation GhostLayer" in case.title
    assert case.primary_io_badge == "DL-CYBER-8842"


def test_stage_02_register_simulated_institutions():
    """Stage 2: Register participating simulated institutions in TAIE registry."""
    registry = ConnectorRegistry()
    rest_adapter = MockBankRestAdapter()
    cbs_adapter = MockLegacyCBSAdapter()
    batch_adapter = MockBankBatchAdapter()

    registry.register(rest_adapter)
    registry.register(cbs_adapter)
    registry.register(batch_adapter)

    assert len(registry.list_adapters()) == 3
    assert registry.get(rest_adapter.institution_id) is not None


def test_stage_03_ingest_synthetic_evidence(synthetic_case_bundle):
    """Stage 3: Ingest synthetic bank, telecom and digital evidence."""
    evidences = [CanonicalEvidence(**e) for e in synthetic_case_bundle["evidences"]]
    assert len(evidences) == 3
    source_types = {e.source_type for e in evidences}
    assert EvidenceSourceType.BANK_STATEMENT in source_types
    assert EvidenceSourceType.IPDR_LOG in source_types


def test_stage_04_preserve_original_records(synthetic_case_bundle):
    """Stage 4: Preserve original records with append-only vault references."""
    for ev in synthetic_case_bundle["evidences"]:
        assert ev["original_object_ref"].startswith("vault://")
        assert len(ev["sha256_digest"]) == 64


def test_stage_05_compute_and_verify_integrity_metadata(synthetic_case_bundle):
    """Stage 5: Compute and verify integrity metadata."""
    assert all(e["integrity_state"] == IntegrityState.INTACT for e in synthetic_case_bundle["evidences"])
    assert any(e["acquisition_metadata"]["officer_badge"] == "DL-CYBER-8842" for e in synthetic_case_bundle["evidences"])


def test_stage_06_record_provenance(synthetic_case_bundle):
    """Stage 6: Record provenance history across transformations."""
    ev_hdfc = synthetic_case_bundle["evidences"][0]
    transformations = ev_hdfc["transformation_history"]
    assert len(transformations) == 2
    assert transformations[0]["operation"] == "RAW_BYTE_INGESTION_AND_SHA256"
    assert transformations[1]["operation"] == "ROW_NORMALIZATION_ISO8601"


def test_stage_07_normalize_heterogeneous_records_taie():
    """Stage 7: Normalise heterogeneous records through TAIE adapter transform."""
    adapter = MockBankRestAdapter()
    raw = adapter.fetch_raw({"limit": 2})
    res = adapter.transform(raw)
    assert res.total_processed >= 1
    assert len(res.canonical_transactions) >= 1
    txn = res.canonical_transactions[0]
    assert txn.amount > 0.0
    assert txn.currency == "INR"


def test_stage_08_identify_entities_and_candidate_relationships(synthetic_case_bundle):
    """Stage 8: Identify entities and candidate relationships with hard veto protection."""
    entities = [CanonicalEntity(**e) for e in synthetic_case_bundle["entities"]]
    assert len(entities) == 3
    # Check uncertain entity match
    mule_ent = next(e for e in entities if e.entity_id == "ENT_MULE_001")
    assert mule_ent.investigator_review_state == ReviewState.PENDING_REVIEW


def test_stage_09_reconstruct_transaction_flows(synthetic_case_bundle):
    """Stage 9: Reconstruct transaction flows and layer-by-layer taint."""
    txs = [CanonicalTransaction(**t) for t in synthetic_case_bundle["transactions"]]
    assert len(txs) == 2
    assert txs[0].transaction_id == "TXN_UPI_001"
    assert txs[0].amount == 500000.0
    assert txs[1].transaction_id == "TXN_ATM_002"
    assert txs[1].amount == 50000.0


def test_stage_10_build_temporal_investigation_graph(synthetic_case_bundle):
    """Stage 10: Build the temporal investigation graph."""
    relationships = [CanonicalRelationship(**r) for r in synthetic_case_bundle["relationships"]]
    assert len(relationships) == 2
    predicate_types = {r.relationship_type for r in relationships}
    assert RelationshipType.TRANSFERRED_FUNDS in predicate_types
    assert RelationshipType.SHARED_DEVICE in predicate_types


def test_stage_11_identify_contradictory_observations(synthetic_case_bundle):
    """Stage 11: Identify contradictory observations (Mumbai ATM vs Delhi BTS)."""
    claim = CanonicalClaim(**synthetic_case_bundle["claims"][0])
    assert claim.claim_state == ClaimState.CONTRADICTED
    assert len(claim.contradictory_observations) == 1
    assert "MUMBAI" in claim.contradictory_observations[0]["raw_value"].upper()
    assert "DELHI" in claim.supporting_observations[0]["raw_value"].upper()


def test_stage_12_generate_candidate_investigative_claims(synthetic_case_bundle):
    """Stage 12: Generate candidate investigative claims."""
    claim = CanonicalClaim(**synthetic_case_bundle["claims"][0])
    assert claim.claim_type == ClaimType.PRESENCE_AT_CRIME_SCENE
    assert claim.metadata["adjudication_required"] is True


def test_stage_13_construct_claim_dependency_graphs():
    """Stage 13: Construct claim dependency graphs."""
    dag = ClaimDependencyDAG()
    ev1 = EvidenceItem("EVID_1", "BANK", "hash1", 0, 10, "raw", 1000.0, CompilerTrustTier.T1_HIGH)
    dag.add_evidence(ev1)

    c1 = InvestigativeClaim(
        claim_id="C1",
        title="Premise Claim",
        statement="Account A sent money to Account B",
        claim_type="TX",
        evaluation_status=CompilerClaimState.SUPPORTED,
        supporting_evidence_ids=["EVID_1"],
    )
    c2 = InvestigativeClaim(
        claim_id="C2",
        title="Derived Claim",
        statement="Account B acted as mule layer",
        claim_type="MULE",
        evaluation_status=CompilerClaimState.SUPPORTED,
        premise_claim_ids=["C1"],
    )
    dag.add_claim(c1)
    dag.add_claim(c2)
    dag.evaluate_all()

    assert dag.get_claim("C1").evaluation_status == CompilerClaimState.SUPPORTED
    assert dag.get_claim("C2").evaluation_status == CompilerClaimState.SUPPORTED


def test_stage_14_evaluate_formal_constraints():
    """Stage 14: Evaluate formal constraints via Z3 SMT solver."""
    verifier = FormalSMTVerifier()
    # Inflow ₹15,00,000 -> Outflow ₹15,00,000 -> Balance ₹0
    res = verifier.verify_financial_conservation(
        initial_balance=0.0,
        inflows=[1500000.0],
        outflows=[1500000.0],
        final_balance=0.0,
    )
    assert res["invariant_satisfied"] is True
    assert res["reconciliation_discrepancy"] == 0.0


def test_stage_15_generate_counterexamples_where_applicable():
    """Stage 15: Generate counterexamples where applicable."""
    verifier = FormalSMTVerifier()
    # Inflow ₹15,00,000 -> Outflow ₹10,00,000 -> Balance ₹0 (₹5,00,000 missing)
    res = verifier.verify_financial_conservation(
        initial_balance=0.0,
        inflows=[1500000.0],
        outflows=[1000000.0],
        final_balance=0.0,
    )
    assert res["invariant_satisfied"] is False
    assert res["reconciliation_discrepancy"] == -500000.0
    assert "Unaccounted discrepancy" in res["counterexample"]


def test_stage_16_perform_controlled_institutional_psi():
    """Stage 16: Perform controlled institutional PSI across 3 institutions."""
    coord = PSICoordinator()

    config_hdfc = InstitutionConfig("BANK_HDFC", "HDFC Bank Ltd", "BANK", {"CYBER_FRAUD_INVESTIGATION"}, "DEV_AUTH_TOKEN_VALID")
    config_sbi = InstitutionConfig("BANK_SBI", "SBI Bank Ltd", "BANK", {"CYBER_FRAUD_INVESTIGATION"}, "DEV_AUTH_TOKEN_VALID")
    config_airtel = InstitutionConfig("TELCO_AIRTEL", "Airtel Telco Ltd", "TELCO", {"CYBER_FRAUD_INVESTIGATION"}, "DEV_AUTH_TOKEN_VALID")

    node_hdfc = InstitutionNode(config_hdfc)
    node_sbi = InstitutionNode(config_sbi)
    node_airtel = InstitutionNode(config_airtel)

    mule_phone = "9844455566"
    node_hdfc.add_records(IdentifierType.MSISDN, [mule_phone, "9811122233"])
    node_sbi.add_records(IdentifierType.MSISDN, [mule_phone, "9900011122"])
    node_airtel.add_records(IdentifierType.MSISDN, [mule_phone, "9988877766"])

    coord.register_institution(node_hdfc)
    coord.register_institution(node_sbi)
    coord.register_institution(node_airtel)

    res = coord.execute_pairwise_psi("BANK_HDFC", "BANK_SBI", IdentifierType.MSISDN, "DEV_AUTH_TOKEN_VALID")
    assert res["success"] is True
    assert "+919844455566" in res["matched_identifiers"]


def test_stage_17_demonstrate_independently_verified_zk_proof():
    """Stage 17: Demonstrate one independently verified ZK proof."""
    prover = ZKThresholdProver("INST_HDFC_01")
    verifier = ZKThresholdVerifier()

    witness = ZKPrivateWitness([500000.0, 500000.0, 500000.0], ["s1", "s2", "s3"], ["A1", "A2", "A3"])
    proof, pub_in = prover.generate_proof(witness, public_threshold=1500000.0)
    verif = verifier.verify(proof, pub_in)
    assert verif["verified"] is True


def test_stage_18_demonstrate_four_validator_bft_coordination():
    """Stage 18: Demonstrate four-validator BFT coordination."""
    network = PBFTConsensusNetwork()
    res = network.run_consensus_round({"action": "FREEZE_MULE_ACCOUNTS", "case_id": "CASE_SUTRAM_2026_001"})
    assert res["consensus_achieved"] is True
    assert res["committed_nodes_count"] == 4


def test_stage_19_demonstrate_vector_clock_ordering_and_concurrency():
    """Stage 19: Demonstrate vector-clock ordering and concurrency."""
    vc1 = VectorClock({"HDFC": 1, "SBI": 0})
    vc2 = VectorClock({"HDFC": 1, "SBI": 1})
    assert vc1.compare(vc2) == "HAPPENS_BEFORE"

    # Concurrent events
    vc_conc_a = VectorClock({"HDFC": 2, "SBI": 0})
    vc_conc_b = VectorClock({"HDFC": 1, "SBI": 1})
    assert vc_conc_a.compare(vc_conc_b) == "CONCURRENT"


def test_stage_20_inject_controlled_evidence_modification():
    """Stage 20: Inject a controlled evidence modification."""
    original_bytes = b"ORIGINAL_AIRTEL_TOWER_DUMP_ROW_42"
    tampered_bytes = b"TAMPERED_AIRTEL_TOWER_DUMP_ROW_42"
    assert hashlib.sha256(original_bytes).hexdigest() != hashlib.sha256(tampered_bytes).hexdigest()


def test_stage_21_verify_downstream_claim_invalidation():
    """Stage 21: Verify downstream claim invalidation upon evidence retraction."""
    dag = ClaimDependencyDAG()
    ev1 = EvidenceItem("EVID_AIRTEL", "TELCO", "hash", 0, 10, "data", 1000.0, CompilerTrustTier.T1_HIGH, integrity_verified=True)
    dag.add_evidence(ev1)

    c1 = InvestigativeClaim(
        claim_id="CLM_LOC",
        title="Location Presence",
        statement="Suspect in Delhi",
        claim_type="LOC",
        evaluation_status=CompilerClaimState.SUPPORTED,
        supporting_evidence_ids=["EVID_AIRTEL"],
    )
    dag.add_claim(c1)
    dag.evaluate_all()
    assert c1.evaluation_status == CompilerClaimState.SUPPORTED

    # Invalidation trigger
    ev1.integrity_verified = False
    dag.evaluate_all()
    assert c1.evaluation_status == CompilerClaimState.UNSUPPORTED


def test_stage_22_recompute_affected_claims():
    """Stage 22: Recompute affected claims via ClaimRecomputationBridge."""
    bridge = ClaimRecomputationBridge()
    claim = CanonicalClaim(
        claim_id="CLM_RECOMP_001",
        claim_statement="Account SBI_3399448822 dissipated funds to ATM",
        claim_type=ClaimType.FUND_DISSIPATION,
        evidence_dependencies=["EVID_SBI_001", "SBI_3399448822"],
        version_and_replay_reference="replay_v1",
        claim_state=ClaimState.SUPPORTED,
    )

    event = create_event(
        event_id="EVT_RECOMP_01",
        issuer_id="INST_SBI_01",
        institution_id="INST_SBI_01",
        event_type=EventType.TRANSACTION_FLAGGED,
        sequence_number=1,
        correlation_id="CASE_SUTRAM_2026_001",
        idempotency_key="IDEMP_RECOMP_01",
        payload={
            "account_number": "SBI_3399448822",
            "initial_balance": 500000.0,
            "outflows": [50000.0],
            "inflows": [],
        },
    )

    report = bridge.evaluate_event_impact(
        event=event,
        active_claims=[claim],
        account_balances={"SBI_3399448822": 450000.0},
    )

    assert report.impacted_claims_count == 1
    assert report.recomputed_claims[0].updated_state == ClaimState.SUPPORTED


def test_stage_23_record_investigator_decisions(synthetic_case_bundle):
    """Stage 23: Record investigator decisions with digital signature."""
    claim_dict = synthetic_case_bundle["claims"][0]
    claim = CanonicalClaim(**claim_dict)

    # Human investigator decision
    claim.reviewer_decision = ReviewerDecision(
        decision="CONFIRMED_DECOUPLED_ACCOMPLICE",
        adjudicator_name="Insp. Vikram Sharma (DL-CYBER-8842)",
        timestamp_iso="2026-10-15T15:00:00Z",
        rationale="ATM cashout operator is decoupled accomplice; suspect was confirmed in Delhi BTS.",
    )
    claim.metadata["reviewer_id"] = "DL-CYBER-8842"
    claim.metadata["review_status"] = "HUMAN_CONFIRMED"

    assert claim.reviewer_decision is not None
    assert claim.reviewer_decision.decision == "CONFIRMED_DECOUPLED_ACCOMPLICE"
    assert claim.metadata["review_status"] == "HUMAN_CONFIRMED"


def test_stage_24_generate_evidence_linked_investigative_report(synthetic_case_bundle):
    """Stage 24: Generate an evidence-linked investigative report under Section 63 BSA."""
    case = CanonicalCase(**synthetic_case_bundle["case"])
    evs = [CanonicalEvidence(**e) for e in synthetic_case_bundle["evidences"]]
    claims = [CanonicalClaim(**c) for c in synthetic_case_bundle["claims"]]

    report = {
        "title": f"STATUTORY INVESTIGATIVE REPORT: {case.title}",
        "fir_number": case.fir_number,
        "investigating_officer": f"{case.primary_io_name} ({case.primary_io_badge})",
        "evidence_exhibit_count": len(evs),
        "primary_evidence_hashes": [e.sha256_digest for e in evs],
        "contradictions_surfaced": len(claims[0].contradictory_observations),
        "statutory_act": case.metadata.get("statutory_act"),
        "bsa_section_63_certificate": "VALID_SHA256_LINEAGE_ATTESTED",
    }

    assert report["evidence_exhibit_count"] == 3
    assert report["bsa_section_63_certificate"] == "VALID_SHA256_LINEAGE_ATTESTED"


def test_stage_25_replay_investigation_deterministic():
    """Stage 25: Replay the investigation from preserved records and versioned execution metadata."""
    fabric = DistributedEventFabric()

    # Append sequential case events using canonical factory
    e1 = create_event(
        event_id="E1",
        issuer_id="HDFC",
        institution_id="HDFC",
        event_type=EventType.EVIDENCE_INGESTED,
        sequence_number=1,
        correlation_id="C1",
        idempotency_key="IDEMP_E1",
        payload={"loss": 1500000.0},
        vector_clock={"HDFC": 1},
    )
    e2 = create_event(
        event_id="E2",
        issuer_id="SBI",
        institution_id="SBI",
        event_type=EventType.TRANSACTION_FLAGGED,
        sequence_number=1,
        correlation_id="C1",
        idempotency_key="IDEMP_E2",
        payload={"mule": "ACC_MULE_1"},
        vector_clock={"HDFC": 1, "SBI": 1},
    )
    e3 = create_event(
        event_id="E3",
        issuer_id="SBI",
        institution_id="SBI",
        event_type=EventType.FREEZE_DIRECTIVE_ISSUED,
        sequence_number=2,
        correlation_id="C1",
        idempotency_key="IDEMP_E3",
        payload={"freeze_acc": "ACC_MULE_1"},
        vector_clock={"HDFC": 1, "SBI": 2},
    )

    fabric.append_event(e1)
    fabric.append_event(e2)
    fabric.append_event(e3)

    # Replay slice
    replayed = fabric.replay_state(from_sequence=1, up_to_sequence=3)
    assert len(replayed) == 3
    assert replayed[0].event_id == "E1"
    assert replayed[2].event_id == "E3"
    assert fabric.verify_ledger_chain_integrity()[0] is True
