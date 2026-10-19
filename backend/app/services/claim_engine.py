from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from datetime import UTC, datetime

from app.domain.canonical_evidence_ir import (
    ClaimStatus,
    CorroborationLevel,
    EpistemicStatus,
    EvidenceClaim,
    EvidenceFact,
    SourceReliability,
    generate_uuid7,
)
from app.repositories.unified_store import UnifiedStore

logger = logging.getLogger("sentinelx.claims")


class ClaimEngine:
    """
    Epistemic Claim Engine.
    Manages the lifecycle and justification status of claims derived from evidence.
    Enforces strict forensic epistemology:
      - Valid statuses: PROPOSED, SUPPORTED, CORROBORATED, CONTRADICTED, UNVERIFIED, RESOLVED, SUPERSEDED.
      - Strictly avoids binary or accusatory labels (TRUE, FALSE, GUILTY, INNOCENT).
    """

    def __init__(self, store: Optional[UnifiedStore] = None):
        self.store = store or UnifiedStore.get_instance()

    def create_claim(
        self,
        case_id: str,
        assertion_text: str,
        claim_type: EpistemicStatus = EpistemicStatus.INFERENCE,
        supporting_fact_ids: Optional[List[str]] = None,
        contradicting_fact_ids: Optional[List[str]] = None,
        analytical_method: str = "MULTI_SOURCE_GRAPH_REASONING",
    ) -> EvidenceClaim:
        sup_ids = supporting_fact_ids or []
        contra_ids = contradicting_fact_ids or []

        # Extract supporting and contradicting artifacts
        sup_artifacts = []
        for fid in sup_ids:
            fact = self.store.get_fact(fid)
            if fact and fact.source_artifact_id not in sup_artifacts:
                sup_artifacts.append(fact.source_artifact_id)

        contra_artifacts = []
        for fid in contra_ids:
            fact = self.store.get_fact(fid)
            if fact and fact.source_artifact_id not in contra_artifacts:
                contra_artifacts.append(fact.source_artifact_id)

        claim = EvidenceClaim(
            claim_id=generate_uuid7(),
            case_id=case_id,
            assertion_text=assertion_text,
            epistemic_status=claim_type,
            supporting_fact_ids=sup_ids,
            contradicting_fact_ids=contra_ids,
            supporting_artifact_ids=sup_artifacts,
            contradicting_artifact_ids=contra_artifacts,
            analytical_method=analytical_method,
            status=ClaimStatus.PROPOSED,
        )

        self.evaluate_claim(claim)
        self.store.save_claim(claim)
        return claim

    def evaluate_claim(self, claim: EvidenceClaim) -> ClaimStatus:
        """
        Deterministically evaluate claim justification status based on supporting and contradicting facts.
        """
        sup_facts = [self.store.get_fact(fid) for fid in claim.supporting_fact_ids if self.store.get_fact(fid)]
        contra_facts = [self.store.get_fact(fid) for fid in claim.contradicting_fact_ids if self.store.get_fact(fid)]

        # Check for contradictions first
        if len(contra_facts) > 0:
            claim.status = ClaimStatus.CONTRADICTED
            claim.corroboration = CorroborationLevel.CONTRADICTED
            claim.confidence_score = max(0.1, 0.5 - (0.2 * len(contra_facts)))
            return claim.status

        # Check corroboration across independent artifacts
        distinct_artifacts = {f.source_artifact_id for f in sup_facts}
        if len(distinct_artifacts) >= 2:
            claim.status = ClaimStatus.CORROBORATED
            claim.corroboration = CorroborationLevel.CORROBORATED
            claim.confidence_score = min(0.99, 0.70 + (0.10 * len(distinct_artifacts)))
        elif len(sup_facts) >= 1:
            claim.status = ClaimStatus.SUPPORTED
            claim.corroboration = CorroborationLevel.SINGLE_SOURCE
            claim.confidence_score = 0.65
        else:
            claim.status = ClaimStatus.UNVERIFIED
            claim.corroboration = CorroborationLevel.UNSPECIFIED
            claim.confidence_score = 0.20

        # Assess source reliability aggregate
        reliabilities = [f.source_reliability for f in sup_facts]
        if SourceReliability.A_COMPLETELY_RELIABLE in reliabilities:
            claim.source_reliability = SourceReliability.A_COMPLETELY_RELIABLE
        elif SourceReliability.B_USUALLY_RELIABLE in reliabilities:
            claim.source_reliability = SourceReliability.B_USUALLY_RELIABLE
        else:
            claim.source_reliability = SourceReliability.C_FAIRLY_RELIABLE

        return claim.status

    def attach_supporting_fact(self, claim_id: str, fact_id: str) -> Optional[EvidenceClaim]:
        claim = self.store.get_claim(claim_id)
        if not claim:
            return None
        if fact_id not in claim.supporting_fact_ids:
            claim.supporting_fact_ids.append(fact_id)
            fact = self.store.get_fact(fact_id)
            if fact and fact.source_artifact_id not in claim.supporting_artifact_ids:
                claim.supporting_artifact_ids.append(fact.source_artifact_id)
        self.evaluate_claim(claim)
        return claim

    def attach_contradicting_fact(self, claim_id: str, fact_id: str) -> Optional[EvidenceClaim]:
        claim = self.store.get_claim(claim_id)
        if not claim:
            return None
        if fact_id not in claim.contradicting_fact_ids:
            claim.contradicting_fact_ids.append(fact_id)
            fact = self.store.get_fact(fact_id)
            if fact and fact.source_artifact_id not in claim.contradicting_artifact_ids:
                claim.contradicting_artifact_ids.append(fact.source_artifact_id)
        self.evaluate_claim(claim)
        return claim
