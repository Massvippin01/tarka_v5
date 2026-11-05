"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
PHASE 4 M0: MOCK SERVICE INTERFACES FOR INDEPENDENT WORKSTREAM DEVELOPMENT

Allows Member A, Member B, and Member C to develop and test their components
independently against validated canonical v1 contracts without needing live
services or interfering with sibling workstreams.

All mocks return validated Canonical v1 contract objects.
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

from .canonical_v1 import (
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
)
from .synthetic_fixture import get_canonical_synthetic_case


class MockMemberA_ForensicIntelligence:
    """
    Mock service providing Member A capabilities:
    - Entity Resolution
    - Graph & Fraud Network Topology
    - Transaction Taint Tracking (LIBR/FIFO)
    """

    def __init__(self):
        self._synthetic = get_canonical_synthetic_case()

    def get_entities_for_case(self, case_id: str) -> List[CanonicalEntity]:
        """Returns mock resolved entities."""
        return [CanonicalEntity(**item) for item in self._synthetic["entities"]]

    def get_transactions_for_case(self, case_id: str) -> List[CanonicalTransaction]:
        """Returns mock financial transactions."""
        return [CanonicalTransaction(**item) for item in self._synthetic["transactions"]]

    def get_relationships_for_case(self, case_id: str) -> List[CanonicalRelationship]:
        """Returns mock entity relationships."""
        return [CanonicalRelationship(**item) for item in self._synthetic["relationships"]]

    def propose_entity_link(
        self, entity_a_id: str, entity_b_id: str, criteria: str, confidence: float
    ) -> CanonicalRelationship:
        """Proposes a new entity link adhering to human review invariant."""
        return CanonicalRelationship(
            relationship_id=f"REL_PROP_{int(time.time())}",
            source_entity_id=entity_a_id,
            target_entity_id=entity_b_id,
            relationship_type=RelationshipType.COMMUNICATED_WITH,
            nature=RelationshipNature.INFERRED,
            confidence_score=confidence,
            source_evidence_refs=["EVID_AIRTEL_001"],
            matching_criteria={"reason": criteria},
            valid_time_interval=TimeInterval(start_iso="2026-10-15T08:00:00Z"),
            investigator_review_state=ReviewState.PENDING_REVIEW,
        )


