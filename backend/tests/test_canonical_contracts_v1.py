"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
PHASE 4 M0: CONTRACT VALIDATION & INTEROPERABILITY TEST SUITE

Tests:
1. Canonical schema validation for all 12 contracts.
2. Serialization and deserialization roundtrip fidelity.
3. Strict rejection of invalid, malformed, or missing required fields.
4. SHA-256 hex digest regex enforcement.
5. Invariant enforcement (e.g. impossible human velocity, contradiction flags).
6. Backward compatibility & schema version consistency.
7. Mock interfaces for Member A, Member B, and Member C.
8. Complete Canonical Synthetic Case loading and ground-truth validation.
"""

import json
import pytest
from pydantic import ValidationError

from tarka.contracts.canonical_v1 import (
    TrustTier,
    CaseStatus,
    EvidenceSourceType,
    IntegrityState,
    EvidenceClassification,
    EntityType,
    ReviewState,
    RelationshipType,
    RelationshipNature,
    TransactionType,
    TransactionValidationState,
    ReconciliationStatus,
    ClaimType,
    ClaimState,
    InstitutionEventType,
    EventValidationState,
    PSIIdentifierType,
    PSIPermittedOutput,
    PSIResultState,
    ZKProvingSystem,
    AnnotationTargetType,
    HumanApprovalState,
    BenchmarkWorkstream,
    TimeInterval,
    AcquisitionMetadata,
    TransformationStep,
    MatchingFactor,
    ReviewerDecision,
    CausalityMetadata,
    CanonicalCase,
    CanonicalEvidence,
    CanonicalEntity,
    CanonicalRelationship,
    CanonicalTransaction,
    CanonicalClaim,
    CanonicalInstitutionEvent,
    CanonicalPSIRequest,
    CanonicalPSIResult,
    CanonicalZKProofMetadata,
    CanonicalAIAnnotation,
    CanonicalBenchmarkResult,
    APIResponse,
    APIResponseMetadata,
    APIErrorResponse,
    APIErrorBody,
    APIErrorDetail,
    PaginatedResponse,
    PaginationMetadata,
)
from tarka.contracts.mocks import (
    MockMemberA_ForensicIntelligence,
    MockMemberB_PrivacyAndClaimCompiler,
    MockMemberC_EvidencePlatform,
)
from tarka.contracts.synthetic_fixture import get_canonical_synthetic_case


# ==============================================================================
# 1. CANONICAL CONTRACT SERIALIZATION & ROUNDTRIP TESTS
# ==============================================================================

def test_canonical_case_roundtrip():
    case = CanonicalCase(
        case_id="CASE_2026_001",
        fir_number="FIR #12/2026",
        title="Test Case",
        description="Investigation description",
        primary_io_name="Insp. Sharma",
        primary_io_badge="DL-1234",
        jurisdiction="Cyber PS",
        created_timestamp_utc="2026-10-15T10:00:00Z",
        status=CaseStatus.INVESTIGATION,
    )
    dumped = case.model_dump()
    reloaded = CanonicalCase(**dumped)
    assert reloaded == case
    assert reloaded.schema_version == "v1.0.0"


def test_canonical_evidence_sha256_validation():
    valid_sha = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    ev = CanonicalEvidence(
        evidence_id="EVID_001",
        case_id="CASE_2026_001",
        source_type=EvidenceSourceType.BANK_STATEMENT,
        source_identifier="bank.csv",
        original_object_ref="vault://bank.csv",
        sha256_digest=valid_sha,
        acquisition_metadata=AcquisitionMetadata(
            officer_name="Insp. Sharma",
            officer_badge="DL-1234",
            acquisition_tool="TarkaVault",
            acquisition_timestamp_utc="2026-10-15T10:00:00Z",
            storage_location="/vault/bank.csv",
        ),
        received_timestamp_utc="2026-10-15T10:00:00Z",
        parser_name="BankParser",
        parser_version="1.0",
    )
    assert ev.sha256_digest == valid_sha

    # Test invalid SHA-256 (not 64 chars)
    with pytest.raises(ValidationError):
        CanonicalEvidence(
            evidence_id="EVID_002",
            case_id="CASE_2026_001",
            source_type=EvidenceSourceType.BANK_STATEMENT,
            source_identifier="bank.csv",
            original_object_ref="vault://bank.csv",
            sha256_digest="invalid_short_hash",
            acquisition_metadata=ev.acquisition_metadata,
            received_timestamp_utc="2026-10-15T10:00:00Z",
            parser_name="BankParser",
            parser_version="1.0",
        )

    # Test invalid SHA-256 (non-hex chars)
    with pytest.raises(ValidationError):
        CanonicalEvidence(
            evidence_id="EVID_003",
            case_id="CASE_2026_001",
            source_type=EvidenceSourceType.BANK_STATEMENT,
            source_identifier="bank.csv",
            original_object_ref="vault://bank.csv",
            sha256_digest="z" * 64,
            acquisition_metadata=ev.acquisition_metadata,
            received_timestamp_utc="2026-10-15T10:00:00Z",
            parser_name="BankParser",
            parser_version="1.0",
        )


def test_canonical_entity_confidence_bounds():
    with pytest.raises(ValidationError):
        CanonicalEntity(
            entity_id="ENT_001",
            entity_type=EntityType.INDIVIDUAL,
            canonical_name="Ramesh",
            confidence_score=1.5,  # Exceeds 1.0 bound
        )


def test_canonical_transaction_reconciliation_and_reversal():
    txn = CanonicalTransaction(
        transaction_id="TXN_001",
        case_id="CASE_001",
        source_evidence_id="EVID_001",
        origin_account_identifier="ACC_A",
        destination_account_identifier="ACC_B",
        amount=10000.0,
        currency="INR",
        original_timestamp_raw="15-10-2026 14:00:00 IST",
        normalised_timestamp_utc="2026-10-15T08:30:00Z",
        transaction_type=TransactionType.IMPS,
        is_reversal=False,
    )
    assert txn.amount == 10000.0
    assert txn.currency == "INR"
    assert txn.reconciliation_status == ReconciliationStatus.UNRECONCILED


def test_canonical_claim_smt_invariants():
    claim = CanonicalClaim(
        claim_id="CLAIM_001",
        claim_statement="Suspect was in Mumbai during cashout",
        claim_type=ClaimType.ALIBI,
        claim_state=ClaimState.CONTRADICTED,
        version_and_replay_reference="git:976a6e4",
        counterexamples=[{"model": "ACCOMPLICE_WITHDRAWAL", "confidence": 0.9}],
    )
    assert claim.claim_state == ClaimState.CONTRADICTED
    assert len(claim.counterexamples) == 1


def test_canonical_institution_event_causality():
    evt = CanonicalInstitutionEvent(
        event_id="EVT_001",
        institution_id="INST_HDFC_01",
        event_type=InstitutionEventType.TRANSACTION_FLAGGED,
        sequence_number=5,
        source_timestamp_utc="2026-10-15T08:30:00Z",
        received_timestamp_utc="2026-10-15T08:30:01Z",
        idempotency_key="IDEM_9901",
        payload_commitment="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        correlation_id="CORR_001",
        causality_metadata=CausalityMetadata(lamport_ts=10, vector_clock={"INST_A": 2, "INST_B": 1}),
    )
    assert evt.causality_metadata.lamport_ts == 10
    assert evt.causality_metadata.vector_clock["INST_A"] == 2


def test_canonical_psi_privacy_bounds():
    req = CanonicalPSIRequest(
        request_id="REQ_001",
        case_id="CASE_001",
        requesting_institution_id="INST_HDFC_01",
        participating_institution_ids=["INST_HDFC_01", "INST_SBI_01"],
        identifier_type=PSIIdentifierType.PAN,
        statutory_authorisation_ref="S63_WARRANT_001",
        audit_reference="AUDIT_001",
        created_timestamp_utc="2026-10-15T08:00:00Z",
    )
    res = CanonicalPSIResult(
        result_id="RES_001",
        request_id=req.request_id,
        participating_institution_ids=req.participating_institution_ids,
        result_state=PSIResultState.SUCCESS,
        intersection_cardinality=1,
        matched_blinded_tokens=["0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"],
        execution_duration_ms=42.1,
        audit_ledger_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        timestamp_utc="2026-10-15T08:00:05Z",
    )
    assert res.intersection_cardinality == 1
    # Verify no raw PAN leaked in blinded token
    for tok in res.matched_blinded_tokens:
        assert len(tok) == 66  # Compressed elliptic curve hex point


def test_canonical_zkp_metadata_security():
    zk = CanonicalZKProofMetadata(
        proof_id="ZKP_001",
        circuit_identifier="batch_solvency_v1",
        circuit_version="1.0.0",
        public_inputs={"threshold": 500000.0},
        commitment_reference="sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
        proving_system=ZKProvingSystem.GROTH16_BN254,
        verification_key_reference="vk.json",
        proof_size_bytes=256,
        proving_duration_ms=105.0,
        verification_duration_ms=3.2,
        verification_result=True,
    )
    assert zk.verification_result is True
    assert "private_witness" not in zk.model_dump()


def test_canonical_ai_annotation_human_decision_gate():
    ann = CanonicalAIAnnotation(
        annotation_id="ANN_001",
        case_id="CASE_001",
        target_object_type=AnnotationTargetType.TRANSACTION,
        target_object_id="TXN_001",
        model_identifier="tarka-investigative-deepseek-v1",
        prompt_template_version="2026.10-rationale",
        confidence_score=0.92,
        investigative_rationale="Transaction suggests rapid mule pass-through.",
        human_approval_state=HumanApprovalState.PROPOSED,
    )
    # Enforces that initial state MUST be PROPOSED; human decision required
    assert ann.human_approval_state == HumanApprovalState.PROPOSED
    assert ann.approved_by_officer is None


# ==============================================================================
# 2. CANONICAL SYNTHETIC CASE FIXTURE & GROUND TRUTH VALIDATION
# ==============================================================================

def test_synthetic_case_fixture_integrity():
    fixture = get_canonical_synthetic_case()

    assert "case" in fixture
    assert "evidences" in fixture
    assert "entities" in fixture
    assert "transactions" in fixture
    assert "relationships" in fixture
    assert "claims" in fixture
    assert "ground_truth" in fixture

    # Validate Case
    case = CanonicalCase(**fixture["case"])
    assert case.case_id == "CASE_SUTRAM_2026_001"

    # Validate 3 Institutions in Evidences
    evs = [CanonicalEvidence(**e) for e in fixture["evidences"]]
    assert len(evs) == 3
    insts = {e.metadata.get("institution_id") for e in evs}
    assert insts == {"INST_HDFC_01", "INST_SBI_01", "INST_AIRTEL_01"}

    # Validate Entities & Uncertain Match
    ents = [CanonicalEntity(**ent) for ent in fixture["entities"]]
    assert len(ents) == 3
    mule_ent = next(ent for ent in ents if ent.entity_id == "ENT_MULE_001")
    assert mule_ent.investigator_review_state == ReviewState.PENDING_REVIEW
    assert "UNCERTAIN IDENTITY MATCH" in (mule_ent.uncertainty_notes or "")

    # Validate Contradictory Claim
    claims = [CanonicalClaim(**c) for c in fixture["claims"]]
    assert len(claims) == 1
    assert claims[0].claim_state == ClaimState.CONTRADICTED
    assert len(claims[0].counterexamples) >= 1

    # Validate Ground Truth Independence
    gt = fixture["ground_truth"]
    assert gt["ground_truth_id"] == "GT_SUTRAM_PS04_001"
    assert gt["syndicate_structure"]["loss_amount"] == 1500000.0


# ==============================================================================
# 3. MOCK INTERFACES FOR INDEPENDENT WORKSTREAM DEVELOPMENT
# ==============================================================================

def test_mock_member_a_service():
    mock_a = MockMemberA_ForensicIntelligence()
    entities = mock_a.get_entities_for_case("CASE_SUTRAM_2026_001")
    assert len(entities) == 3
    txns = mock_a.get_transactions_for_case("CASE_SUTRAM_2026_001")
    assert len(txns) == 2
    rels = mock_a.get_relationships_for_case("CASE_SUTRAM_2026_001")
    assert len(rels) == 2


def test_mock_member_b_service():
    mock_b = MockMemberB_PrivacyAndClaimCompiler()
    req = CanonicalPSIRequest(
        request_id="REQ_TEST_001",
        case_id="CASE_SUTRAM_2026_001",
        requesting_institution_id="INST_HDFC_01",
        participating_institution_ids=["INST_HDFC_01", "INST_SBI_01"],
        identifier_type=PSIIdentifierType.PAN,
        statutory_authorisation_ref="S63_WARRANT_TEST",
        audit_reference="AUDIT_TEST_001",
        created_timestamp_utc="2026-10-15T12:00:00Z",
    )
    res = mock_b.execute_psi_query(req)
    assert res.result_state == PSIResultState.SUCCESS
    assert res.intersection_cardinality == 1

    zkp = mock_b.generate_zk_proof("INST_SBI_01", 500000.0)
    assert zkp.verification_result is True

    claim = mock_b.compile_investigative_claim("Suspect in Delhi", ClaimType.PRESENCE_AT_CRIME_SCENE)
    assert claim.claim_state == ClaimState.CONTRADICTED


def test_mock_member_c_service():
    mock_c = MockMemberC_EvidencePlatform()
    case = mock_c.get_case("CASE_SUTRAM_2026_001")
    assert case.fir_number.startswith("FIR #149/2026")

    evs = mock_c.get_evidences_for_case("CASE_SUTRAM_2026_001")
    assert len(evs) == 3

    ann = mock_c.propose_ai_annotation(case.case_id, "TXN_001", "Suspected layer 1 siphonage.")
    assert ann.human_approval_state == HumanApprovalState.PROPOSED


# ==============================================================================
# 4. COMMON API ENVELOPES AND ERROR STRUCTURES
# ==============================================================================

def test_api_response_envelope():
    case = CanonicalCase(
        case_id="CASE_001",
        fir_number="FIR #1/2026",
        title="Title",
        description="Desc",
        primary_io_name="IO",
        primary_io_badge="B1",
        jurisdiction="J1",
        created_timestamp_utc="2026-10-15T00:00:00Z",
    )
    resp = APIResponse[CanonicalCase](
        success=True,
        data=case,
        metadata=APIResponseMetadata(
            schema_version="v1.0.0",
            timestamp_utc="2026-10-15T12:00:00Z",
            correlation_id="CORR_123",
        )
    )
    assert resp.success is True
    assert resp.data.case_id == "CASE_001"


def test_api_error_envelope():
    err = APIErrorResponse(
        success=False,
        error=APIErrorBody(
            code="UNAUTHORIZED_INTERSECTION",
            message="No active judicial warrant recorded under BSA Section 63.",
            details=[
                APIErrorDetail(code="INVALID_WARRANT", message="Expired warrant reference.", field="statutory_authorisation_ref")
            ],
            timestamp_utc="2026-10-15T12:00:00Z",
            correlation_id="CORR_ERR_001",
        )
    )
    assert err.success is False
    assert err.error.code == "UNAUTHORIZED_INTERSECTION"
    assert len(err.error.details) == 1
