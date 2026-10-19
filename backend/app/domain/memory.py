"""
SentinelX Governed Four-Tier Investigation Memory Domain Models.

The four governed memory tiers are:
1. WORKING MEMORY - ephemeral, bounded, session-scoped active operational context.
2. EPISODIC MEMORY - chronological event stream of investigative actions, findings, deltas, and decisions.
3. SEMANTIC MEMORY - validated knowledge graph of entities, facts, claims, contradictions, and hypotheses.
4. ORGANIZATIONAL MEMORY - institutional playbooks, procedures, templates, and approved analytical patterns.

ABSOLUTE INVARIANTS:
1. Evidence is authoritative.
2. Canonical investigation state is authoritative for investigation state.
3. Memory is derived and never an independent source of truth.
4. Memory must carry provenance, scope, temporal validity, and epistemic status.
5. Inferred/proposed memory must never be silently promoted to observed/verified.
6. Cross-case memory retrieval is forbidden without explicit authorization.
7. Organizational memory must never inherit raw case PII/evidence by default.
8. Agents, Voice, Chat, and UI MUST NOT directly write memory. All writes pass through MemoryService.
"""
from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field

from app.domain.canonical_evidence_ir import generate_uuid7


MemoryId = str


class MemoryProvenanceSourceType(str, Enum):
    """Authoritative classification of memory provenance origin."""
    EVIDENCE = "EVIDENCE"
    INVESTIGATION_STATE = "INVESTIGATION_STATE"
    INVESTIGATION_DELTA = "INVESTIGATION_DELTA"
    INVESTIGATOR_ACTION = "INVESTIGATOR_ACTION"
    AGENT_RESULT = "AGENT_RESULT"
    APPROVED_ORGANIZATIONAL_KNOWLEDGE = "APPROVED_ORGANIZATIONAL_KNOWLEDGE"


# Valid epistemic status transitions — prevents silent upgrades
# Key: current status, Value: set of statuses it can transition TO
VALID_EPISTEMIC_TRANSITIONS: Dict[str, set] = {
    "OBSERVED": {"CORROBORATED", "CONTRADICTED", "REQUIRES_VERIFICATION"},
    "INFERRED": {"CORROBORATED", "CONTRADICTED", "REQUIRES_VERIFICATION", "PROPOSED"},
    "CORROBORATED": {"CONTRADICTED", "REQUIRES_VERIFICATION"},
    "CONTRADICTED": {"REQUIRES_VERIFICATION", "CORROBORATED"},
    "UNKNOWN": {"OBSERVED", "INFERRED", "PROPOSED", "REQUIRES_VERIFICATION"},
    "REQUIRES_VERIFICATION": {"OBSERVED", "INFERRED", "CORROBORATED", "CONTRADICTED"},
    "PROPOSED": {"CORROBORATED", "CONTRADICTED", "REQUIRES_VERIFICATION", "INFERRED"},
}

# Forbidden transitions — NEVER allow these silent upgrades
FORBIDDEN_EPISTEMIC_TRANSITIONS: set = {
    ("INFERRED", "OBSERVED"),
    ("PROPOSED", "OBSERVED"),
    ("CONTRADICTED", "OBSERVED"),
    ("UNKNOWN", "CORROBORATED"),
}


# ── Backward Compatibility Types (Waves 1-5) ─────────────────────────────────

class InvestigatorDecision(BaseModel):
    decision_id: str = Field(default_factory=lambda: f"DEC-{uuid4().hex[:8]}")
    investigator_id: str
    decision_type: str  # ENDORSE_FINDING, REJECT_FINDING, OVERRIDE_MERGE, FREEZE_SNAPSHOT, CONFIRM_STATUTORY_NOTICE
    target_id: str
    rationale: str
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class AttentionFocusWindow(BaseModel):
    focused_entity_ids: List[str] = Field(default_factory=list)
    focused_contradiction_ids: List[str] = Field(default_factory=list)
    time_window_start: Optional[str] = None
    time_window_end: Optional[str] = None
    geographical_scope: Optional[str] = None


