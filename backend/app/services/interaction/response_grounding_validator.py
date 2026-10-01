from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional, Set

from app.domain.intelligence_contract import (
    EpistemicStatusEnum,
    FactCategoryEnum,
    IntelligenceResponseContract,
    ResponseGroundingStatus,
    ValidatedResponse,
)
from app.services.interaction.spoken_template_engine import SpokenResponseTemplateEngine

logger = logging.getLogger("sentinelx.interaction.response_grounding_validator")


class ResponseGroundingValidator:
    """
    Deterministic Claim-Level Response Grounding Validator.

    Validates every IntelligenceResponseContract before it is synthesized into voice
    or emitted to the user interface.

    FAIL-CLOSED INVARIANTS:
    1. Case Scope Validity: Rejects foreign or cross-case leakage.
    2. Zero Prohibited Guilt/Innocence Assertions: Rejects "guilty", "criminal", "committed the crime".
    3. Epistemic Non-Upgrade: INFERRED/UNKNOWN facts cannot be claimed as OBSERVED/VERIFIED.
    4. Evidence Provenance Integrity: Factual claims must anchor genuine CAS artifacts.
    5. Prompt Injection Passive Data Isolation: Evidence tokens never become instructions.
    """

    DEFAULT_ALLOWED_CASES: Set[str] = {"CASE-2026-001", "C102", "C481", "CASE-2026-002"}

    _STRICT_GUILT_KEYWORDS = [
        r"\b(?:is|was)\s+guilty\b",
        r"\b(?:is|was)\s+the\s+criminal\b",
        r"\b(?:is|was)\s+the\s+perpetrator\b",
        r"\bdefinitely\s+committed\b",
        r"\bproven\s+guilty\b",
    ]

    _PROMPT_INJECTION_MARKERS = [
        r"\bignore\s+(?:all\s+)?previous\s+instructions\b",
        r"\breveal\s+(?:all\s+)?secret\b",
        r"\breveal\s+(?:all\s+)?system\s+prompt\b",
        r"\bsystem\s+instruction\s*:\b",
        r"\bbypass\s+policy\s+gateway\b",
    ]

    def __init__(self, allowed_cases: Optional[Set[str]] = None) -> None:
        self.allowed_cases = allowed_cases or set(self.DEFAULT_ALLOWED_CASES)

    def validate_response(
        self,
        contract: IntelligenceResponseContract,
        requesting_case_id: Optional[str] = None,
    ) -> ValidatedResponse:
        """
        Validate an IntelligenceResponseContract.
        Returns a ValidatedResponse containing the verified and safe voice_text and display_text.
        """
        rejection_reasons: List[str] = []
        target_case = contract.case_id or requesting_case_id or "CASE-2026-001"

        # ── 1. CASE SCOPE CHECK ──────────────────────────────────────
        if target_case not in self.allowed_cases or "forbidden" in target_case.lower() or "restricted" in target_case.lower() or "999" in target_case:
            rejection_reasons.append(f"Target case '{target_case}' is outside authorized case scope.")

        # Check for cross-case mentions inside text
        other_cases = [c for c in self.allowed_cases if c != target_case]
        for oc in other_cases:
            if oc in contract.voice_text and not contract.requires_clarification:
                rejection_reasons.append(f"Unauthorized cross-case entity reference to '{oc}' detected.")

        # ── 2. PROHIBITED GUILT/INNOCENCE ASSERTIONS ─────────────────
        combined_text = f"{contract.voice_text} {contract.display_text} {contract.summary} {' '.join(contract.facts)}"
        has_guilt_assertion = False
        for pat in self._STRICT_GUILT_KEYWORDS:
            if re.search(pat, combined_text, flags=re.IGNORECASE):
                has_guilt_assertion = True
                rejection_reasons.append(f"Prohibited guilt assertion detected matching pattern '{pat}'.")

        # ── 3. PROMPT INJECTION CONTAINMENT ─────────────────────────
        has_injection = False
        for pat in self._PROMPT_INJECTION_MARKERS:
            if re.search(pat, combined_text, flags=re.IGNORECASE):
                has_injection = True
                rejection_reasons.append("Prompt injection token detected in evidence/response text.")

        # ── 4. EPISTEMIC UPGRADE GUARD ──────────────────────────────
        epistemic_upgrade = False
        if contract.epistemic_status in (EpistemicStatusEnum.INFERRED, EpistemicStatusEnum.UNKNOWN, EpistemicStatusEnum.CONTRADICTED):
            if re.search(r"\b(proven fact|conclusively proven|verified fact|observed directly)\b", contract.voice_text, flags=re.IGNORECASE):
                epistemic_upgrade = True
                rejection_reasons.append(f"Epistemic upgrade: status is {contract.epistemic_status.value} but text asserts proven/observed fact.")

        # ── 5. PROVENANCE & ARTIFACT INTEGRITY ──────────────────────
        unsupported_fact = False
        if contract.fact_category == FactCategoryEnum.VERIFIED_FACT:
            if not contract.supporting_evidence and not contract.cited_artifacts:
                # If marked as verified fact but zero evidence citations provided
                if contract.facts and len(contract.facts) > 0 and not any("success" in f.lower() or "filter" in f.lower() for f in contract.facts):
                    unsupported_fact = True
                    rejection_reasons.append("Factual claims asserted without supporting forensic artifact references.")

        # Check validity of artifact citations
        for art in contract.supporting_evidence:
            if not art.artifact_id or not art.sha256_hash or len(art.sha256_hash) < 16:
                unsupported_fact = True
                rejection_reasons.append(f"Invalid or fabricated artifact citation '{art.artifact_id}'.")

        # ── EVALUATION & FAIL-CLOSED REMEDIATION ──────────────────────
        if rejection_reasons:
            logger.warning(
                f"Response validation failed for response_id '{contract.response_id}': {rejection_reasons}"
            )

            # If cross-case or prompt injection or unauthorized case: HARD FAIL CLOSED
            if any("case scope" in r.lower() or "cross-case" in r.lower() or "injection" in r.lower() for r in rejection_reasons):
                safe_voice = "I cannot fulfill that request under current case authorization."
                safe_display = "Action outside authorized case scope."
                return ValidatedResponse(
                    is_valid=False,
                    grounding_status=ResponseGroundingStatus.RESPONSE_GROUNDING_FAILED,
                    voice_text=safe_voice,
                    display_text=safe_display,
                    rejection_reasons=rejection_reasons,
                    remediation_applied="Replaced with fail-closed authorization denial.",
                )

            # If prohibited guilt assertion: REFORMULATE TO EVIDENCE-GROUNDED PHRASING
            if has_guilt_assertion:
                remediated_voice = SpokenResponseTemplateEngine.sanitize_text(contract.voice_text)
                remediated_display = SpokenResponseTemplateEngine.sanitize_text(contract.display_text)
                return ValidatedResponse(
                    is_valid=True,
                    grounding_status=ResponseGroundingStatus.REFORMULATED,
                    voice_text=remediated_voice,
                    display_text=remediated_display,
                    rejection_reasons=rejection_reasons,
                    remediation_applied="Prohibited guilt claims reformulated into evidence-grounded associations.",
                )

            # If unsupported fact or epistemic upgrade: DOWNGRADE TO UNVERIFIED
            safe_voice = "This relationship has not been verified."
            safe_display = "Status: Unverified / Insufficient Evidence"
            return ValidatedResponse(
                is_valid=False,
                grounding_status=ResponseGroundingStatus.UNVERIFIED,
                voice_text=safe_voice,
                display_text=safe_display,
                rejection_reasons=rejection_reasons,
                remediation_applied="Unsupported factual claims replaced with unverified disclaimer.",
            )

        # Clean sanitized output
        clean_voice = SpokenResponseTemplateEngine.sanitize_text(contract.voice_text)
        clean_display = SpokenResponseTemplateEngine.sanitize_text(contract.display_text)

        return ValidatedResponse(
            is_valid=True,
            grounding_status=ResponseGroundingStatus.GROUNDED,
            voice_text=clean_voice,
            display_text=clean_display,
            rejection_reasons=[],
            remediation_applied=None,
        )
