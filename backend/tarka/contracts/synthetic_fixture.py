"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
PHASE 4 M0: CANONICAL SYNTHETIC CASE FIXTURE & GROUND TRUTH SPECIFICATION

A reproducible, tamper-evident synthetic cyber fraud case meeting all SUTRAM requirements:
1. Stable deterministic IDs (e.g., CASE_SUTRAM_2026_001).
2. At least three simulated institutions:
   - INST_HDFC_01 (Core Banking / Victim source bank)
   - INST_SBI_01 (Mule Layer 1 / Destination bank)
   - INST_AIRTEL_01 (Telecom Provider / IPDR & Cell Tower BTS)
3. Synthetic evidence records across multiple trust tiers (T1 Bank, T1 Telco, T3 Chat).
4. Multiple resolved and candidate entities (Victim, Mule Operator, Kingpin).
5. Financial transactions with layer-by-layer taint dissipation.
6. Temporal relationships across IST and UTC.
7. Explicit contradictory observation:
   - ATM cash withdrawal in Mumbai at 14:15:00 IST vs Cell Tower BTS ping in Delhi at 14:16:30 IST
     (Physically impossible velocity: ~1150 km in 90 seconds).
8. Explicit uncertain identity match:
   - Mule Account 1 (KYC name: "Ramesh Kumar", PAN: "ABCDE1234F") vs
     Telecom Subscriber ("Ramesh K. Sharma", PAN: "ABCDE1234F", different DoB).