class MockMemberB_PrivacyAndClaimCompiler:
    """
    Mock service providing Member B capabilities:
    - Private Set Intersection (ECDH-PSI)
    - Zero-Knowledge Solvency/Threshold Proofs
    - Distributed Evidence Events & Vector Clocks
    - Forensic Claim Compiler (Z3/SMT)
    """

    def __init__(self):
        self._synthetic = get_canonical_synthetic_case()

    def execute_psi_query(self, request: CanonicalPSIRequest) -> CanonicalPSIResult:
        """Executes a mock privacy-preserving intersection."""
        return CanonicalPSIResult(
            result_id=f"PSI_RES_{request.request_id}",
            request_id=request.request_id,
            participating_institution_ids=request.participating_institution_ids,
            result_state=PSIResultState.SUCCESS,
            intersection_cardinality=1,
            matched_blinded_tokens=[
                "0379be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
            ],
            execution_duration_ms=45.2,
            audit_ledger_hash="11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
            timestamp_utc="2026-10-15T12:30:00Z",
            schema_version="v1.0.0",
        )

    def generate_zk_proof(
        self, institution_id: str, threshold: float
    ) -> CanonicalZKProofMetadata:
        """Generates mock ZK proof metadata without revealing private witnesses."""
        return CanonicalZKProofMetadata(
            proof_id=f"ZKP_{institution_id}_{int(time.time())}",
            circuit_identifier="regulatory_batch_solvency_v1",
            circuit_version="1.0.0",
            public_inputs={
                "institution_id": institution_id,
                "regulatory_threshold": threshold,
                "timestamp_epoch": int(time.time()),
            },
            commitment_reference="sha256:4f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
            proving_system=ZKProvingSystem.GROTH16_BN254,
            verification_key_reference="vk_bn254_reg_solvency_v1.json",
            proof_size_bytes=256,
            proving_duration_ms=124.5,
            verification_duration_ms=3.8,
            verification_result=True,
            setup_assumptions="POWERS_OF_TAU_TRUSTED_SETUP",
            schema_version="v1.0.0",
        )

    def compile_investigative_claim(
        self, claim_statement: str, claim_type: ClaimType
    ) -> CanonicalClaim:
        """Compiles a claim into the SMT representation."""
        claim_data = self._synthetic["claims"][0]
        return CanonicalClaim(**claim_data)

    def publish_institution_event(
        self, institution_id: str, event_type: InstitutionEventType, payload: Dict[str, Any]
    ) -> CanonicalInstitutionEvent:
        """Publishes a mock distributed event."""
        return CanonicalInstitutionEvent(
            event_id=f"EVT_{institution_id}_{int(time.time())}",
            institution_id=institution_id,
            event_type=event_type,
            schema_version="v1.0.0",
            sequence_number=1,
            source_timestamp_utc="2026-10-15T08:30:00Z",
            received_timestamp_utc="2026-10-15T08:30:02Z",
            idempotency_key=f"IDEM_{int(time.time())}",
            payload_commitment="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            correlation_id="CORR_149_001",
            causality_metadata=CausalityMetadata(
                lamport_ts=10,
                vector_clock={institution_id: 1, "INST_PEER": 0}
            ),
            event_validation_state=EventValidationState.COMMITTED,
            payload=payload,
        )


class MockMemberC_EvidencePlatform:
    """
    Mock service providing Member C capabilities:
    - Case & Exhibit Intake
    - Bounded AI Suggestions
    - Benchmark Suite Logging
    """

    def __init__(self):
        self._synthetic = get_canonical_synthetic_case()

    def get_case(self, case_id: str) -> CanonicalCase:
        return CanonicalCase(**self._synthetic["case"])

    def get_evidences_for_case(self, case_id: str) -> List[CanonicalEvidence]:
        return [CanonicalEvidence(**e) for e in self._synthetic["evidences"]]

    def propose_ai_annotation(
        self, case_id: str, target_id: str, rationale: str
    ) -> CanonicalAIAnnotation:
        """Generates bounded AI rationale respecting the human decision gate."""
        return CanonicalAIAnnotation(
            annotation_id=f"AI_ANN_{int(time.time())}",
            case_id=case_id,
            target_object_type=AnnotationTargetType.TRANSACTION,
            target_object_id=target_id,
            model_identifier="tarka-investigative-forensic-v1",
            prompt_template_version="2026.10-investigative-rationale",
            confidence_score=0.91,
            investigative_rationale=rationale,
            supporting_evidence_ids=["EVID_HDFC_001", "EVID_SBI_001"],
            contradictions_identified=[],
            human_approval_state=HumanApprovalState.PROPOSED,
            approved_by_officer=None,
            approval_timestamp_utc=None,
            schema_version="v1.0.0",
        )

    def record_benchmark(
        self, suite_name: str, workstream: BenchmarkWorkstream, throughput: float
    ) -> CanonicalBenchmarkResult:
        return CanonicalBenchmarkResult(
            benchmark_id=f"BM_{int(time.time())}",
            suite_name=suite_name,
            workstream=workstream,
            timestamp_utc="2026-11-04T12:00:00Z",
            total_cases_evaluated=100,
            throughput_records_per_sec=throughput,
            latency_p50_ms=1.2,
            latency_p95_ms=4.8,
            latency_p99_ms=12.1,
            hardware_environment={"os": "Windows", "python": "3.12.1"},
            memory_peak_mb=128.5,
            metrics_payload={"success_rate": 1.0},
            schema_version="v1.0.0",
        )

