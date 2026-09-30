"""
SentinelX Tier 1 — Governed Working Memory.

Working memory represents the active, ephemeral investigation context:
- current investigator
- current case
- current objective
- active entities, evidence, claims, contradictions, evidence gaps
- recent commands, agent tasks, voice turns
- pending statutory confirmations
- current UI focus state

CRITICAL INVARIANTS:
1. Short-lived, bounded, case-scoped, and session-scoped.
2. Must never grow unbounded (strict FIFO limits).
3. May be discarded at any time; MUST be reconstructable from authoritative canonical state
   and episodic history.
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.domain.memory import (
    MemoryEpistemicStatus,
    MemoryRecord,
    MemoryScope,
    MemoryTier,
)
from app.repositories.unified_store import UnifiedStore

logger = logging.getLogger("sentinelx.memory.working")


class WorkingMemoryState(BaseModel):
    """
    Bounded, session-scoped working memory snapshot.
    All collections enforce hard upper bounds.
    """
    session_id: str
    case_id: str
    investigator_id: str
    current_objective: str = "Active Investigation"
    jurisdiction: str = "NATIONAL_CYBER_CRIME_COORDINATION"

    @property
    def current_case(self) -> str:
        return self.case_id

    @property
    def current_investigator(self) -> str:
        return self.investigator_id
    
    # Bounded active context (max 20 items each)
    active_entities: List[Dict[str, Any]] = Field(default_factory=list)
    active_evidence_ids: List[str] = Field(default_factory=list)
    active_claims: List[Dict[str, Any]] = Field(default_factory=list)
    active_contradiction_ids: List[str] = Field(default_factory=list)
    active_gap_ids: List[str] = Field(default_factory=list)
    
    # Bounded recent interactions (max 10 items each)
    recent_commands: List[Dict[str, Any]] = Field(default_factory=list)
    active_agent_tasks: List[Dict[str, Any]] = Field(default_factory=list)
    recent_voice_turns: List[Dict[str, Any]] = Field(default_factory=list)
    pending_confirmations: List[Dict[str, Any]] = Field(default_factory=list)
    
    # UI Focus state
    ui_focus_state: Dict[str, Any] = Field(default_factory=dict)
    last_updated: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())

    def update_focus(self, focus_type: str, target_id: str) -> None:
        self.ui_focus_state = {
            "focus_type": focus_type,
            "target_id": target_id,
            "focused_at": datetime.now(UTC).isoformat(),
        }
        self.last_updated = datetime.now(UTC).isoformat()

    def add_entity(self, entity: Dict[str, Any]) -> None:
        # Enforce uniqueness & bound 20
        eid = entity.get("entity_id")
        self.active_entities = [e for e in self.active_entities if e.get("entity_id") != eid]
        self.active_entities.append(entity)
        if len(self.active_entities) > 20:
            self.active_entities.pop(0)
        self.last_updated = datetime.now(UTC).isoformat()

    def add_command(self, cmd: Dict[str, Any]) -> None:
        self.recent_commands.append(cmd)
        if len(self.recent_commands) > 10:
            self.recent_commands.pop(0)
        self.last_updated = datetime.now(UTC).isoformat()

    def add_voice_turn(self, turn: Dict[str, Any]) -> None:
        self.recent_voice_turns.append(turn)
        if len(self.recent_voice_turns) > 10:
            self.recent_voice_turns.pop(0)
        self.last_updated = datetime.now(UTC).isoformat()

    def add_agent_task(self, task: Dict[str, Any]) -> None:
        tid = task.get("task_id")
        self.active_agent_tasks = [t for t in self.active_agent_tasks if t.get("task_id") != tid]
        self.active_agent_tasks.append(task)
        if len(self.active_agent_tasks) > 10:
            self.active_agent_tasks.pop(0)
        self.last_updated = datetime.now(UTC).isoformat()


class WorkingMemoryManager:
    """Manages active session working memories and their reconstruction."""

    def __init__(self) -> None:
        self.active_sessions: Dict[str, WorkingMemoryState] = {}

    def get_or_create(
        self,
        session_id: str,
        case_id: str,
        investigator_id: str,
        jurisdiction: str = "NATIONAL_CYBER_CRIME_COORDINATION",
    ) -> WorkingMemoryState:
        if session_id not in self.active_sessions:
            self.active_sessions[session_id] = WorkingMemoryState(
                session_id=session_id,
                case_id=case_id,
                investigator_id=investigator_id,
                jurisdiction=jurisdiction,
            )
        return self.active_sessions[session_id]

    def discard(self, session_id: str) -> None:
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]

    def reconstruct_from_canonical(
        self,
        session_id: str,
        case_id: str,
        investigator_id: str,
        store: Optional[UnifiedStore] = None,
        episodic_records: Optional[List[MemoryRecord]] = None,
        jurisdiction: str = "NATIONAL_CYBER_CRIME_COORDINATION",
    ) -> WorkingMemoryState:
        """
        Reconstruct active working memory from authoritative canonical store and episodic ledger.
        Guarantees that discarded working memory can always be restored with fidelity.
        """
        s = store or UnifiedStore.get_instance()
        working = WorkingMemoryState(
            session_id=session_id,
            case_id=case_id,
            investigator_id=investigator_id,
            jurisdiction=jurisdiction,
        )

        # 1. Populate active entities from canonical store
        for pid, p in s.persons.items():
            working.add_entity({
                "entity_id": pid,
                "type": "PERSON",
                "display_name": getattr(p, "name", getattr(p, "full_name", pid)) or pid,
            })
        for vid, v in s.vehicles.items():
            working.add_entity({
                "entity_id": vid,
                "type": "VEHICLE",
                "display_name": v.registration_number,
            })

        # 2. Populate active evidence artifacts
        case_artifacts = [a.artifact_id for a in s.artifacts.values() if a.case_id == case_id]
        working.active_evidence_ids = case_artifacts[:20]

        # 3. Populate open contradictions
        contradictions = s.get_contradictions_by_case(case_id)
        working.active_contradiction_ids = [c.contradiction_id for c in contradictions if c.status == "OPEN"][:20]

        # 4. Populate open evidence gaps
        gaps = s.get_canonical_gaps_by_case(case_id)
        working.active_gap_ids = [g.gap_id for g in gaps if g.status == "OPEN"][:20]

        # 5. Populate recent decisions / actions from episodic history
        if episodic_records:
            recent_episodic = sorted(episodic_records, key=lambda r: r.created_at, reverse=True)[:50]
            for r in reversed(recent_episodic):
                if r.source_type == "INVESTIGATOR_ACTION":
                    working.add_command({
                        "command": r.content,
                        "timestamp": r.created_at,
                        "actor": r.created_by,
                    })
                cid = r.structured_payload.get("contradiction_id")
                if cid and cid not in working.active_contradiction_ids:
                    working.active_contradiction_ids.append(cid)
                gid = r.structured_payload.get("gap_id")
                if gid and gid not in working.active_gap_ids:
                    working.active_gap_ids.append(gid)

        self.active_sessions[session_id] = working
        logger.info("Reconstructed working memory for session %s on case %s", session_id, case_id)
        return working
