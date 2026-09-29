"""
SentinelX Governed Multi-Agent Domain Model.

Every agent is:
  - Registered with typed capabilities and resource constraints
  - Governed by PolicyGateway + AgentPolicy (never self-authorizing)
  - Required to produce findings with explicit Evidence IR lineage
  - Prohibited from mutating authoritative investigation state directly

Invariant: AI PROPOSES → EVIDENCE VERIFIES → HUMAN DECIDES
"""
from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.domain.canonical_evidence_ir import (
    EpistemicStatus,
    SourceReliability,
    generate_uuid7,
)


# ── Agent Identity & Classification ──────────────────────────────────────────


class AgentType(str, Enum):
    """Specialized investigative analyst agent types."""
    EVIDENCE_ANALYST = "EVIDENCE_ANALYST"
    ENTITY_ANALYST = "ENTITY_ANALYST"
    TIMELINE_ANALYST = "TIMELINE_ANALYST"
    CONTRADICTION_ANALYST = "CONTRADICTION_ANALYST"
    GAP_ANALYST = "GAP_ANALYST"


class AgentStatus(str, Enum):
    """Lifecycle status of a registered agent."""
    REGISTERED = "REGISTERED"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    DEREGISTERED = "DEREGISTERED"


class TaskStatus(str, Enum):
    """Execution lifecycle of an agent task."""
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    TIMEOUT = "TIMEOUT"
    REJECTED_POLICY = "REJECTED_POLICY"


class FindingStatus(str, Enum):
    """Review lifecycle of an agent finding."""
    PROPOSED = "PROPOSED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    SUPERSEDED = "SUPERSEDED"
    UNDER_REVIEW = "UNDER_REVIEW"


class FindingType(str, Enum):
    """Classification of what the finding represents."""
    CONTRADICTION_DETECTED = "CONTRADICTION_DETECTED"
    EVIDENCE_GAP_IDENTIFIED = "EVIDENCE_GAP_IDENTIFIED"
    ENTITY_LINKAGE_PROPOSED = "ENTITY_LINKAGE_PROPOSED"
    TIMELINE_ANOMALY = "TIMELINE_ANOMALY"
    EVIDENCE_CORRELATION = "EVIDENCE_CORRELATION"
    PATTERN_DETECTED = "PATTERN_DETECTED"
    CORROBORATION = "CORROBORATION"
    PROVENANCE_ISSUE = "PROVENANCE_ISSUE"


# ── Resource Governance ──────────────────────────────────────────────────────


class ResourceBudget(BaseModel):
    """
    Hard resource constraints for agent task execution.
    Prevents runaway consumption and ensures deterministic resource accounting.
    """
    max_execution_seconds: int = 30
    max_evidence_queries: int = 50
    max_graph_traversals: int = 100
    max_findings: int = 20
    max_commands: int = 10

    # Runtime counters (set by supervisor, not by agent)
    elapsed_seconds: float = 0.0
    evidence_queries_used: int = 0
    graph_traversals_used: int = 0
    findings_produced: int = 0
    commands_issued: int = 0

    def is_exhausted(self) -> bool:
        """Check if any hard limit has been exceeded."""
        return (
            self.elapsed_seconds >= self.max_execution_seconds
            or self.evidence_queries_used >= self.max_evidence_queries
            or self.graph_traversals_used >= self.max_graph_traversals
            or self.findings_produced >= self.max_findings
            or self.commands_issued >= self.max_commands
        )

    def remaining_summary(self) -> Dict[str, Any]:
        return {
            "time_remaining_s": max(0, self.max_execution_seconds - self.elapsed_seconds),
            "evidence_queries_remaining": max(0, self.max_evidence_queries - self.evidence_queries_used),
            "graph_traversals_remaining": max(0, self.max_graph_traversals - self.graph_traversals_used),
            "findings_remaining": max(0, self.max_findings - self.findings_produced),
            "commands_remaining": max(0, self.max_commands - self.commands_issued),
        }


# ── Agent Capability Contract ────────────────────────────────────────────────


class AgentCapability(BaseModel):
    """
    Declares a specific investigative capability an agent can perform.
    Capabilities are typed and bounded — no open-ended tool access.
    """
    capability_id: str = Field(default_factory=generate_uuid7)
    name: str
    description: str
    required_evidence_access: List[str] = Field(default_factory=list)
    produces_finding_types: List[FindingType] = Field(default_factory=list)
    requires_case_scope: bool = True
    max_risk_class: str = "READ"  # READ, ANALYZE, or EXECUTE


