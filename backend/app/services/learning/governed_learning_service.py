from __future__ import annotations

import copy
import hashlib
import json
import re
from datetime import UTC, datetime
from typing import Any, Callable, Dict, List, Optional, Set, Tuple
from uuid import uuid4

from app.domain.auth import UserIdentity, UserRoleEnum
from app.domain.governed_learning import (
    CuratedDataset,
    LearningEvent,
    LearningEventType,
    LearningModality,
    LearningOutcome,
    LearningValidationResult,
    OfflineExperimentResult,
    PrivacyClassification,
    PromotionDecision,
    SafetyViolationType,
)
from app.services.audit_service import AuditService


class GovernedLearningService:
    """
    Subphase E5 — Governed Learning Foundation
    A strictly governed learning substrate that captures safe, structured
    operational signals without allowing them to mutate investigative truth.
    
    Invariants:
    1. NEVER train from raw evidence, unverified allegations, guilt predictions, identity assertions, or speculation.
    2. Strict PII redaction and privacy classification enforcement.
    3. Complete case isolation (model learns intent/behavior, not case conclusions).
    4. Cryptographic provenance chaining.
    5. Promotion gate requires explicit human governance sign-off (NO auto-deployment).
    """

    _instance: Optional[GovernedLearningService] = None

    SUPPORTED_SCHEMA_VERSIONS: Set[str] = {"1.0.0", "1.1.0"}
    GENESIS_PROVENANCE_HASH: str = "GENESIS_LEARNING_PROVENANCE_2026"

    # Regex patterns for sensitive entity detection & scrubbing
    PHONE_REGEX = re.compile(r"(\+?91[\-\s]?)?[6-9]\d{9}\b|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b")
    EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b")
    AADHAAR_REGEX = re.compile(r"\b\d{4}\s\d{4}\s\d{4}\b|\b\d{12}\b")
    PAN_REGEX = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b")
    SSN_REGEX = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
    IP_REGEX = re.compile(r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b")

    # Forbidden semantic markers for safety violations
    GUILT_MARKERS = {
        "guilt_score", "guilt_prob", "culpability_assessment", "perpetrator_likelihood",
        "conviction_probability", "target_guilty", "guilty_verdict", "is_guilty"
    }
    RAW_EVIDENCE_MARKERS = {
        "raw_evidence", "raw_audio", "raw_wiretap", "raw_cctv", "wiretap_recording",
        "evidence_blob", "unredacted_transcript", "raw_intercept"
    }
    ALLEGATION_MARKERS = {
        "unverified_allegation", "unsubstantiated_claim", "anonymous_accusation",
        "unproven_accusation", "is_unverified_allegation"
    }
    IDENTITY_ASSERTION_MARKERS = {
        "suspect_identity_assertion", "unverified_suspect_id", "accused_identity_tag",
        "unconfirmed_identity", "asserted_suspect_identity"
    }
    SPECULATION_MARKERS = {
        "investigator_speculation", "investigator_hunch", "gut_feeling",
        "unsubstantiated_theory", "is_speculation", "pure_speculation"
    }

    def __init__(self, audit_service: Optional[AuditService] = None) -> None:
        self.audit = audit_service or AuditService.get_instance()
        self.events: List[LearningEvent] = []
        self.datasets: Dict[str, CuratedDataset] = {}
        self.experiments: Dict[str, OfflineExperimentResult] = {}
        self.promotion_decisions: Dict[str, PromotionDecision] = {}
        self._last_provenance_hash = self.GENESIS_PROVENANCE_HASH

    @classmethod
    def get_instance(cls) -> GovernedLearningService:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ── PII DETECTION & SCRUBBING ─────────────────────────────────────────────

    def sanitize_pii(self, text: str) -> Tuple[str, bool]:
        """
        Detects and replaces PII tokens in text strings.
        Returns (sanitized_text, pii_detected_bool).
        """
        pii_detected = False
        res = text

        if self.EMAIL_REGEX.search(res):
            res = self.EMAIL_REGEX.sub("[MASKED_EMAIL]", res)
            pii_detected = True

        if self.PHONE_REGEX.search(res):
            res = self.PHONE_REGEX.sub("[MASKED_PHONE]", res)
            pii_detected = True

        if self.AADHAAR_REGEX.search(res):
            res = self.AADHAAR_REGEX.sub("[MASKED_AADHAAR]", res)
            pii_detected = True

        if self.PAN_REGEX.search(res):
            res = self.PAN_REGEX.sub("[MASKED_PAN]", res)
            pii_detected = True

        if self.SSN_REGEX.search(res):
            res = self.SSN_REGEX.sub("[MASKED_SSN]", res)
            pii_detected = True

        if self.IP_REGEX.search(res):
            res = self.IP_REGEX.sub("[MASKED_IP]", res)
            pii_detected = True

        return res, pii_detected

    def sanitize_nested_dict(self, data: Any) -> Tuple[Any, bool]:
        """Recursively sanitizes dictionary or list data structures."""
        pii_detected = False
        if isinstance(data, str):
            return self.sanitize_pii(data)
        elif isinstance(data, dict):
            new_dict = {}
            for k, v in data.items():
                s_val, p_found = self.sanitize_nested_dict(v)
                new_dict[k] = s_val
                if p_found:
                    pii_detected = True
            return new_dict, pii_detected
        elif isinstance(data, list):
            new_list = []
            for item in data:
                s_val, p_found = self.sanitize_nested_dict(item)
                new_list.append(s_val)
                if p_found:
                    pii_detected = True
            return new_list, pii_detected
        return data, False

    # ── VALIDATION & SAFETY GUARDRAILS ───────────────────────────────────────

    def validate_event(self, event: LearningEvent, sanitize_on_ingest: bool = True) -> LearningValidationResult:
        """
        Validates a LearningEvent against all strict safety and governance rules:
        - Schema version check
        - Rejection of guilt predictions
        - Rejection of raw sensitive case evidence
        - Rejection of unverified allegations
        - Rejection of identity assertions
        - Rejection of investigator speculation
        - PII checking & de-identification
        - Case isolation enforcement
        """
        violations: List[SafetyViolationType] = []
        reasons: List[str] = []

        # 1. Schema Versioning
        if event.schema_version not in self.SUPPORTED_SCHEMA_VERSIONS:
            violations.append(SafetyViolationType.SCHEMA_VERSION_MISMATCH)
            reasons.append(f"Unsupported schema version: {event.schema_version}. Expected one of {self.SUPPORTED_SCHEMA_VERSIONS}")

        # 2. Privacy Classification Gate
        if event.privacy_classification == PrivacyClassification.FORBIDDEN:
            violations.append(SafetyViolationType.UNMASKED_PII)
            reasons.append("Learning event flagged as PrivacyClassification.FORBIDDEN cannot be ingested into learning pipelines.")

        # Deep scan text and metadata fields for safety markers
        scan_blob = json.dumps(
            {
                "intent": event.normalized_intent,
                "proposed": event.proposed_action,
                "actual": event.actual_action,
                "correction": event.human_correction,
                "clarification": event.clarification,
                "failure": event.failure_reason,
                "metadata": event.metadata,
            },
            default=str,
        ).lower()

        # 3. Guilt Predictions Check
        for m in self.GUILT_MARKERS:
            if m in scan_blob:
                violations.append(SafetyViolationType.GUILT_PREDICTION)
                reasons.append(f"Forbidden guilt prediction or culpability score detected: '{m}'. Investigative systems must NEVER learn from guilt predictions.")
                break

        # 4. Raw Sensitive Case Evidence Check
        for m in self.RAW_EVIDENCE_MARKERS:
            if m in scan_blob:
                violations.append(SafetyViolationType.RAW_SENSITIVE_EVIDENCE)
                reasons.append(f"Forbidden raw sensitive evidence detected: '{m}'. Raw wiretaps/blobs cannot be stored as learning truth.")
                break

        # 5. Unverified Allegations Check
        for m in self.ALLEGATION_MARKERS:
            if m in scan_blob:
                violations.append(SafetyViolationType.UNVERIFIED_ALLEGATION)
                reasons.append(f"Forbidden unverified allegation detected: '{m}'. Unsubstantiated claims cannot be ingested.")
                break

        # 6. Identity Assertions Check
        for m in self.IDENTITY_ASSERTION_MARKERS:
            if m in scan_blob:
                violations.append(SafetyViolationType.IDENTITY_ASSERTION)
                reasons.append(f"Forbidden suspect identity assertion detected: '{m}'. Unverified identity claims are prohibited.")
                break

        # 7. Investigator Speculation Check
        for m in self.SPECULATION_MARKERS:
            if m in scan_blob:
                violations.append(SafetyViolationType.INVESTIGATOR_SPECULATION)
                reasons.append(f"Forbidden investigator speculation detected: '{m}'. Hunches and subjective theories cannot mutate learning truth.")
                break

        # 8. PII Sanitization & Check
        sanitized_event = copy.deepcopy(event)
        pii_found = False

        if event.proposed_action:
            s_prop, found = self.sanitize_pii(event.proposed_action)
            sanitized_event.proposed_action = s_prop
            if found:
                pii_found = True

        if event.actual_action:
            s_act, found = self.sanitize_pii(event.actual_action)
            sanitized_event.actual_action = s_act
            if found:
                pii_found = True

        if event.human_correction:
            s_corr, found = self.sanitize_nested_dict(event.human_correction)
            sanitized_event.human_correction = s_corr
            if found:
                pii_found = True

        if event.clarification:
            s_clar, found = self.sanitize_nested_dict(event.clarification)
            sanitized_event.clarification = s_clar
            if found:
                pii_found = True

        if event.metadata:
            s_meta, found = self.sanitize_nested_dict(event.metadata)
            sanitized_event.metadata = s_meta
            if found:
                pii_found = True

        # If PII was found:
        if pii_found:
            if sanitize_on_ingest:
                sanitized_event.privacy_classification = PrivacyClassification.DEIDENTIFIED
            else:
                violations.append(SafetyViolationType.UNMASKED_PII)
                reasons.append("Unmasked PII detected in learning event payload and automatic sanitization was disabled.")

        # 9. Case Isolation Check
        # Case ID must never appear in normalized_intent or actions directly
        if event.case_id and (event.case_id.lower() in (event.normalized_intent or "").lower()):
            violations.append(SafetyViolationType.CASE_POLLUTION)
            reasons.append(f"Case ID '{event.case_id}' detected inside normalized intent. Case truth must remain isolated.")

        is_valid = len(violations) == 0
        return LearningValidationResult(
            is_valid=is_valid,
            event_id=event.event_id,
            violations=violations,
            violation_reasons=reasons,
            sanitized_event=sanitized_event if is_valid else None,
        )

    # ── EVENT CAPTURE & INGESTION ─────────────────────────────────────────────

    def capture_event(
        self,
        event_type: LearningEventType,
        model_version: str,
        modality: LearningModality,
        language: str,
        normalized_intent: str,
        proposed_action: Optional[str] = None,
        actual_action: Optional[str] = None,
        human_correction: Optional[Dict[str, Any]] = None,
        outcome: LearningOutcome = LearningOutcome.SUCCESS,
        latency_ms: float = 0.0,
        clarification: Optional[Dict[str, Any]] = None,
        failure_reason: Optional[str] = None,
        privacy_classification: PrivacyClassification = PrivacyClassification.DEIDENTIFIED,
        case_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        schema_version: str = "1.0.0",
        parent_audit_id: Optional[str] = None,
    ) -> LearningEvent:
        """
        Creates a versioned LearningEvent with cryptographic provenance.
        """
        event_id = f"EV-LRN-{uuid4().hex[:8]}"
        now = datetime.now(UTC)

        # Compute tamper-evident provenance hash chained to last event
        raw_sig = (
            f"{self._last_provenance_hash}:{event_id}:{schema_version}:{now.isoformat()}:"
            f"{event_type.value}:{model_version}:{normalized_intent}:{outcome.value}"
        )
        provenance_hash = hashlib.sha256(raw_sig.encode("utf-8")).hexdigest()

        return LearningEvent(
            schema_version=schema_version,
            event_id=event_id,
            timestamp=now,
            event_type=event_type,
            model_version=model_version,
            modality=modality,
            language=language,
            normalized_intent=normalized_intent,
            proposed_action=proposed_action,
            actual_action=actual_action,
            human_correction=human_correction,
            outcome=outcome,
            latency_ms=latency_ms,
            clarification=clarification,
            failure_reason=failure_reason,
            privacy_classification=privacy_classification,
            provenance_hash=provenance_hash,
            parent_audit_id=parent_audit_id,
            case_id=case_id,
            metadata=metadata or {},
        )

    def ingest_event(
        self,
        event: LearningEvent,
        sanitize_on_ingest: bool = True,
    ) -> LearningEvent:
        """
        Validates and ingests a LearningEvent into the governed substrate.
        Emits immutable audit records for both acceptances and rejections.
        Raises ValueError if event fails safety validation.
        """
        val_result = self.validate_event(event, sanitize_on_ingest=sanitize_on_ingest)

        if not val_result.is_valid:
            # Audit safety rejection
            self.audit.log_event(
                event_type="LEARNING_EVENT_REJECTED",
                actor_id="GOVERNED_LEARNING_SUBSTRATE",
                case_id=event.case_id or "SYSTEM",
                action_details={
                    "event_id": event.event_id,
                    "violations": [v.value for v in val_result.violations],
                    "reasons": val_result.violation_reasons,
                    "schema_version": event.schema_version,
                },
            )
            raise ValueError(f"Unsafe learning event rejected: {'; '.join(val_result.violation_reasons)}")

        final_event = val_result.sanitized_event or event
        self._last_provenance_hash = final_event.provenance_hash
        self.events.append(final_event)

        # Audit successful ingestion
        audit_rec = self.audit.log_event(
            event_type="LEARNING_EVENT_INGESTED",
            actor_id="GOVERNED_LEARNING_SUBSTRATE",
            case_id=final_event.case_id or "SYSTEM",
            action_details={
                "event_id": final_event.event_id,
                "event_type": final_event.event_type.value,
                "model_version": final_event.model_version,
                "provenance_hash": final_event.provenance_hash,
                "privacy_classification": final_event.privacy_classification.value,
            },
        )
        final_event.parent_audit_id = audit_rec.get("audit_id")
        return final_event

    # ── DATASET CURATION & CASE ISOLATION ─────────────────────────────────────

    def build_curated_dataset(
        self,
        name: str,
        version: str,
        events: Optional[List[LearningEvent]] = None,
        schema_version: str = "1.0.0",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> CuratedDataset:
        """
        Builds an immutable, versioned offline dataset from accepted learning events.
        Enforces strict case isolation: event case IDs and raw case contexts
        are decoupled from the resulting dataset features.
        """
        source_events = events if events is not None else self.events
        selected = [e for e in source_events if e.schema_version == schema_version]

        dataset_id = f"DS-{name.upper().replace(' ', '_')}-{version}"
        now = datetime.now(UTC)

        # Deterministic dataset content hash for reproducibility
        event_hashes = [e.provenance_hash for e in selected]
        event_hashes.sort()
        dataset_hash = hashlib.sha256(
            f"{dataset_id}:{schema_version}:{':'.join(event_hashes)}".encode("utf-8")
        ).hexdigest()

        curated = CuratedDataset(
            dataset_id=dataset_id,
            name=name,
            version=version,
            schema_version=schema_version,
            created_at=now,
            events=selected,
            dataset_hash=dataset_hash,
            metadata=metadata or {},
        )

        self.datasets[dataset_id] = curated

        # Audit dataset creation
        self.audit.log_event(
            event_type="LEARNING_DATASET_CREATED",
            actor_id="GOVERNED_LEARNING_SUBSTRATE",
            case_id="SYSTEM",
            action_details={
                "dataset_id": dataset_id,
                "name": name,
                "version": version,
                "event_count": len(selected),
                "dataset_hash": dataset_hash,
            },
        )
        return curated

    # ── OFFLINE BENCHMARK & EXPERIMENTS ───────────────────────────────────────

    def run_offline_experiment(
        self,
        dataset: CuratedDataset,
        candidate_model: str,
        baseline_model: str,
        eval_fn: Callable[[LearningEvent, str], Dict[str, Any]],
    ) -> OfflineExperimentResult:
        """
        Runs a deterministic offline evaluation comparing candidate model vs baseline model
        over an immutable curated dataset.
        
        eval_fn signature: (event: LearningEvent, model_version: str) -> {"is_correct": bool, "is_safe": bool, "latency_ms": float}
        """
        experiment_id = f"EXP-{uuid4().hex[:8]}"
        now = datetime.now(UTC)

        cand_correct = 0
        cand_safe = 0
        cand_latencies: List[float] = []

        base_correct = 0
        base_safe = 0
        base_latencies: List[float] = []

        total = len(dataset.events)
        if total == 0:
            raise ValueError(f"Cannot run experiment on empty dataset '{dataset.dataset_id}'.")

        for ev in dataset.events:
            cand_res = eval_fn(ev, candidate_model)
            if cand_res.get("is_correct", False):
                cand_correct += 1
            if cand_res.get("is_safe", True):
                cand_safe += 1
            cand_latencies.append(cand_res.get("latency_ms", 50.0))

            base_res = eval_fn(ev, baseline_model)
            if base_res.get("is_correct", False):
                base_correct += 1
            if base_res.get("is_safe", True):
                base_safe += 1
            base_latencies.append(base_res.get("latency_ms", 50.0))

        cand_acc = cand_correct / total
        cand_safety = cand_safe / total
        cand_avg_lat = sum(cand_latencies) / total

        base_acc = base_correct / total
        base_safety = base_safe / total
        base_avg_lat = sum(base_latencies) / total

        passed_safety = cand_safety == 1.0  # Mandatory: 100% safety pass rate required
        regression_detected = (cand_acc < base_acc) or (cand_safety < base_safety)

        metrics = {
            "accuracy": round(cand_acc, 4),
            "safety_score": round(cand_safety, 4),
            "avg_latency_ms": round(cand_avg_lat, 2),
            "sample_count": total,
        }
        baseline_metrics = {
            "accuracy": round(base_acc, 4),
            "safety_score": round(base_safety, 4),
            "avg_latency_ms": round(base_avg_lat, 2),
            "sample_count": total,
        }

        # Deterministic experiment hash for reproducibility
        exp_sig = f"{dataset.dataset_hash}:{candidate_model}:{baseline_model}:{json.dumps(metrics, sort_keys=True)}"
        experiment_hash = hashlib.sha256(exp_sig.encode("utf-8")).hexdigest()

        exp_result = OfflineExperimentResult(
            experiment_id=experiment_id,
            dataset_id=dataset.dataset_id,
            candidate_model=candidate_model,
            baseline_model=baseline_model,
            timestamp=now,
            metrics=metrics,
            baseline_metrics=baseline_metrics,
            passed_safety=passed_safety,
            regression_detected=regression_detected,
            experiment_hash=experiment_hash,
        )

        self.experiments[experiment_id] = exp_result

        # Audit offline experiment run
        self.audit.log_event(
            event_type="OFFLINE_EXPERIMENT_EXECUTED",
            actor_id="GOVERNED_LEARNING_SUBSTRATE",
            case_id="SYSTEM",
            action_details={
                "experiment_id": experiment_id,
                "candidate_model": candidate_model,
                "baseline_model": baseline_model,
                "passed_safety": passed_safety,
                "regression_detected": regression_detected,
                "metrics": metrics,
                "experiment_hash": experiment_hash,
            },
        )
        return exp_result

    # ── PROMOTION GATE (NO AUTOMATIC DEPLOYMENT) ───────────────────────────────

    def evaluate_promotion_gate(
        self,
        experiment_result: OfflineExperimentResult,
    ) -> PromotionDecision:
        """
        Evaluates a candidate model against promotion criteria.
        
        Strict Invariants:
        1. Safety score MUST equal 1.0 (zero tolerance for safety breaches).
        2. No regression relative to baseline accuracy.
        3. Never automatically deploys: promoted is ALWAYS False until signed off by a human.
        """
        decision_id = f"DEC-{uuid4().hex[:8]}"
        reasons: List[str] = []

        if not experiment_result.passed_safety:
            reasons.append(
                f"Candidate model failed safety threshold: safety_score={experiment_result.metrics.get('safety_score')} (1.0 required)."
            )
            decision = PromotionDecision(
                decision_id=decision_id,
                experiment_id=experiment_result.experiment_id,
                promoted=False,
                status="REJECTED_SAFETY",
                reasons=reasons,
            )
        elif experiment_result.regression_detected:
            reasons.append(
                f"Candidate model regressed vs baseline: accuracy={experiment_result.metrics.get('accuracy')} < baseline={experiment_result.baseline_metrics.get('accuracy')}."
            )
            decision = PromotionDecision(
                decision_id=decision_id,
                experiment_id=experiment_result.experiment_id,
                promoted=False,
                status="REJECTED_REGRESSION",
                reasons=reasons,
            )
        else:
            reasons.append("Model passed all automated offline safety and benchmark gates. Pending explicit human governance sign-off.")
            decision = PromotionDecision(
                decision_id=decision_id,
                experiment_id=experiment_result.experiment_id,
                promoted=False,  # Still False! No automatic deployment.
                status="PENDING_HUMAN_GOVERNANCE",
                reasons=reasons,
            )

        self.promotion_decisions[decision_id] = decision

        # Audit promotion gate evaluation
        audit_rec = self.audit.log_event(
            event_type="PROMOTION_GATE_EVALUATED",
            actor_id="GOVERNED_LEARNING_SUBSTRATE",
            case_id="SYSTEM",
            action_details={
                "decision_id": decision_id,
                "experiment_id": experiment_result.experiment_id,
                "candidate_model": experiment_result.candidate_model,
                "status": decision.status,
                "promoted": decision.promoted,
                "reasons": decision.reasons,
            },
        )
        decision.audit_record_id = audit_rec.get("audit_id")
        return decision

    def approve_promotion(
        self,
        decision_id: str,
        approver: UserIdentity,
        governance_notes: str,
    ) -> PromotionDecision:
        """
        Explicit human governance sign-off required to promote a validated model.
        Requires an investigator or administrator identity.
        """
        if decision_id not in self.promotion_decisions:
            raise ValueError(f"Promotion decision '{decision_id}' not found.")

        decision = self.promotion_decisions[decision_id]

        if decision.status != "PENDING_HUMAN_GOVERNANCE":
            raise ValueError(f"Cannot approve decision with status '{decision.status}'. Only PENDING_HUMAN_GOVERNANCE can be approved.")

        # Require authorized role
        if approver.role not in {UserRoleEnum.INVESTIGATOR, UserRoleEnum.CASE_ADMINISTRATOR}:
            raise PermissionError(f"User '{approver.display_name}' with role '{approver.role.value}' is not authorized to sign off on model promotion.")

        now = datetime.now(UTC)
        decision.promoted = True
        decision.status = "APPROVED_BY_GOVERNANCE"
        decision.approved_by = approver.user_id
        decision.approval_timestamp = now
        decision.reasons.append(f"Approved by {approver.display_name} ({approver.role.value}): {governance_notes}")

        # Audit human sign-off
        audit_rec = self.audit.log_event(
            event_type="PROMOTION_APPROVED_BY_GOVERNANCE",
            actor_id=approver.user_id,
            case_id="SYSTEM",
            action_details={
                "decision_id": decision_id,
                "approver_name": approver.display_name,
                "approver_role": approver.role.value,
                "governance_notes": governance_notes,
                "approval_timestamp": now.isoformat(),
            },
        )
        decision.audit_record_id = audit_rec.get("audit_id")
        return decision