class StructuredInvestigationMemory(BaseModel):
    """
    Structured memory persisting working hypotheses, attention focus,
    decision ledger, and human identity overrides across interaction turns and sessions.
    Preserved for Wave 5 backward compatibility.
    """
    case_id: str
    active_hypotheses: Dict[str, Any] = Field(default_factory=dict)
    working_claims: List[Dict[str, Any]] = Field(default_factory=list)
    attention_focus: AttentionFocusWindow = Field(default_factory=AttentionFocusWindow)
    decision_ledger: List[InvestigatorDecision] = Field(default_factory=list)
    identity_overrides: Dict[str, str] = Field(default_factory=dict)
    session_notes: List[Dict[str, Any]] = Field(default_factory=list)
    last_updated: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())

    def add_override(self, entity_raw: str, instruction: str) -> None:
        self.identity_overrides[entity_raw] = instruction
        self.last_updated = datetime.now(UTC).isoformat()

    def record_decision(self, decision: InvestigatorDecision) -> None:
        self.decision_ledger.append(decision)
        self.last_updated = datetime.now(UTC).isoformat()


# ── Four-Tier Memory Classifications ─────────────────────────────────────────

class MemoryTier(str, Enum):
    """The four canonical governed memory tiers."""
    WORKING = "WORKING"
    EPISODIC = "EPISODIC"
    SEMANTIC = "SEMANTIC"
    ORGANIZATIONAL = "ORGANIZATIONAL"


class MemoryScope(str, Enum):
    """Boundaries of memory accessibility and lifetime."""
    SESSION = "SESSION"
    INVESTIGATION = "INVESTIGATION"
    CASE = "CASE"
    JURISDICTION = "JURISDICTION"
    ORGANIZATION = "ORGANIZATION"
    GLOBAL = "GLOBAL"  # GLOBAL does not imply unrestricted access; requires authorization


class MemoryStatus(str, Enum):
    """Lifecycle state of a memory record."""
    ACTIVE = "ACTIVE"
    SUPERSEDED = "SUPERSEDED"
    INVALIDATED = "INVALIDATED"
    CONTRADICTED = "CONTRADICTED"
    EXPIRED = "EXPIRED"
    UNDER_REVIEW = "UNDER_REVIEW"
    ARCHIVED = "ARCHIVED"


class MemoryEpistemicStatus(str, Enum):
    """
    Epistemic standing preserved across the evidence lineage.
    Never silently upgraded (e.g. INFERRED -> OBSERVED is forbidden).
    """
    OBSERVED = "OBSERVED"
    INFERRED = "INFERRED"
    CORROBORATED = "CORROBORATED"
    CONTRADICTED = "CONTRADICTED"
    UNKNOWN = "UNKNOWN"
    REQUIRES_VERIFICATION = "REQUIRES_VERIFICATION"
    PROPOSED = "PROPOSED"


class MemoryWriteType(str, Enum):
    """Category of write origin."""
    DERIVED = "DERIVED"
    OBSERVED = "OBSERVED"
    INVESTIGATOR_AUTHORED = "INVESTIGATOR_AUTHORED"
    SYSTEM_EVENT = "SYSTEM_EVENT"
    ORGANIZATIONAL_KNOWLEDGE = "ORGANIZATIONAL_KNOWLEDGE"


class OrganizationalMemoryType(str, Enum):
    """Categories of approved institutional knowledge."""
    PLAYBOOK = "PLAYBOOK"
    PROCEDURE = "PROCEDURE"
    TEMPLATE = "TEMPLATE"
    DOMAIN_KNOWLEDGE = "DOMAIN_KNOWLEDGE"
    LESSON_LEARNED = "LESSON_LEARNED"
    VALIDATED_PATTERN = "VALIDATED_PATTERN"


class MemorySensitivity(str, Enum):
    """Security classification of memory item."""
    PUBLIC = "PUBLIC"
    INTERNAL = "INTERNAL"
    RESTRICTED = "RESTRICTED"
    CONFIDENTIAL_LAW_ENFORCEMENT = "CONFIDENTIAL_LAW_ENFORCEMENT"
    STATUTORY_RESTRICTED = "STATUTORY_RESTRICTED"


# ── Provenance & Validity Contracts ──────────────────────────────────────────

class MemoryProvenance(BaseModel):
    """
    Cryptographic and evidential pedigree tracing memory back to authoritative sources.
    Every memory item MUST trace to evidence, investigation state, action, or approved knowledge.
    """
    provenance_id: str = Field(default_factory=generate_uuid7)
    source_type: str  # EVIDENCE, INVESTIGATION_STATE, INVESTIGATION_DELTA, INVESTIGATOR_ACTION, AGENT_RESULT, APPROVED_ORGANIZATIONAL_KNOWLEDGE
    source_ids: List[str] = Field(default_factory=list)
    evidence_ids: List[str] = Field(default_factory=list)
    fact_ids: List[str] = Field(default_factory=list)
    claim_ids: List[str] = Field(default_factory=list)
    state_delta_ids: List[str] = Field(default_factory=list)
    lineage_hash: str = ""
    created_by: str = "SYSTEM"
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())

    def compute_hash(self) -> str:
        s = f"{self.source_type}:{','.join(sorted(self.source_ids))}:{','.join(sorted(self.evidence_ids))}:{','.join(sorted(self.fact_ids))}"
        return hashlib.sha256(s.encode("utf-8")).hexdigest()