# ── Agent Definition (Registry Entry) ────────────────────────────────────────


class AgentDefinition(BaseModel):
    """
    Canonical definition of a governed investigative agent.
    Immutable once registered. Version-controlled.
    """
    agent_id: str = Field(default_factory=generate_uuid7)
    agent_type: AgentType
    name: str
    description: str
    version: str = "1.0.0"
    status: AgentStatus = AgentStatus.REGISTERED
    capabilities: List[AgentCapability] = Field(default_factory=list)
    default_budget: ResourceBudget = Field(default_factory=ResourceBudget)
    required_clearance: str = "CONFIDENTIAL"
    allowed_finding_types: List[FindingType] = Field(default_factory=list)
    prohibited_actions: List[str] = Field(
        default_factory=lambda: [
            "MUTATE_EVIDENCE",
            "MERGE_IDENTITY",
            "DELETE_RECORD",
            "BYPASS_POLICY",
            "CLASSIFY_GUILT",
            "CLASSIFY_INNOCENCE",
        ]
    )
    registered_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


# ── Agent Task (Unit of Work) ────────────────────────────────────────────────


class AgentTask(BaseModel):
    """
    A governed unit of work assigned to an agent by the AgentSupervisor.
    Each task has:
    - Explicit case scope
    - Resource budget
    - Policy authorization reference
    - Correlation to the originating Command
    """
    task_id: str = Field(default_factory=generate_uuid7)
    agent_id: str
    agent_type: AgentType
    case_id: str
    objective: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    status: TaskStatus = TaskStatus.PENDING
    budget: ResourceBudget = Field(default_factory=ResourceBudget)
    policy_decision_id: Optional[str] = None
    originating_command_id: Optional[str] = None
    correlation_id: str = Field(default_factory=generate_uuid7)
    findings: List[AgentFinding] = Field(default_factory=list)
    error_message: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


# ── Agent Finding (Output) ───────────────────────────────────────────────────


class AgentFinding(BaseModel):
    """
    An investigative finding produced by a governed agent.
    
    CRITICAL INVARIANTS:
    - Must reference specific evidence artifacts or facts (evidence_ids)
    - Must have explicit epistemic status (never asserted as ground truth)
    - Must declare source reliability and extraction confidence
    - Must NEVER classify guilt or innocence
    - Must preserve contradictions (never silently resolve)
    
    Findings are PROPOSALS that enter the evidence graph for human review.
    """
    finding_id: str = Field(default_factory=generate_uuid7)
    task_id: str
    agent_id: str
    agent_type: AgentType
    finding_type: FindingType
    title: str
    description: str
    status: FindingStatus = FindingStatus.PROPOSED

    # ── Evidence Lineage (MANDATORY) ──
    evidence_ids: List[str] = Field(default_factory=list)
    supporting_fact_ids: List[str] = Field(default_factory=list)
    artifact_ids: List[str] = Field(default_factory=list)
    
    # ── Epistemic Classification ──
    epistemic_status: EpistemicStatus = EpistemicStatus.INFERENCE
    confidence: float = 0.5
    source_reliability: SourceReliability = SourceReliability.C_FAIRLY_RELIABLE
    uncertainty: float = 0.0

    # ── Investigative Context ──
    case_id: str = ""
    related_entity_ids: List[str] = Field(default_factory=list)
    recommended_action: Optional[str] = None
    requires_human_review: bool = True

    # ── Metadata ──
    reasoning_summary: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


# ── Agent Policy (Additive Constraints) ──────────────────────────────────────


class AgentPolicy(BaseModel):
    """
    Additive policy constraints specific to agent task authorization.
    These are checked IN ADDITION TO the standard 7-factor PolicyGateway.
    """
    policy_id: str = Field(default_factory=generate_uuid7)
    agent_type: AgentType
    allowed_case_ids: List[str] = Field(default_factory=list)
    max_concurrent_tasks: int = 3
    require_human_approval_above_risk: str = "ANALYZE"
    prohibited_finding_types: List[FindingType] = Field(default_factory=list)
    max_budget: ResourceBudget = Field(default_factory=ResourceBudget)
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