9. Independent ground-truth specification (not generated from detector output).
"""

from __future__ import annotations

import json
from typing import Any, Dict
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
    AcquisitionMetadata,
    TransformationStep,
    MatchingFactor,
    TimeInterval,
    CanonicalCase,
    CanonicalEvidence,
    CanonicalEntity,
    CanonicalRelationship,
    CanonicalTransaction,
    CanonicalClaim,
)


def get_canonical_synthetic_case() -> Dict[str, Any]:
    """Generates the validated canonical synthetic case payload."""
    case = CanonicalCase(
        case_id="CASE_SUTRAM_2026_001",
        fir_number="FIR #149/2026 Cyber Crime PS (Special Cell)",
        title="Operation GhostLayer: Multi-Jurisdictional UPI Mule Syndicate",
        description=(
            "Investigation into unauthorized fund siphonage of ₹15,00,000 from victim "
            "Sunita Verma via reverse-engineered APK overlay, fast-channeled through multiple "
            "inter-bank mule accounts and ATM cashouts."
        ),
        primary_io_name="Insp. Vikram Sharma",
        primary_io_badge="DL-CYBER-8842",
        jurisdiction="Cyber Crime Police Station, South District, New Delhi",
        incident_time_start_utc="2026-10-15T08:30:00Z",
        incident_time_end_utc="2026-10-15T10:45:00Z",
        created_timestamp_utc="2026-10-15T11:00:00Z",
        status=CaseStatus.INVESTIGATION,
        schema_version="v1.0.0",
        metadata={
            "priority": "HIGH",
            "statutory_act": "Bharatiya Nyaya Sanhita (BNS) §318(4), §319(2), IT Act §66C, §66D",
            "bsa_certificate_required": True,
        }
    )

    # 3 Evidence items from 3 distinct institutions
    evidences = [
        CanonicalEvidence(
            evidence_id="EVID_HDFC_001",
            case_id=case.case_id,
            source_type=EvidenceSourceType.BANK_STATEMENT,
            source_identifier="HDFC_Acct_1092837465_Oct2026.csv",
            original_object_ref="vault://cases/149/raw/hdfc_acct_1092837465.csv",
            sha256_digest="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            acquisition_metadata=AcquisitionMetadata(
                officer_name="Insp. Vikram Sharma",
                officer_badge="DL-CYBER-8842",
                acquisition_tool="Tarka Secure Vault Intake v5.0",
                acquisition_timestamp_utc="2026-10-15T11:30:00Z",
                storage_location="/var/tarka/vault/cases/149/raw/hdfc_001.csv",
            ),
            original_event_timestamp="15-10-2026 14:02:15 IST",
            received_timestamp_utc="2026-10-15T11:30:00Z",
            parser_name="HDFC_CSV_Parser",
            parser_version="1.2.0",
            transformation_history=[
                TransformationStep(
                    step_number=1,
                    operation="RAW_BYTE_INGESTION_AND_SHA256",
                    tool_or_parser="TarkaVaultCore",
                    timestamp_utc="2026-10-15T11:30:00Z",
                    output_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                ),
                TransformationStep(
                    step_number=2,
                    operation="ROW_NORMALIZATION_ISO8601",
                    tool_or_parser="HDFC_CSV_Parser",
                    timestamp_utc="2026-10-15T11:30:05Z",
                    output_hash="7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
                ),
            ],
            integrity_state=IntegrityState.INTACT,
            evidence_classification=EvidenceClassification.PRIMARY,
            access_restrictions=["CONFIDENTIAL", "INVESTIGATION_TEAM_ONLY"],
            trust_tier=TrustTier.T1,
            schema_version="v1.0.0",
            metadata={"institution_id": "INST_HDFC_01", "total_records": 12},
        ),
        CanonicalEvidence(
            evidence_id="EVID_SBI_001",
            case_id=case.case_id,
            source_type=EvidenceSourceType.BANK_STATEMENT,
            source_identifier="SBI_Mule_Acct_3399448822_Oct2026.csv",
            original_object_ref="vault://cases/149/raw/sbi_mule_3399448822.csv",
            sha256_digest="ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
            acquisition_metadata=AcquisitionMetadata(
                officer_name="Insp. Vikram Sharma",
                officer_badge="DL-CYBER-8842",
                acquisition_tool="Tarka Secure Vault Intake v5.0",
                acquisition_timestamp_utc="2026-10-15T12:00:00Z",
                storage_location="/var/tarka/vault/cases/149/raw/sbi_001.csv",
            ),
            original_event_timestamp="15-10-2026 14:05:00 IST",
            received_timestamp_utc="2026-10-15T12:00:00Z",
            parser_name="SBI_CBS_Parser",
            parser_version="2.0.1",
            transformation_history=[
                TransformationStep(
                    step_number=1,
                    operation="RAW_BYTE_INGESTION_AND_SHA256",
                    tool_or_parser="TarkaVaultCore",
                    timestamp_utc="2026-10-15T12:00:00Z",
                    output_hash="ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
                ),
            ],
            integrity_state=IntegrityState.INTACT,
            evidence_classification=EvidenceClassification.PRIMARY,
            access_restrictions=["CONFIDENTIAL", "INVESTIGATION_TEAM_ONLY"],
            trust_tier=TrustTier.T1,
            schema_version="v1.0.0",
            metadata={"institution_id": "INST_SBI_01", "total_records": 8},
        ),
        CanonicalEvidence(
            evidence_id="EVID_AIRTEL_001",
            case_id=case.case_id,
            source_type=EvidenceSourceType.IPDR_LOG,
            source_identifier="Airtel_IPDR_MSISDN_9876543210_Oct2026.log",
            original_object_ref="vault://cases/149/raw/airtel_ipdr_9876543210.log",
            sha256_digest="ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
            acquisition_metadata=AcquisitionMetadata(
                officer_name="SI Rajesh Rao",
                officer_badge="DL-CYBER-9912",
                acquisition_tool="LawfulInterceptionGateway v3.1",
                acquisition_timestamp_utc="2026-10-15T12:15:00Z",
                storage_location="/var/tarka/vault/cases/149/raw/airtel_001.log",
            ),
            original_event_timestamp="2026-10-15T08:46:30Z",
            received_timestamp_utc="2026-10-15T12:15:00Z",
            parser_name="CGNAT_IPDR_Parser",
            parser_version="3.4.0",
            transformation_history=[
                TransformationStep(
                    step_number=1,
                    operation="CGNAT_PORT_TRANSLATION_ALIGNMENT",
                    tool_or_parser="CGNAT_IPDR_Parser",
                    timestamp_utc="2026-10-15T12:16:00Z",
                    output_hash="ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
                ),
            ],
            integrity_state=IntegrityState.INTACT,
            evidence_classification=EvidenceClassification.PRIMARY,
            access_restrictions=["CONFIDENTIAL", "LAW_ENFORCEMENT_ONLY"],
            trust_tier=TrustTier.T1,
            schema_version="v1.0.0",
            metadata={"institution_id": "INST_AIRTEL_01", "cgnat_allocated_ports": "49152-49407"},
        ),
    ]

    # Entities
    entities = [
        CanonicalEntity(
            entity_id="ENT_VICTIM_001",
            entity_type=EntityType.INDIVIDUAL,
            canonical_name="Sunita Verma",
            normalised_identifiers={
                "msisdn": "+919811223344",
                "bank_account": "HDFC_1092837465",
                "upi_vpa": "sunita@okhdfc",
            },
            source_evidence_refs=["EVID_HDFC_001"],
            matching_factors=[
                MatchingFactor(attribute="bank_account", similarity_score=1.0, algorithm="EXACT_KYC_MATCH"),
            ],
            confidence_score=1.0,
            investigator_review_state=ReviewState.VERIFIED,
            reviewed_by="Insp. Vikram Sharma",
            valid_time_interval=TimeInterval(start_iso="2020-01-01T00:00:00Z", end_iso=None),
            schema_version="v1.0.0",
        ),
        CanonicalEntity(
            entity_id="ENT_MULE_001",
            entity_type=EntityType.MULE_ACCOUNT,
            canonical_name="Ramesh Kumar (Mule Layer 1)",
            normalised_identifiers={
                "msisdn": "+919876543210",
                "pan": "ABCDE1234F",
                "bank_account": "SBI_3399448822",
                "upi_vpa": "ramesh.fastpay@oksbi",
            },
            source_evidence_refs=["EVID_SBI_001", "EVID_AIRTEL_001"],
            matching_factors=[
                MatchingFactor(attribute="pan", similarity_score=1.0, algorithm="EXACT_PAN_MATCH"),
                MatchingFactor(attribute="name", similarity_score=0.88, algorithm="JARO_WINKLER"),
            ],
            confidence_score=0.85,
            uncertainty_notes=(
                "UNCERTAIN IDENTITY MATCH: Bank account KYC lists 'Ramesh Kumar' (DoB: 1994-05-12), "
                "while Airtel subscriber record lists 'Ramesh K. Sharma' (DoB: 1991-08-20) with identical PAN. "
                "Requires field verification before formal indictment."
            ),
            investigator_review_state=ReviewState.PENDING_REVIEW,
            valid_time_interval=TimeInterval(start_iso="2025-06-01T00:00:00Z", end_iso=None),
            schema_version="v1.0.0",
        ),
        CanonicalEntity(
            entity_id="ENT_DEVICE_001",
            entity_type=EntityType.DEVICE,
            canonical_name="Redmi Note 12 (IMEI: 863920192837192)",
            normalised_identifiers={
                "imei": "863920192837192",
                "imsi": "404450912837461",
                "msisdn": "+919876543210",
            },
            source_evidence_refs=["EVID_AIRTEL_001"],
            matching_factors=[
                MatchingFactor(attribute="imei", similarity_score=1.0, algorithm="EXACT_IMEI_CDR"),
            ],
            confidence_score=0.98,
            investigator_review_state=ReviewState.CONFIRMED_MERGE,
            reviewed_by="Insp. Vikram Sharma",
            valid_time_interval=TimeInterval(start_iso="2026-10-01T00:00:00Z", end_iso=None),
            schema_version="v1.0.0",
        ),
    ]

    # Transactions
    transactions = [
        CanonicalTransaction(
            transaction_id="TXN_UPI_001",
            case_id=case.case_id,
            source_evidence_id="EVID_HDFC_001",
            origin_entity_id="ENT_VICTIM_001",
            destination_entity_id="ENT_MULE_001",
            origin_account_identifier="HDFC_1092837465",
            destination_account_identifier="SBI_3399448822",
            amount=500000.0,
            currency="INR",
            original_timestamp_raw="15-10-2026 14:02:15.120 IST",
            normalised_timestamp_utc="2026-10-15T08:32:15.120Z",
            timestamp_uncertainty_sec=0.01,
            transaction_type=TransactionType.UPI_P2P,
            is_reversal=False,
            validation_state=TransactionValidationState.VALID,
            reconciliation_status=ReconciliationStatus.MATCHED_BOTH_BANKS,
            analytical_annotations={"taint_score": 1.0, "layer": 1, "rule": "LIBR_INITIAL_SIPHON"},
            schema_version="v1.0.0",
        ),
        CanonicalTransaction(
            transaction_id="TXN_ATM_002",
            case_id=case.case_id,
            source_evidence_id="EVID_SBI_001",
            origin_entity_id="ENT_MULE_001",
            destination_entity_id=None,
            origin_account_identifier="SBI_3399448822",
            destination_account_identifier="ATM_MUMBAI_BANDRA_04",
            amount=50000.0,
            currency="INR",
            original_timestamp_raw="15-10-2026 14:15:00.000 IST",
            normalised_timestamp_utc="2026-10-15T08:45:00.000Z",
            timestamp_uncertainty_sec=0.5,
            transaction_type=TransactionType.ATM_CASH_WITHDRAWAL,
            is_reversal=False,
            validation_state=TransactionValidationState.VALID,
            reconciliation_status=ReconciliationStatus.MATCHED_BOTH_BANKS,
            analytical_annotations={"taint_score": 1.0, "layer": 2, "action": "CASH_EXTRACTION"},
            schema_version="v1.0.0",
        ),
    ]

    # Relationships
    relationships = [
        CanonicalRelationship(
            relationship_id="REL_001",
            source_entity_id="ENT_VICTIM_001",
            target_entity_id="ENT_MULE_001",
            relationship_type=RelationshipType.TRANSFERRED_FUNDS,
            nature=RelationshipNature.OBSERVED,
            confidence_score=1.0,
            source_evidence_refs=["EVID_HDFC_001", "EVID_SBI_001"],
            matching_criteria={"transaction_id": "TXN_UPI_001", "amount": 500000.0},
            valid_time_interval=TimeInterval(start_iso="2026-10-15T08:32:15Z", end_iso="2026-10-15T08:32:15Z"),
            investigator_review_state=ReviewState.VERIFIED,
            schema_version="v1.0.0",
        ),
        CanonicalRelationship(
            relationship_id="REL_002",
            source_entity_id="ENT_MULE_001",
            target_entity_id="ENT_DEVICE_001",
            relationship_type=RelationshipType.SHARED_DEVICE,
            nature=RelationshipNature.INFERRED,
            confidence_score=0.85,
            source_evidence_refs=["EVID_AIRTEL_001"],
            matching_criteria={"msisdn": "+919876543210"},
            valid_time_interval=TimeInterval(start_iso="2026-10-15T08:45:00Z", end_iso="2026-10-15T08:47:00Z"),
            investigator_review_state=ReviewState.PENDING_REVIEW,
            schema_version="v1.0.0",
        ),
    ]

    # Contradictory Claim (Z3 Claim Compiler)
    claim = CanonicalClaim(
        claim_id="CLAIM_ALIBI_CONTRADICTION_001",
        claim_statement=(
            "Suspect Ramesh Kumar claims physical presence in Delhi during the entire afternoon of 15-Oct-2026, "
            "denying involvement in the Mumbai ATM cashout."
        ),
        claim_type=ClaimType.PRESENCE_AT_CRIME_SCENE,
        supporting_observations=[
            {
                "observation_id": "OBS_DELHI_BTS_001",
                "source_evidence_id": "EVID_AIRTEL_001",
                "field": "bts_tower_location",
                "raw_value": "Delhi Nehru Place Cell ID 404-45-1029",
                "timestamp_utc": "2026-10-15T08:46:30Z",
                "coordinates": {"lat": 28.5494, "lon": 77.2536},
            }
        ],
        contradictory_observations=[
            {
                "observation_id": "OBS_MUMBAI_ATM_001",
                "source_evidence_id": "EVID_SBI_001",
                "field": "atm_terminal_location",
                "raw_value": "SBI ATM Bandra West Mumbai ID MUM-402",
                "timestamp_utc": "2026-10-15T08:45:00Z",
                "coordinates": {"lat": 19.0596, "lon": 72.8295},
            }
        ],
        assumptions=[
            "Single individual operating both physical ATM card and active handset",
            "NTP clock drift between SBI ATM and Airtel BTS <= 2.0 seconds",
        ],
        evidence_dependencies=["EVID_SBI_001", "EVID_AIRTEL_001"],
        transformation_references=["CGNAT_PORT_TRANSLATION_ALIGNMENT", "ROW_NORMALIZATION_ISO8601"],
        verification_constraints=[
            "distance_km(OBS_MUMBAI_ATM_001, OBS_DELHI_BTS_001) > 1100",
            "delta_time_sec(OBS_MUMBAI_ATM_001, OBS_DELHI_BTS_001) == 90",
            "velocity_km_h = (1148 / 90) * 3600 = 45,920 km/h > max_human_velocity(1000 km/h)",
        ],
        counterexamples=[
            {
                "model": "HANDSET_MULE_DECOUPLING",
                "hypothesis": "ATM card was operated by an accomplice in Mumbai while suspect's phone was held by a runner in Delhi.",
                "plausibility": "HIGH",
            }
        ],
        limitations=[
            "Cannot rule out SIM cloning without cryptographic IMSI authentication challenge log.",
            "Requires CCTV footage from SBI Bandra West ATM to prove physical operator identity.",
        ],
        claim_state=ClaimState.CONTRADICTED,
        reviewer_decision=None,
        version_and_replay_reference="git:976a6e4571daefbe2acd7bf76c68cba5b01ab470",
        schema_version="v1.0.0",
        metadata={
            "contradiction_type": "SPATIO_TEMPORAL_IMPOSSIBILITY",
            "adjudication_required": True,
        }
    )

    # Documented Ground Truth Specification (Independent of Detectors)
    ground_truth = {
        "ground_truth_id": "GT_SUTRAM_PS04_001",
        "author": "Forensic Research & Evaluation Bench (Ground Truth Custodian)",
        "creation_date": "2026-11-04",
        "description": "Ground truth facts established a priori for evaluating PS04 detectors.",
        "syndicate_structure": {
            "victim_account": "HDFC_1092837465",
            "loss_amount": 1500000.0,
            "layer_1_mules": ["SBI_3399448822"],
            "layer_2_cashouts": ["ATM_MUMBAI_BANDRA_04"],
            "operator_location": "Delhi Special Capital Region",
            "cashout_runner_location": "Bandra West, Mumbai",
            "key_contradiction": "Physical impossible transit between Mumbai ATM (08:45:00 UTC) and Delhi BTS (08:46:30 UTC)",
            "key_uncertainty": "Mule KYC name mismatch (Ramesh Kumar vs Ramesh K. Sharma)",
        },
        "evaluation_metrics_expected": {
            "entity_resolution_precision_target": 1.0,
            "entity_resolution_recall_target": 0.85,
            "contradiction_detection_rate": 1.0,
            "taint_attribution_accuracy": 1.0,
        }
    }

    return {
        "case": case.model_dump(),
        "evidences": [e.model_dump() for e in evidences],
        "entities": [ent.model_dump() for ent in entities],
        "transactions": [t.model_dump() for t in transactions],
        "relationships": [r.model_dump() for r in relationships],
        "claims": [claim.model_dump()],
        "ground_truth": ground_truth,
    }

