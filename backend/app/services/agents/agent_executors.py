"""
SentinelX Agent Executors.

Concrete executor implementations for each investigative agent type.
Each executor wraps existing SentinelX engines (ContradictionEngine,
EvidenceGapEngine, LiveProofEngine, etc.) and produces governed
AgentFindings with explicit evidence lineage.

CRITICAL: Executors NEVER directly mutate investigation state.
They produce findings that enter the evidence graph as PROPOSALS.
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import List, Optional

from app.domain.agent import (
    AgentDefinition,
    AgentFinding,
    AgentTask,
    AgentType,
    FindingType,
)
from app.domain.canonical_evidence_ir import (
    EpistemicStatus,
    SourceReliability,
    generate_uuid7,
)
from app.repositories.unified_store import UnifiedStore

logger = logging.getLogger("sentinelx.agents.executors")


class BaseAgentExecutor(ABC):
    """Abstract base for all agent executors."""

    def __init__(self, store: Optional[UnifiedStore] = None) -> None:
        self.store = store or UnifiedStore.get_instance()

    @abstractmethod
    def execute(self, task: AgentTask, agent: AgentDefinition) -> List[AgentFinding]:
        """Execute the agent task and return findings."""
        ...


# ── Evidence Analyst ─────────────────────────────────────────────────────


class EvidenceAnalystExecutor(BaseAgentExecutor):
    """
    Analyzes evidence artifacts for correlations and provenance integrity.
    Wraps existing LiveProofEngine for provenance verification.
    """

    def execute(self, task: AgentTask, agent: AgentDefinition) -> List[AgentFinding]:
        findings: List[AgentFinding] = []

        case_id = task.case_id
        task.budget.evidence_queries_used += 1

        # Get all artifacts for the case
        case_artifacts = [
            art for art in self.store.artifacts.values()
            if art.case_id == case_id
        ]

        if not case_artifacts:
            return findings

        # Analyze source diversity
        source_types = set()
        for art in case_artifacts:
            source_types.add(art.source_type.value)
            task.budget.evidence_queries_used += 1

        # Produce correlation findings for artifacts from different sources
        # that reference the same entities
        artifact_entity_map: dict = {}
        for art in case_artifacts:
            entities = art.metadata.get("associated_entities", [])
            for entity_id in entities:
                if entity_id not in artifact_entity_map:
                    artifact_entity_map[entity_id] = []
                artifact_entity_map[entity_id].append(art)

        for entity_id, arts in artifact_entity_map.items():
            if len(arts) >= 2 and not task.budget.is_exhausted():
                # Cross-source correlation detected
                source_set = {a.source_type.value for a in arts}
                if len(source_set) >= 2:
                    finding = AgentFinding(
                        finding_id=generate_uuid7(),
                        task_id=task.task_id,
                        agent_id=agent.agent_id,
                        agent_type=AgentType.EVIDENCE_ANALYST,
                        finding_type=FindingType.EVIDENCE_CORRELATION,
                        title=f"Cross-source evidence correlation for entity {entity_id}",
                        description=(
                            f"Entity {entity_id} appears in {len(arts)} artifacts across "
                            f"{len(source_set)} source types ({', '.join(source_set)}). "
                            f"Cross-source corroboration strengthens attribution."
                        ),
                        evidence_ids=[a.artifact_id for a in arts],
                        artifact_ids=[a.artifact_id for a in arts],
                        related_entity_ids=[entity_id],
                        epistemic_status=EpistemicStatus.INFERENCE,
                        confidence=min(0.9, 0.5 + 0.15 * len(arts)),
                        source_reliability=SourceReliability.B_USUALLY_RELIABLE,
                        case_id=case_id,
                        reasoning_summary=(
                            f"Multiple independent sources ({', '.join(source_set)}) "
                            f"reference entity {entity_id}, providing cross-source corroboration."
                        ),
                    )
                    findings.append(finding)

        # Check provenance integrity using LiveProofEngine
        from app.services.live_proof_engine import LiveProofEngine
        proof_engine = LiveProofEngine(store=self.store)

        for claim_id, claim in self.store.claims.items():
            if claim.case_id == case_id and not task.budget.is_exhausted():
                task.budget.evidence_queries_used += 1
                try:
                    trace = proof_engine.trace_backward(claim_id)
                    if not trace.is_valid:
                        finding = AgentFinding(
                            finding_id=generate_uuid7(),
                            task_id=task.task_id,
                            agent_id=agent.agent_id,
                            agent_type=AgentType.EVIDENCE_ANALYST,
                            finding_type=FindingType.PROVENANCE_ISSUE,
                            title=f"Provenance integrity gap for claim {claim_id}",
                            description=(
                                f"Backward trace for claim '{claim.assertion_text[:80]}' "
                                f"revealed integrity issues: {', '.join(trace.errors)}"
                            ),
                            evidence_ids=[claim_id],
                            supporting_fact_ids=claim.supporting_fact_ids[:5],
                            epistemic_status=EpistemicStatus.INFERENCE,
                            confidence=0.7,
                            source_reliability=SourceReliability.C_FAIRLY_RELIABLE,
                            case_id=case_id,
                            recommended_action="Verify provenance chain and re-validate artifact hashes.",
                            reasoning_summary=f"LiveProof backward trace: {len(trace.steps)} steps, valid={trace.is_valid}",
                        )
                        findings.append(finding)
                except Exception as e:
                    logger.debug(f"Proof trace skipped for {claim_id}: {e}")

        return findings


# ── Entity Analyst ───────────────────────────────────────────────────────


class EntityAnalystExecutor(BaseAgentExecutor):
    """
    Analyzes entity relationships and proposes linkages.
    NEVER performs automatic identity merges.
    """

    def execute(self, task: AgentTask, agent: AgentDefinition) -> List[AgentFinding]:
        findings: List[AgentFinding] = []
        case_id = task.case_id

        # Get all persons and look for potential linkage candidates
        persons = list(self.store.persons.values())
        task.budget.evidence_queries_used += 1

        # Check for name similarity / transliteration candidates
        for i in range(len(persons)):
            if task.budget.is_exhausted():
                break
            for j in range(i + 1, len(persons)):
                if task.budget.is_exhausted():
                    break

                p1 = persons[i]
                p2 = persons[j]
                task.budget.graph_traversals_used += 1

                # Simple phonetic/transliteration similarity check
                name1 = getattr(p1, "name", "").lower()
                name2 = getattr(p2, "name", "").lower()

                if not name1 or not name2:
                    continue

                # Check for similar names (basic approach)
                # E.g., "Vikram" vs "Bikram" — 1 character difference
                if self._names_similar(name1, name2):
                    # Get supporting evidence for both persons
                    facts_p1 = self.store.get_facts_by_subject(p1.id)
                    facts_p2 = self.store.get_facts_by_subject(p2.id)
                    task.budget.evidence_queries_used += 2

                    supporting_facts = [f.fact_id for f in facts_p1[:3]] + [f.fact_id for f in facts_p2[:3]]

                    finding = AgentFinding(
                        finding_id=generate_uuid7(),
                        task_id=task.task_id,
                        agent_id=agent.agent_id,
                        agent_type=AgentType.ENTITY_ANALYST,
                        finding_type=FindingType.ENTITY_LINKAGE_PROPOSED,
                        title=f"Potential identity linkage: {name1} ↔ {name2}",
                        description=(
                            f"Names '{getattr(p1, 'name', p1.id)}' ({p1.id}) and "
                            f"'{getattr(p2, 'name', p2.id)}' ({p2.id}) show high "
                            f"phonetic/transliteration similarity. "
                            f"REQUIRES manual biometric verification before any merge."
                        ),
                        evidence_ids=[p1.id, p2.id],
                        supporting_fact_ids=supporting_facts,
                        related_entity_ids=[p1.id, p2.id],
                        epistemic_status=EpistemicStatus.HYPOTHESIS,
                        confidence=0.6,
                        source_reliability=SourceReliability.C_FAIRLY_RELIABLE,
                        case_id=case_id,
                        requires_human_review=True,
                        recommended_action="Perform biometric Aadhaar de-duplication or fingerprint comparison.",
                        reasoning_summary=(
                            f"Name similarity detected between {p1.id} and {p2.id}. "
                            f"Automated merge is PROHIBITED. Human review required."
                        ),
                    )
                    findings.append(finding)

        return findings

    @staticmethod
    def _names_similar(name1: str, name2: str) -> bool:
        """Basic string similarity check for transliteration candidates."""
        if name1 == name2:
            return False
        # Check Levenshtein-like distance
        words1 = name1.split()
        words2 = name2.split()
        if len(words1) != len(words2):
            return False
        similar_count = 0
        for w1, w2 in zip(words1, words2):
            if w1 == w2:
                similar_count += 1
            elif abs(len(w1) - len(w2)) <= 1:
                # Simple character diff
                diffs = sum(1 for a, b in zip(w1, w2) if a != b)
                diffs += abs(len(w1) - len(w2))
                if diffs <= 2:
                    similar_count += 1
        return similar_count >= len(words1) - 1 and len(words1) >= 1


# ── Timeline Analyst ─────────────────────────────────────────────────────


class TimelineAnalystExecutor(BaseAgentExecutor):
    """
    Reconstructs temporal sequences and detects anomalies.
    Wraps TemporalSpatialConsistencyEngine for kinematic analysis.
    """

    def execute(self, task: AgentTask, agent: AgentDefinition) -> List[AgentFinding]:
        findings: List[AgentFinding] = []
        case_id = task.case_id

        # Get observations with temporal data
        observations = [
            obs for obs in self.store.evidence_observations.values()
            if obs.case_id == case_id and obs.observed_at
        ]
        task.budget.evidence_queries_used += 1

        if len(observations) < 2:
            return findings

        # Sort by time
        sorted_obs = sorted(observations, key=lambda o: o.observed_at)

        # Check for temporal gaps (large time jumps with no evidence)
        from app.services.temporal_spatial_consistency_engine import (
            TemporalSpatialConsistencyEngine,
        )
        tsc = TemporalSpatialConsistencyEngine()

        for i in range(len(sorted_obs) - 1):
            if task.budget.is_exhausted():
                break

            o1 = sorted_obs[i]
            o2 = sorted_obs[i + 1]
            task.budget.graph_traversals_used += 1

            dt1 = tsc.parse_datetime(o1.observed_at)
            dt2 = tsc.parse_datetime(o2.observed_at)
            if not dt1 or not dt2:
                continue

            gap_seconds = abs((dt2 - dt1).total_seconds())

            # Flag large temporal gaps (> 2 hours with no observations)
            if gap_seconds > 7200:
                finding = AgentFinding(
                    finding_id=generate_uuid7(),
                    task_id=task.task_id,
                    agent_id=agent.agent_id,
                    agent_type=AgentType.TIMELINE_ANALYST,
                    finding_type=FindingType.TIMELINE_ANOMALY,
                    title=f"Temporal coverage gap: {gap_seconds/3600:.1f}h between observations",
                    description=(
                        f"Gap of {gap_seconds/3600:.1f} hours detected between "
                        f"observation '{o1.observation_type}' at {o1.observed_at} and "
                        f"'{o2.observation_type}' at {o2.observed_at}. "
                        f"No evidence coverage during this window."
                    ),
                    evidence_ids=[o1.observation_id, o2.observation_id],
                    artifact_ids=[o1.artifact_id, o2.artifact_id],
                    epistemic_status=EpistemicStatus.INFERENCE,
                    confidence=0.8,
                    source_reliability=SourceReliability.B_USUALLY_RELIABLE,
                    case_id=case_id,
                    recommended_action=f"Seek additional evidence sources for the {gap_seconds/3600:.1f}h window.",
                    reasoning_summary=(
                        f"Temporal gap analysis: {len(sorted_obs)} observations sorted. "
                        f"Gap at index {i}-{i+1} exceeds 2-hour threshold."
                    ),
                )
                findings.append(finding)

        return findings


# ── Contradiction Analyst ────────────────────────────────────────────────


class ContradictionAnalystExecutor(BaseAgentExecutor):
    """
    Detects contradictions across evidence sources.
    Wraps the existing ContradictionEngine.
    NEVER silently resolves contradictions.
    """

    def execute(self, task: AgentTask, agent: AgentDefinition) -> List[AgentFinding]:
        findings: List[AgentFinding] = []
        case_id = task.case_id

        from app.services.contradiction_engine import ContradictionEngine
        engine = ContradictionEngine(store=self.store)

        task.budget.evidence_queries_used += 1
        detected = engine.scan_case(case_id)

        for contra in detected:
            if task.budget.is_exhausted():
                break

            finding = AgentFinding(
                finding_id=generate_uuid7(),
                task_id=task.task_id,
                agent_id=agent.agent_id,
                agent_type=AgentType.CONTRADICTION_ANALYST,
                finding_type=FindingType.CONTRADICTION_DETECTED,
                title=f"Contradiction: {contra.contradiction_type.value} — {contra.reason[:80]}",
                description=(
                    f"Contradiction detected between '{contra.fact_a}' and '{contra.fact_b}': "
                    f"{contra.reason} "
                    f"Severity: {contra.severity.value}. "
                    f"BOTH observations preserved for human review."
                ),
                evidence_ids=[contra.fact_a, contra.fact_b],
                supporting_fact_ids=[contra.contradiction_id],
                epistemic_status=EpistemicStatus.FACT,
                confidence=0.9,
                source_reliability=SourceReliability.B_USUALLY_RELIABLE,
                uncertainty=contra.uncertainty,
                case_id=case_id,
                requires_human_review=True,
                recommended_action=contra.required_verification or "Cross-verify conflicting observations.",
                reasoning_summary=(
                    f"ContradictionEngine scan detected {contra.contradiction_type.value} "
                    f"conflict with severity {contra.severity.value}. "
                    f"No automatic resolution attempted."
                ),
            )
            findings.append(finding)

        return findings


# ── Gap Analyst ──────────────────────────────────────────────────────────


class GapAnalystExecutor(BaseAgentExecutor):
    """
    Identifies missing evidence requirements.
    Wraps the existing EvidenceGapEngine.
    """

    def execute(self, task: AgentTask, agent: AgentDefinition) -> List[AgentFinding]:
        findings: List[AgentFinding] = []
        case_id = task.case_id

        from app.services.evidence_gap_engine import EvidenceGapEngine
        engine = EvidenceGapEngine(store=self.store)

        task.budget.evidence_queries_used += 1
        gaps = engine.synthesize_gaps_for_case(case_id)

        for gap in gaps:
            if task.budget.is_exhausted():
                break

            finding = AgentFinding(
                finding_id=generate_uuid7(),
                task_id=task.task_id,
                agent_id=agent.agent_id,
                agent_type=AgentType.GAP_ANALYST,
                finding_type=FindingType.EVIDENCE_GAP_IDENTIFIED,
                title=f"Evidence gap: {gap.title}",
                description=(
                    f"{gap.description} "
                    f"Impact: {gap.impact} "
                    f"Severity: {gap.severity}."
                ),
                evidence_ids=gap.available_evidence_ids or [gap.gap_id],
                supporting_fact_ids=[gap.gap_id],
                artifact_ids=gap.available_evidence_ids,
                epistemic_status=EpistemicStatus.INFERENCE,
                confidence=0.85,
                source_reliability=SourceReliability.B_USUALLY_RELIABLE,
                case_id=case_id,
                requires_human_review=True,
                recommended_action=gap.recommended_action,
                reasoning_summary=(
                    f"EvidenceGapEngine deduced gap type {gap.gap_type.value}: "
                    f"required={gap.required_evidence_type}, "
                    f"missing={gap.missing_evidence_description[:80]}"
                ),
            )
            findings.append(finding)

        return findings


# ── Executor Factory ─────────────────────────────────────────────────────


_EXECUTOR_MAP = {
    AgentType.EVIDENCE_ANALYST: EvidenceAnalystExecutor,
    AgentType.ENTITY_ANALYST: EntityAnalystExecutor,
    AgentType.TIMELINE_ANALYST: TimelineAnalystExecutor,
    AgentType.CONTRADICTION_ANALYST: ContradictionAnalystExecutor,
    AgentType.GAP_ANALYST: GapAnalystExecutor,
}


def get_executor(agent_type: AgentType) -> BaseAgentExecutor:
    """Factory function to get the appropriate executor for an agent type."""
    executor_cls = _EXECUTOR_MAP.get(agent_type)
    if not executor_cls:
        raise ValueError(f"No executor registered for agent type: {agent_type.value}")
    return executor_cls()
