"""
SentinelX Agent Registry.

Canonical registry of all governed investigative agents.
Agents are registered with typed capabilities and resource constraints.
The registry is the ONLY source of truth for agent definitions.

No agent can execute tasks without being registered here.
"""
from __future__ import annotations

import logging
from typing import Dict, List, Optional

from app.domain.agent import (
    AgentCapability,
    AgentDefinition,
    AgentPolicy,
    AgentStatus,
    AgentType,
    FindingType,
    ResourceBudget,
)

logger = logging.getLogger("sentinelx.agents.registry")


class AgentRegistry:
    """
    Canonical registry for all governed investigative agents.
    
    Responsibilities:
    - Register and deregister agent definitions
    - Validate agent capability contracts
    - Enforce uniqueness (one active agent per AgentType)
    - Provide agent lookups for the AgentSupervisor
    - Maintain agent policies
    """

    _instance: Optional[AgentRegistry] = None

    def __init__(self) -> None:
        self._agents: Dict[str, AgentDefinition] = {}
        self._policies: Dict[AgentType, AgentPolicy] = {}
        self._type_index: Dict[AgentType, str] = {}  # AgentType -> agent_id
        self._bootstrap_canonical_agents()

    @classmethod
    def get_instance(cls) -> AgentRegistry:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """Reset singleton for testing."""
        cls._instance = None

    def register(self, agent: AgentDefinition) -> AgentDefinition:
        """
        Register a new agent definition.
        Enforces: one active agent per AgentType.
        """
        # Check for duplicate active agent of same type
        existing_id = self._type_index.get(agent.agent_type)
        if existing_id and existing_id != agent.agent_id:
            existing = self._agents.get(existing_id)
            if existing and existing.status == AgentStatus.ACTIVE:
                raise ValueError(
                    f"Agent type {agent.agent_type.value} already has an active agent: {existing.name} ({existing_id})"
                )

        agent.status = AgentStatus.ACTIVE
        self._agents[agent.agent_id] = agent
        self._type_index[agent.agent_type] = agent.agent_id
        logger.info(f"Registered agent: {agent.name} ({agent.agent_type.value}) -> {agent.agent_id}")
        return agent

    def deregister(self, agent_id: str) -> bool:
        """Mark an agent as deregistered. Does not delete from registry."""
        agent = self._agents.get(agent_id)
        if not agent:
            return False
        agent.status = AgentStatus.DEREGISTERED
        if self._type_index.get(agent.agent_type) == agent_id:
            del self._type_index[agent.agent_type]
        logger.info(f"Deregistered agent: {agent.name} ({agent_id})")
        return True

    def suspend(self, agent_id: str) -> bool:
        """Suspend an agent (e.g., due to policy violation or resource exhaustion)."""
        agent = self._agents.get(agent_id)
        if not agent:
            return False
        agent.status = AgentStatus.SUSPENDED
        logger.warning(f"Suspended agent: {agent.name} ({agent_id})")
        return True

    def get(self, agent_id: str) -> Optional[AgentDefinition]:
        return self._agents.get(agent_id)

    def get_by_type(self, agent_type: AgentType) -> Optional[AgentDefinition]:
        agent_id = self._type_index.get(agent_type)
        if agent_id:
            return self._agents.get(agent_id)
        return None

    def get_all_active(self) -> List[AgentDefinition]:
        return [a for a in self._agents.values() if a.status == AgentStatus.ACTIVE]

    def get_policy(self, agent_type: AgentType) -> Optional[AgentPolicy]:
        return self._policies.get(agent_type)

    def set_policy(self, policy: AgentPolicy) -> None:
        self._policies[policy.agent_type] = policy
        logger.info(f"Set policy for agent type: {policy.agent_type.value}")

    def list_agents(self) -> List[Dict]:
        return [
            {
                "agent_id": a.agent_id,
                "agent_type": a.agent_type.value,
                "name": a.name,
                "status": a.status.value,
                "version": a.version,
                "capabilities": len(a.capabilities),
            }
            for a in self._agents.values()
        ]

    # ── Bootstrap Canonical Agents ───────────────────────────────────────

    def _bootstrap_canonical_agents(self) -> None:
        """
        Register the five canonical investigative analyst agents.
        Each agent has typed capabilities, finding types, and resource budgets.
        """
        agents = [
            AgentDefinition(
                agent_type=AgentType.EVIDENCE_ANALYST,
                name="Evidence Analyst",
                description=(
                    "Analyzes evidence artifacts and facts for correlations, "
                    "corroborations, and provenance integrity. Traces evidence "
                    "lineage and validates source reliability."
                ),
                version="1.0.0",
                capabilities=[
                    AgentCapability(
                        name="evidence_correlation",
                        description="Correlate evidence artifacts across sources",
                        required_evidence_access=["artifacts", "facts", "observations"],
                        produces_finding_types=[
                            FindingType.EVIDENCE_CORRELATION,
                            FindingType.CORROBORATION,
                            FindingType.PROVENANCE_ISSUE,
                        ],
                    ),
                ],
                allowed_finding_types=[
                    FindingType.EVIDENCE_CORRELATION,
                    FindingType.CORROBORATION,
                    FindingType.PROVENANCE_ISSUE,
                    FindingType.PATTERN_DETECTED,
                ],
                default_budget=ResourceBudget(
                    max_execution_seconds=30,
                    max_evidence_queries=50,
                    max_graph_traversals=100,
                    max_findings=20,
                ),
            ),
            AgentDefinition(
                agent_type=AgentType.ENTITY_ANALYST,
                name="Entity Analyst",
                description=(
                    "Analyzes entity relationships, proposes linkages between "
                    "persons/phones/vehicles/accounts, and identifies potential "
                    "identity resolution candidates WITHOUT performing automatic merges."
                ),
                version="1.0.0",
                capabilities=[
                    AgentCapability(
                        name="entity_linkage_analysis",
                        description="Propose entity linkages based on evidence correlation",
                        required_evidence_access=["facts", "entities", "relationships"],
                        produces_finding_types=[
                            FindingType.ENTITY_LINKAGE_PROPOSED,
                            FindingType.PATTERN_DETECTED,
                        ],
                    ),
                ],
                allowed_finding_types=[
                    FindingType.ENTITY_LINKAGE_PROPOSED,
                    FindingType.PATTERN_DETECTED,
                    FindingType.EVIDENCE_CORRELATION,
                ],
                default_budget=ResourceBudget(
                    max_execution_seconds=30,
                    max_evidence_queries=30,
                    max_graph_traversals=200,
                    max_findings=15,
                ),
            ),
            AgentDefinition(
                agent_type=AgentType.TIMELINE_ANALYST,
                name="Timeline Analyst",
                description=(
                    "Reconstructs temporal sequences from evidence, detects "
                    "temporal anomalies, verifies chronological consistency, "
                    "and identifies temporal gaps in the evidence record."
                ),
                version="1.0.0",
                capabilities=[
                    AgentCapability(
                        name="temporal_analysis",
                        description="Analyze temporal sequences and detect anomalies",
                        required_evidence_access=["facts", "observations", "timeline_events"],
                        produces_finding_types=[
                            FindingType.TIMELINE_ANOMALY,
                            FindingType.EVIDENCE_CORRELATION,
                        ],
                    ),
                ],
                allowed_finding_types=[
                    FindingType.TIMELINE_ANOMALY,
                    FindingType.EVIDENCE_CORRELATION,
                    FindingType.PATTERN_DETECTED,
                ],
                default_budget=ResourceBudget(
                    max_execution_seconds=30,
                    max_evidence_queries=40,
                    max_graph_traversals=150,
                    max_findings=15,
                ),
            ),
            AgentDefinition(
                agent_type=AgentType.CONTRADICTION_ANALYST,
                name="Contradiction Analyst",
                description=(
                    "Detects and surfaces contradictions across evidence sources "
                    "WITHOUT silently resolving them. Preserves both conflicting "
                    "observations for human review and investigative action."
                ),
                version="1.0.0",
                capabilities=[
                    AgentCapability(
                        name="contradiction_detection",
                        description="Detect contradictions across evidence sources",
                        required_evidence_access=["facts", "observations", "contradictions"],
                        produces_finding_types=[
                            FindingType.CONTRADICTION_DETECTED,
                        ],
                    ),
                ],
                allowed_finding_types=[
                    FindingType.CONTRADICTION_DETECTED,
                    FindingType.EVIDENCE_CORRELATION,
                ],
                default_budget=ResourceBudget(
                    max_execution_seconds=30,
                    max_evidence_queries=60,
                    max_graph_traversals=100,
                    max_findings=20,
                ),
            ),
            AgentDefinition(
                agent_type=AgentType.GAP_ANALYST,
                name="Evidence Gap Analyst",
                description=(
                    "Identifies missing evidence requirements for investigative "
                    "hypotheses. Evaluates available vs required evidence and "
                    "proposes statutory requisition actions to close gaps."
                ),
                version="1.0.0",
                capabilities=[
                    AgentCapability(
                        name="gap_identification",
                        description="Identify missing evidence and propose requisitions",
                        required_evidence_access=["facts", "artifacts", "hypotheses", "gaps"],
                        produces_finding_types=[
                            FindingType.EVIDENCE_GAP_IDENTIFIED,
                        ],
                    ),
                ],
                allowed_finding_types=[
                    FindingType.EVIDENCE_GAP_IDENTIFIED,
                    FindingType.EVIDENCE_CORRELATION,
                ],
                default_budget=ResourceBudget(
                    max_execution_seconds=30,
                    max_evidence_queries=40,
                    max_graph_traversals=50,
                    max_findings=15,
                ),
            ),
        ]

        for agent_def in agents:
            self.register(agent_def)

        logger.info(f"Bootstrapped {len(agents)} canonical investigative agents.")
