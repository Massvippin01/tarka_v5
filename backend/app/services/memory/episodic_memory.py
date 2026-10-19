"""
SentinelX Tier 2 — Governed Episodic Investigation Memory.

Episodic memory captures the chronological event stream of the investigation:
- What the investigator inspected, filtered, or decided
- Agent execution runs and governed findings
- Contradiction detections and status changes
- Evidence gap synthesis and fulfillments
- Voice turns and multimodal command executions
- Statutory confirmations and audit events

CRITICAL INVARIANTS:
1. Append-only: historical events are never deleted or modified.
2. Direct lineage: every episodic record references an authoritative audit event,
   investigation delta, or user action.
3. Epistemic preservation:
   - Investigator actions are OBSERVED
   - Agent findings start as PROPOSED
   - Accepted findings become CORROBORATED
   - Rejected hypotheses/findings become CONTRADICTED
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional

from app.domain.canonical_evidence_ir import generate_uuid7
from app.domain.memory import (
    InvestigatorDecision,
    MemoryEpistemicStatus,
    MemoryProvenance,
    MemoryRecord,
    MemoryScope,
    MemorySensitivity,
    MemoryStatus,
    MemoryTier,
    MemoryValidity,
)

logger = logging.getLogger("sentinelx.memory.episodic")


class EpisodicMemoryManager:
    """Builder and projector for Tier 2 episodic memory records."""

    @staticmethod
    def create_investigator_action_record(
        case_id: str,
        investigator_id: str,
        action_name: str,
        target_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        audit_event_id: Optional[str] = None,
        jurisdiction: str = "NATIONAL_CYBER_CRIME_COORDINATION",
    ) -> MemoryRecord:
        """Create an episodic memory record for a human investigator action."""
        now = datetime.now(UTC).isoformat()
        audit_id = audit_event_id or f"AUDIT-{generate_uuid7()[:8]}"
        
        content = f"Investigator {investigator_id} executed action '{action_name}'"
        if target_id:
            content += f" on target {target_id}"

        provenance = MemoryProvenance(
            source_type="INVESTIGATOR_ACTION",
            source_ids=[audit_id],
            state_delta_ids=[],
            created_by=investigator_id,
            created_at=now,
        )
        provenance.lineage_hash = provenance.compute_hash()

        return MemoryRecord(
            tier=MemoryTier.EPISODIC,
            scope=MemoryScope.CASE,
            case_id=case_id,
            jurisdiction=jurisdiction,
            subject_entity_ids=[target_id] if target_id else [],
            content=content,
            structured_payload={
                "action_name": action_name,
                "target_id": target_id,
                "details": details or {},
                "audit_event_id": audit_id,
            },
            epistemic_status=MemoryEpistemicStatus.OBSERVED,
            confidence=1.0,
            provenance=provenance,
            validity=MemoryValidity(observed_at=now, valid_from=now),
            created_by=investigator_id,
            source_type="INVESTIGATOR_ACTION",
            source_ids=[audit_id],
            sensitivity=MemorySensitivity.RESTRICTED,
            status=MemoryStatus.ACTIVE,
        )

    @staticmethod
    def create_agent_finding_record(
        case_id: str,
        agent_id: str,
        task_id: str,
        finding_id: str,
        finding_type: str,
        summary: str,
        epistemic_status: MemoryEpistemicStatus = MemoryEpistemicStatus.PROPOSED,
        confidence: float = 0.7,
        supporting_evidence_ids: Optional[List[str]] = None,
        supporting_fact_ids: Optional[List[str]] = None,
        jurisdiction: str = "NATIONAL_CYBER_CRIME_COORDINATION",
    ) -> MemoryRecord:
        """Create an episodic memory record for a governed multi-agent finding."""
        now = datetime.now(UTC).isoformat()
        ev_ids = supporting_evidence_ids or []
        fact_ids = supporting_fact_ids or []

        provenance = MemoryProvenance(
            source_type="AGENT_RESULT",
            source_ids=[task_id, finding_id],
            evidence_ids=ev_ids,
            fact_ids=fact_ids,
            created_by=f"agent:{agent_id}",
            created_at=now,
        )
        provenance.lineage_hash = provenance.compute_hash()

        return MemoryRecord(
            tier=MemoryTier.EPISODIC,
            scope=MemoryScope.CASE,
            case_id=case_id,
            jurisdiction=jurisdiction,
            content=f"Agent '{agent_id}' produced {finding_type}: {summary}",
            structured_payload={
                "agent_id": agent_id,
                "task_id": task_id,
                "finding_id": finding_id,
                "finding_type": finding_type,
                "summary": summary,
            },
            epistemic_status=epistemic_status,
            confidence=confidence,
            provenance=provenance,
            validity=MemoryValidity(observed_at=now, valid_from=now),
            created_by=f"agent:{agent_id}",
            source_type="AGENT_RESULT",
            source_ids=[task_id, finding_id],
            evidence_ids=ev_ids,
            fact_ids=fact_ids,
            sensitivity=MemorySensitivity.RESTRICTED,
            status=MemoryStatus.ACTIVE,
        )

    @staticmethod
    def create_decision_record(
        case_id: str,
        decision: InvestigatorDecision,
        jurisdiction: str = "NATIONAL_CYBER_CRIME_COORDINATION",
    ) -> MemoryRecord:
        """Create an episodic memory record for a statutory/investigative human decision."""
        now = datetime.now(UTC).isoformat()
        
        # Epistemic standing depends on decision type
        if "REJECT" in decision.decision_type:
            epistemic = MemoryEpistemicStatus.CONTRADICTED
        elif "ENDORSE" in decision.decision_type:
            epistemic = MemoryEpistemicStatus.CORROBORATED
        else:
            epistemic = MemoryEpistemicStatus.OBSERVED

        provenance = MemoryProvenance(
            source_type="INVESTIGATOR_ACTION",
            source_ids=[decision.decision_id],
            created_by=decision.investigator_id,
            created_at=decision.timestamp or now,
        )
        provenance.lineage_hash = provenance.compute_hash()

        return MemoryRecord(
            tier=MemoryTier.EPISODIC,
            scope=MemoryScope.CASE,
            case_id=case_id,
            jurisdiction=jurisdiction,
            subject_entity_ids=[decision.target_id],
            content=f"Decision {decision.decision_type} on {decision.target_id}: {decision.rationale}",
            structured_payload={
                "decision_id": decision.decision_id,
                "decision_type": decision.decision_type,
                "target_id": decision.target_id,
                "rationale": decision.rationale,
            },
            epistemic_status=epistemic,
            confidence=1.0,
            provenance=provenance,
            validity=MemoryValidity(observed_at=decision.timestamp or now, valid_from=decision.timestamp or now),
            created_by=decision.investigator_id,
            source_type="INVESTIGATOR_ACTION",
            source_ids=[decision.decision_id],
            sensitivity=MemorySensitivity.RESTRICTED,
            status=MemoryStatus.ACTIVE,
        )

    @staticmethod
    def create_contradiction_record(
        case_id: str,
        contradiction_id: str,
        summary: str,
        conflicting_fact_ids: List[str],
        jurisdiction: str = "NATIONAL_CYBER_CRIME_COORDINATION",
    ) -> MemoryRecord:
        """Create an episodic memory record for a detected evidential contradiction."""
        now = datetime.now(UTC).isoformat()
        provenance = MemoryProvenance(
            source_type="INVESTIGATION_DELTA",
            source_ids=[contradiction_id],
            fact_ids=conflicting_fact_ids,
            created_by="CONTRADICTION_DETECTOR",
            created_at=now,
        )
        provenance.lineage_hash = provenance.compute_hash()

        return MemoryRecord(
            tier=MemoryTier.EPISODIC,
            scope=MemoryScope.CASE,
            case_id=case_id,
            jurisdiction=jurisdiction,
            content=f"Contradiction detected [{contradiction_id}]: {summary}",
            structured_payload={
                "contradiction_id": contradiction_id,
                "summary": summary,
                "conflicting_fact_ids": conflicting_fact_ids,
            },
            epistemic_status=MemoryEpistemicStatus.CONTRADICTED,
            confidence=1.0,
            provenance=provenance,
            validity=MemoryValidity(observed_at=now, valid_from=now),
            created_by="CONTRADICTION_DETECTOR",
            source_type="INVESTIGATION_DELTA",
            source_ids=[contradiction_id],
            fact_ids=conflicting_fact_ids,
            sensitivity=MemorySensitivity.RESTRICTED,
            status=MemoryStatus.ACTIVE,
        )

    @staticmethod
    def create_evidence_gap_record(
        case_id: str,
        gap_id: str,
        description: str,
        target_entity_ids: Optional[List[str]] = None,
        jurisdiction: str = "NATIONAL_CYBER_CRIME_COORDINATION",
    ) -> MemoryRecord:
        """Create an episodic memory record for an identified evidence gap."""
        now = datetime.now(UTC).isoformat()
        target_eids = target_entity_ids or []
        provenance = MemoryProvenance(
            source_type="INVESTIGATION_STATE",
            source_ids=[gap_id],
            created_by="GAP_SYNTHESIZER",
            created_at=now,
        )
        provenance.lineage_hash = provenance.compute_hash()

        return MemoryRecord(
            tier=MemoryTier.EPISODIC,
            scope=MemoryScope.CASE,
            case_id=case_id,
            jurisdiction=jurisdiction,
            subject_entity_ids=target_eids,
            content=f"Evidence gap identified [{gap_id}]: {description}",
            structured_payload={
                "gap_id": gap_id,
                "description": description,
                "target_entity_ids": target_eids,
            },
            epistemic_status=MemoryEpistemicStatus.REQUIRES_VERIFICATION,
            confidence=1.0,
            provenance=provenance,
            validity=MemoryValidity(observed_at=now, valid_from=now),
            created_by="GAP_SYNTHESIZER",
            source_type="INVESTIGATION_STATE",
            source_ids=[gap_id],
            sensitivity=MemorySensitivity.RESTRICTED,
            status=MemoryStatus.ACTIVE,
        )

    @staticmethod
    def create_voice_turn_record(
        case_id: str,
        investigator_id: str,
        intent: str,
        transcript: str,
        correlation_id: str,
        jurisdiction: str = "NATIONAL_CYBER_CRIME_COORDINATION",
    ) -> MemoryRecord:
        """Create an episodic record for an executed voice command turn."""
        now = datetime.now(UTC).isoformat()
        provenance = MemoryProvenance(
            source_type="INVESTIGATOR_ACTION",
            source_ids=[f"VOICE-{correlation_id[:8]}"],
            created_by=investigator_id,
            created_at=now,
        )
        provenance.lineage_hash = provenance.compute_hash()

        return MemoryRecord(
            tier=MemoryTier.EPISODIC,
            scope=MemoryScope.CASE,
            case_id=case_id,
            jurisdiction=jurisdiction,
            content=f"Voice command by {investigator_id} [intent={intent}]: '{transcript}'",
            structured_payload={
                "intent": intent,
                "transcript": transcript,
                "correlation_id": correlation_id,
            },
            epistemic_status=MemoryEpistemicStatus.OBSERVED,
            confidence=1.0,
            provenance=provenance,
            validity=MemoryValidity(observed_at=now, valid_from=now),
            created_by=investigator_id,
            source_type="INVESTIGATOR_ACTION",
            source_ids=[f"VOICE-{correlation_id[:8]}"],
            sensitivity=MemorySensitivity.RESTRICTED,
            status=MemoryStatus.ACTIVE,
        )