class MemoryValidity(BaseModel):
    """
    Multi-timestamp model preserving observed time, validity intervals, and lifecycle timestamps.
    """
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    observed_at: Optional[str] = None

    def is_valid_at(self, target_time: Optional[str] = None) -> bool:
        if not target_time:
            target_time = datetime.now(UTC).isoformat()
        if self.valid_from and target_time < self.valid_from:
            return False
        if self.valid_to and target_time > self.valid_to:
            return False
        return True


class MemoryAccessPolicy(BaseModel):
    """Fine-grained statutory access rules for a memory record."""
    required_role: Optional[str] = None
    required_clearance: str = "RESTRICTED"
    allowed_jurisdictions: List[str] = Field(default_factory=list)
    allowed_investigators: List[str] = Field(default_factory=list)
    allow_cross_case: bool = False


# ── Canonical Memory Record ──────────────────────────────────────────────────

class MemoryRecord(BaseModel):
    """
    Authoritative representation of a single memory item in any of the four tiers.
    Answers: WHO, WHAT, WHY, WHICH CASE, WHICH JURISDICTION, WHEN, WHAT EVIDENCE, EPISTEMIC STATUS.
    """
    memory_id: str = Field(default_factory=generate_uuid7)
    tier: MemoryTier
    scope: MemoryScope
    case_id: Optional[str] = None
    investigation_id: Optional[str] = None
    jurisdiction: str = "NATIONAL_CYBER_CRIME_COORDINATION"
    organization_id: Optional[str] = None
    subject_entity_ids: List[str] = Field(default_factory=list)
    content: str
    structured_payload: Dict[str, Any] = Field(default_factory=dict)
    epistemic_status: MemoryEpistemicStatus = MemoryEpistemicStatus.INFERRED
    confidence: float = 0.5
    provenance: MemoryProvenance = Field(default_factory=lambda: MemoryProvenance(source_type="INVESTIGATION_STATE"))
    validity: MemoryValidity = Field(default_factory=MemoryValidity)
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    created_by: str = "SYSTEM"
    source_type: str = "INVESTIGATION_STATE"
    source_ids: List[str] = Field(default_factory=list)
    evidence_ids: List[str] = Field(default_factory=list)
    fact_ids: List[str] = Field(default_factory=list)
    claim_ids: List[str] = Field(default_factory=list)
    state_delta_ids: List[str] = Field(default_factory=list)
    sensitivity: MemorySensitivity = MemorySensitivity.RESTRICTED
    access_policy: Optional[MemoryAccessPolicy] = Field(default_factory=MemoryAccessPolicy)
    status: MemoryStatus = MemoryStatus.ACTIVE
    supersedes: Optional[str] = None
    superseded_by: Optional[str] = None
    invalidated_at: Optional[str] = None
    invalidation_reason: Optional[str] = None
    version: int = 1
    correlation_id: str = Field(default_factory=generate_uuid7)
    data_only: bool = True  # Strict Invariant: Memory content is DATA ONLY, never instructions

    @property
    def is_current(self) -> bool:
        return self.status == MemoryStatus.ACTIVE

    @property
    def valid_from(self) -> Optional[str]:
        return self.validity.valid_from

    @property
    def valid_to(self) -> Optional[str]:
        return self.validity.valid_to

    @property
    def observed_at(self) -> Optional[str]:
        return self.validity.observed_at


class MemoryReference(BaseModel):
    """Lightweight pointer to an authoritative memory record."""
    memory_id: str
    tier: MemoryTier
    summary: str
    epistemic_status: MemoryEpistemicStatus
    confidence: float
    case_id: Optional[str] = None


# ── Query & Retrieval Models ─────────────────────────────────────────────────

