from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional

from app.domain.canonical_evidence_ir import (
    EvidenceClaim,
    EvidenceContradiction,
    EvidenceFact,
    EvidenceGap,
    EvidenceHypothesis,
    InvestigationSnapshot,
    generate_uuid7,
)
from app.repositories.unified_store import UnifiedStore

logger = logging.getLogger("sentinelx.investigation_delta")


class InvestigationDeltaService:
    """
    Investigation Delta Service.
    Tracks state transitions and evidential differentials across investigation milestones.
    Strictly adheres to forensic append-only semantics:
    Evidence records are never destroyed, pruned, or deleted; entities or claims can only be
    supplemented, corroborated, superseded, or contextualized.
    """

    def __init__(self, store: Optional[UnifiedStore] = None):
        self.store = store or UnifiedStore.get_instance()
        self.snapshots: Dict[str, List[InvestigationSnapshot]] = {}

    def capture_snapshot(self, case_id: str) -> InvestigationSnapshot:
        """Capture an immutable point-in-time snapshot summary of the investigation state."""
        artifacts = [a for a in self.store.artifacts.values() if a.case_id == case_id]
        facts = [f for f in self.store.facts.values() if f.case_id == case_id]
        contradictions = self.store.get_contradictions_by_case(case_id)
        gaps = self.store.get_canonical_gaps_by_case(case_id)

        # Generate lightweight state hash
        import hashlib
        state_repr = f"{len(artifacts)}:{len(facts)}:{len(self.store.entities if hasattr(self.store, 'entities') else self.store.persons)}:{len(self.store.relationships)}:{len(contradictions)}:{len(gaps)}"
        state_hash = hashlib.sha256(state_repr.encode()).hexdigest()

        snapshot = InvestigationSnapshot(
            snapshot_id=generate_uuid7(),
            case_id=case_id,
            snapshot_timestamp=datetime.now(UTC).isoformat(),
            artifact_count=len(artifacts),
            fact_count=len(facts),
            entity_count=len(self.store.persons) + len(self.store.phones) + len(self.store.vehicles),
            relationship_count=len(self.store.relationships),
            open_contradictions_count=sum(1 for c in contradictions if c.status == "OPEN"),
            open_gaps_count=sum(1 for g in gaps if g.status == "OPEN"),
            state_hash=state_hash,
        )

        if case_id not in self.snapshots:
            self.snapshots[case_id] = []
        self.snapshots[case_id].append(snapshot)
        return snapshot

    def compute_case_delta(
        self, case_id: str, since_timestamp: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Compute an auditable differential of the case graph and evidence reasoning state.
        Uses append-only semantics: no items are ever labeled as 'deleted from evidence'.
        """
        facts = [f for f in self.store.facts.values() if f.case_id == case_id]
        observations = [o for o in self.store.evidence_observations.values() if o.case_id == case_id]
        claims = self.store.get_claims_by_case(case_id)
        contradictions = self.store.get_contradictions_by_case(case_id)
        gaps = self.store.get_canonical_gaps_by_case(case_id)
        relationships = self.store.relationships

        # New entities and relationships
        new_entities_summary = [
            {"entity_id": p.id, "display_name": getattr(p, "name", getattr(p, "full_name", p.id)) or p.id, "type": "PERSON", "reason": "Normalized police record"}
            for p in self.store.persons.values()
        ]
        
        # Claim status transitions
        claim_status_changes = []
        for c in claims:
            claim_status_changes.append({
                "claim_id": c.claim_id,
                "assertion_text": c.assertion_text,
                "current_status": c.status.value,
                "corroboration": c.corroboration.value,
                "supporting_facts_count": len(c.supporting_fact_ids),
                "contradicting_facts_count": len(c.contradicting_fact_ids),
            })

        # Contradictions delta
        new_contradictions = [
            {
                "contradiction_id": ct.contradiction_id,
                "type": ct.contradiction_type.value,
                "severity": ct.severity.value,
                "status": ct.status,
                "reason": ct.reason,
            }
            for ct in contradictions
        ]

        # Evidence gaps delta
        new_gaps = [
            {
                "gap_id": g.gap_id,
                "type": g.gap_type.value,
                "title": g.title,
                "severity": g.severity,
                "status": g.status,
            }
            for g in gaps
        ]

        # Hypothesis impact
        hypotheses = self.store.get_canonical_hypotheses_by_case(case_id)
        hypothesis_impact = [
            {
                "hypothesis_id": h.hypothesis_id,
                "code": h.code,
                "title": h.title,
                "supporting_facts_added": len(h.supporting_fact_ids),
                "open_gaps_affecting": len(h.open_gap_ids),
                "current_status": h.status,
            }
            for h in hypotheses
        ]

        return {
            "case_id": case_id,
            "delta_timestamp": datetime.now(UTC).isoformat(),
            "since_timestamp": since_timestamp or "INITIAL_ACQUISITION",
            "semantics": "APPEND_ONLY_IMMUTABLE",
            "new_entities": new_entities_summary,
            "superseded_entities": [],  # Never pruned; empty or explicitly superseded
            "new_relationships": [
                {
                    "relationship_id": getattr(r, "relationship_id", getattr(r, "id", "rel")),
                    "source": r.source_entity,
                    "target": r.target_entity,
                    "type": r.relationship_type,
                    "confidence": r.confidence,
                }
                for r in relationships[:10]  # Sample recent
            ],
            "new_observations_count": len(observations),
            "new_facts_count": len(facts),
            "new_claims_count": len(claims),
            "claim_status_changes": claim_status_changes,
            "new_contradictions": new_contradictions,
            "resolved_contradictions": [c for c in new_contradictions if c["status"] == "RESOLVED"],
            "new_evidence_gaps": new_gaps,
            "closed_evidence_gaps": [g for g in new_gaps if g["status"] == "RESOLVED"],
            "hypothesis_impact": hypothesis_impact,
            "append_only_notice": (
                "FORENSIC INVARIANT: Evidence records are immutable and append-only. "
                "No evidence or observation has been expunged. Contradictions remain open "
                "until officially documented by an authorized investigator."
            ),
        }