class MemoryQuery(BaseModel):
    """
    Policy-aware search specification for memory retrieval.
    Execution order: AUTHORIZATION -> SCOPE -> VALIDITY -> EPISTEMIC FILTER -> RELEVANCE.
    """
    query_text: Optional[str] = None
    tiers: List[MemoryTier] = Field(default_factory=lambda: [MemoryTier.WORKING, MemoryTier.EPISODIC, MemoryTier.SEMANTIC])
    case_id: Optional[str] = None
    investigation_id: Optional[str] = None
    jurisdiction: Optional[str] = None
    entity_ids: List[str] = Field(default_factory=list)
    epistemic_statuses: List[MemoryEpistemicStatus] = Field(default_factory=list)
    include_invalidated: bool = False
    include_superseded: bool = False
    include_expired: bool = False
    min_confidence: float = 0.0
    time_at: Optional[str] = None
    limit: int = 50
    correlation_id: Optional[str] = None


class MemoryRetrievalItem(BaseModel):
    """Single item retrieved from memory with explicit provenance and safety metadata."""
    memory_id: str
    record: MemoryRecord
    tier: MemoryTier
    relevance_score: float = 1.0
    epistemic_status: MemoryEpistemicStatus
    provenance: MemoryProvenance
    scope: MemoryScope
    confidence: float
    validity: Optional[MemoryValidity] = None
    data_only: bool = True  # Invariant: Retrieved memory is strictly passive data, never instructions
    verification_required: bool = False


class MemoryRetrievalResult(BaseModel):
    """Result set returned by governed MemoryRetriever."""
    items: List[MemoryRetrievalItem] = Field(default_factory=list)
    total_count: int = 0
    denial_reason: Optional[str] = None
    retrieved_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


# ── Write & Mutation Contracts ───────────────────────────────────────────────

class MemoryWriteRequest(BaseModel):
    """
    Strictly governed request to record or update memory.
    Must provide evidence/state lineage unless marked INVESTIGATOR_AUTHORED.
    """
    tier: MemoryTier
    scope: MemoryScope
    case_id: Optional[str] = None
    investigation_id: Optional[str] = None
    jurisdiction: str = "NATIONAL_CYBER_CRIME_COORDINATION"
    organization_id: Optional[str] = None
    subject_entity_ids: List[str] = Field(default_factory=list)
    content: str
    structured_payload: Dict[str, Any] = Field(default_factory=dict)
    epistemic_status: MemoryEpistemicStatus = MemoryEpistemicStatus.INFERRED
    write_type: MemoryWriteType = MemoryWriteType.DERIVED
    confidence: float = 0.7
    source_type: str = "INVESTIGATION_STATE"
    source_ids: List[str] = Field(default_factory=list)
    evidence_ids: List[str] = Field(default_factory=list)
    fact_ids: List[str] = Field(default_factory=list)
    claim_ids: List[str] = Field(default_factory=list)
    state_delta_ids: List[str] = Field(default_factory=list)
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    observed_at: Optional[str] = None
    sensitivity: MemorySensitivity = MemorySensitivity.RESTRICTED
    access_policy: Optional[MemoryAccessPolicy] = None
    correlation_id: Optional[str] = None


class MemoryConflict(BaseModel):
    """Detected conflict between new memory and existing memory."""
    conflict_id: str = Field(default_factory=generate_uuid7)
    existing_memory_id: str
    new_memory_id: Optional[str] = None
    conflicting_content: str
    reason: str
    contradiction_id: Optional[str] = None  # Link to existing contradiction infrastructure
    detected_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class MemoryWriteResult(BaseModel):
    """Result of a governed write pipeline operation."""
    success: bool
    memory_id: Optional[str] = None
    record: Optional[MemoryRecord] = None
    conflict: Optional[MemoryConflict] = None
    error: Optional[str] = None


class MemoryInvalidation(BaseModel):
    """Record of explicit memory invalidation."""
    invalidation_id: str = Field(default_factory=generate_uuid7)
    memory_id: str
    reason: str
    invalidated_by: str
    invalidated_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


# ── Snapshot & Rehydration Contracts ─────────────────────────────────────────

class MemorySnapshot(BaseModel):
    """
    Immutable serialized snapshot of investigation memory for checkpointing and rehydration.
    """
    snapshot_id: str = Field(default_factory=generate_uuid7)
    case_id: str
    investigation_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    created_by: str = "SYSTEM"
    working_memory: Dict[str, Any] = Field(default_factory=dict)
    episodic_memory_ids: List[str] = Field(default_factory=list)
    semantic_memory_ids: List[str] = Field(default_factory=list)
    organizational_memory_ids: List[str] = Field(default_factory=list)
    state_hash: str = ""
    checksum: str = ""
    version: int = 1

    def verify_integrity(self) -> bool:
        """Verify that state_hash matches checksum (immutability invariant)."""
        return self.state_hash == self.checksum and len(self.checksum) == 64
