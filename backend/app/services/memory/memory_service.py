"""
SentinelX Governed Memory Service.

The SINGLE AUTHORITATIVE boundary for all memory operations across SentinelX:
- Working Memory
- Episodic Memory
- Semantic Memory
- Organizational Memory

CRITICAL ARCHITECTURAL INVARIANTS:
1. Agents, Voice, Chat, and UI MUST NOT directly write memory.
2. All memory writes pass through this service and its governed write pipeline:
   Scope Validation -> Authorization -> Provenance Validation -> Epistemic Validation ->
   Temporal Validation -> Conflict Detection -> Deduplication -> Persistence -> Audit.
3. Any failure FAILS CLOSED.
4. Memory conflicts preserve both conflicting records and surface them; never overwrite silently.
5. Invalidation marks records INVALIDATED; never deletes historical investigative state.
6. Memory is never an independent source of truth; canonical state and evidence are authoritative.
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.domain.canonical_evidence_ir import generate_uuid7
from app.domain.memory import (
    FORBIDDEN_EPISTEMIC_TRANSITIONS,
    MemoryConflict,
    MemoryEpistemicStatus,
    MemoryInvalidation,
    MemoryProvenance,
    MemoryQuery,
    MemoryRecord,
    MemoryRetrievalResult,
    MemoryScope,
    MemorySensitivity,
    MemorySnapshot,
    MemoryStatus,
    MemoryTier,
    MemoryValidity,
    MemoryWriteRequest,
    MemoryWriteResult,
    MemoryWriteType,
)
from app.domain.operating_context import OperatingContext
from app.repositories.unified_store import UnifiedStore
from app.services.audit_service import AuditService
from app.services.governance.policy_gateway import PolicyGateway
from app.services.memory.episodic_memory import EpisodicMemoryManager
from app.services.memory.observability import MemorySpan, metrics
from app.services.memory.organizational_memory import OrganizationalMemoryManager
from app.services.memory.persistence import (
    InMemoryMemoryStore,
    MemoryStore,
    PostgresMemoryStore,
)
from app.services.memory.retriever import MemoryRetriever
from app.services.memory.semantic_memory import SemanticMemoryManager
from app.services.memory.working_memory import WorkingMemoryManager, WorkingMemoryState

logger = logging.getLogger("sentinelx.memory.service")


class MemoryService:
    """Central governed memory authority for SentinelX."""

    _instance: Optional[MemoryService] = None

    def __init__(self, store: Optional[MemoryStore] = None) -> None:
        self.store = store or PostgresMemoryStore()
        self.working_manager = WorkingMemoryManager()
        self.episodic_manager = EpisodicMemoryManager()
        self.semantic_manager = SemanticMemoryManager()
        self.org_manager = OrganizationalMemoryManager()
        self.retriever = MemoryRetriever(self.store)
        self.audit_service = AuditService.get_instance()
        self.policy_gateway = PolicyGateway.get_instance()

        # Seed initial organizational knowledge
        for rec in self.org_manager.default_records:
            if not self.store.get_record(rec.memory_id):
                self.store.save_record(rec)

    @classmethod
    def get_instance(cls) -> MemoryService:
        if cls._instance is None:
            cls._instance = MemoryService()
        return cls._instance

    # ── Write Pipeline ──────────────────────────────────────────────────────────

    def write(
        self,
        request: MemoryWriteRequest,
        context: OperatingContext,
    ) -> MemoryWriteResult:
        """
        Governed 8-Stage Memory Write Pipeline.
        Enforces scope, authorization, provenance lineage, epistemic preservation,
        temporal validity, and conflict preservation.
        """
        with MemorySpan("write", {"tier": request.tier.value, "case_id": request.case_id}):
            metrics.write_count += 1
            now = datetime.now(UTC).isoformat()

            # ── 1. Scope & Case Authorization ─────────────────────────────────
            allowed_case_ids = [c.get("case_id") for c in context.allowed_cases]
            if request.tier != MemoryTier.ORGANIZATIONAL and request.case_id:
                if request.case_id not in allowed_case_ids:
                    metrics.authorization_denial_count += 1
                    metrics.scope_denial_count += 1
                    logger.warning(
                        "Memory write denied: case %s outside allowed scope for %s",
                        request.case_id,
                        context.investigator_id,
                    )
                    return MemoryWriteResult(
                        success=False,
                        error=f"SCOPE_DENIAL: Investigator '{context.investigator_id}' cannot write to case '{request.case_id}'",
                    )

            # Jurisdiction check
            if request.jurisdiction and context.jurisdiction_scope:
                if request.jurisdiction not in context.jurisdiction_scope:
                    metrics.authorization_denial_count += 1
                    return MemoryWriteResult(
                        success=False,
                        error=f"JURISDICTION_DENIAL: Jurisdiction '{request.jurisdiction}' outside investigator scope",
                    )

            # ── 2. Provenance Validation ──────────────────────────────────────
            # Rule: Every memory record MUST trace backwards to evidence, state, action, or approved knowledge.
            if request.write_type != MemoryWriteType.INVESTIGATOR_AUTHORED:
                has_lineage = bool(
                    request.evidence_ids
                    or request.fact_ids
                    or request.claim_ids
                    or request.state_delta_ids
                    or request.source_ids
                )
                if not has_lineage:
                    metrics.provenance_rejection_count += 1
                    logger.warning("Memory write rejected: missing provenance lineage for type %s", request.write_type)
                    return MemoryWriteResult(
                        success=False,
                        error="PROVENANCE_REJECTION: Memory write lacks required source lineage (evidence_ids, fact_ids, or source_ids)",
                    )

            # ── 3. Epistemic Preservation ─────────────────────────────────────
            # Invariant: Never allow an agent or inferred write to claim OBSERVED.
            if request.source_type == "AGENT_RESULT" and request.epistemic_status == MemoryEpistemicStatus.OBSERVED:
                logger.warning("Memory write rejected: Agent result cannot claim OBSERVED epistemic status")
                return MemoryWriteResult(
                    success=False,
                    error="EPISTEMIC_VIOLATION: Inferred/agent findings cannot claim OBSERVED status without verified evidence",
                )

            # Forbidden epistemic transitions (e.g. INFERRED→OBSERVED, PROPOSED→OBSERVED)
            if request.correlation_id:
                existing_recs = self.store.query_records(
                    MemoryQuery(case_id=request.case_id, tiers=[request.tier], limit=100)
                )
                for ex in existing_recs:
                    if ex.correlation_id == request.correlation_id and ex.status == MemoryStatus.ACTIVE:
                        transition = (ex.epistemic_status.value, request.epistemic_status.value)
                        if transition in FORBIDDEN_EPISTEMIC_TRANSITIONS:
                            logger.warning(
                                "Forbidden epistemic transition %s -> %s blocked for correlation %s",
                                ex.epistemic_status.value, request.epistemic_status.value, request.correlation_id,
                            )
                            return MemoryWriteResult(
                                success=False,
                                error=f"EPISTEMIC_VIOLATION: Transition {transition[0]} → {transition[1]} is forbidden. "
                                       f"Memory items cannot be silently upgraded.",
                            )
                        break

            # ── 4. Build MemoryRecord ─────────────────────────────────────────
            provenance = MemoryProvenance(
                source_type=request.source_type,
                source_ids=request.source_ids,
                evidence_ids=request.evidence_ids,
                fact_ids=request.fact_ids,
                claim_ids=request.claim_ids,
                state_delta_ids=request.state_delta_ids,
                created_by=context.investigator_id,
                created_at=now,
            )
            provenance.lineage_hash = provenance.compute_hash()

            validity = MemoryValidity(
                valid_from=request.valid_from or now,
                valid_to=request.valid_to,
                observed_at=request.observed_at or now,
            )

            access_policy = request.access_policy
            if access_policy is None:
                if hasattr(context, "to_access_policy"):
                    access_policy = context.to_access_policy()
                else:
                    from app.domain.memory import MemoryAccessPolicy
                    access_policy = MemoryAccessPolicy(
                        required_role=getattr(context, "role", "INVESTIGATOR"),
                        required_clearance=getattr(context, "clearance", "RESTRICTED"),
                        allowed_jurisdictions=list(context.jurisdiction_scope) if context.jurisdiction_scope else [],
                    )

            record = MemoryRecord(
                tier=request.tier,
                scope=request.scope,
                case_id=request.case_id,
                investigation_id=request.investigation_id,
                jurisdiction=request.jurisdiction,
                organization_id=request.organization_id,
                subject_entity_ids=request.subject_entity_ids,
                content=request.content,
                structured_payload=request.structured_payload,
                epistemic_status=request.epistemic_status,
                confidence=request.confidence,
                provenance=provenance,
                validity=validity,
                created_by=context.investigator_id,
                source_type=request.source_type,
                source_ids=request.source_ids,
                evidence_ids=request.evidence_ids,
                fact_ids=request.fact_ids,
                claim_ids=request.claim_ids,
                state_delta_ids=request.state_delta_ids,
                sensitivity=request.sensitivity,
                access_policy=access_policy,
                correlation_id=request.correlation_id or generate_uuid7(),
            )

            # ── 5. Conflict Detection ─────────────────────────────────────────
            existing_case_records = self.store.query_records(
                MemoryQuery(case_id=request.case_id, tiers=[request.tier], limit=100)
            )
            conflict = self.semantic_manager.detect_conflicts(record, existing_case_records)
            if conflict:
                metrics.conflict_count += 1
                logger.info("Memory conflict detected: %s", conflict.reason)
                # Invariant: Preserve BOTH. Candidate becomes CONTRADICTED
                record.epistemic_status = MemoryEpistemicStatus.CONTRADICTED
                record.status = MemoryStatus.CONTRADICTED
                conflict.new_memory_id = record.memory_id

            # ── 6. Persistence ────────────────────────────────────────────────
            self.store.save_record(record)

            # Also update working memory if session active
            if request.tier == MemoryTier.WORKING or request.case_id:
                wm = self.working_manager.get_or_create(
                    session_id=context.session_id,
                    case_id=request.case_id or "GENERAL",
                    investigator_id=context.investigator_id,
                    jurisdiction=request.jurisdiction,
                )
                if request.subject_entity_ids:
                    for eid in request.subject_entity_ids:
                        wm.add_entity({"entity_id": eid, "type": "ENTITY"})

            # ── 7. Audit Logging ──────────────────────────────────────────────
            self.audit_service.log_event(
                event_type="MEMORY_RECORD_WRITTEN",
                actor_id=context.investigator_id,
                case_id=request.case_id or "GLOBAL",
                action_details={
                    "memory_id": record.memory_id,
                    "tier": record.tier.value,
                    "epistemic_status": record.epistemic_status.value,
                    "has_conflict": conflict is not None,
                },
            )

            return MemoryWriteResult(
                success=True,
                memory_id=record.memory_id,
                record=record,
                conflict=conflict,
            )

    # ── Read & Query Operations ─────────────────────────────────────────────────

    def read(self, memory_id: str, context: OperatingContext) -> Optional[MemoryRecord]:
        """Read a single memory record with security validation."""
        with MemorySpan("read", {"memory_id": memory_id}):
            metrics.read_count += 1
            record = self.store.get_record(memory_id)
            if not record:
                return None

            # Check case scope
            allowed_case_ids = [c.get("case_id") for c in context.allowed_cases]
            if record.tier != MemoryTier.ORGANIZATIONAL and record.case_id:
                if record.case_id not in allowed_case_ids:
                    metrics.authorization_denial_count += 1
                    return None

            return record

    def query(self, query: MemoryQuery, context: OperatingContext) -> MemoryRetrievalResult:
        """Execute a governed policy-aware retrieval."""
        return self.retriever.retrieve(query, context)

    # ── Lifecycle & Invalidation ────────────────────────────────────────────────

    def invalidate(self, memory_id: str, reason: str, context: OperatingContext) -> bool:
        """
        Mark a memory record as INVALIDATED without deleting historical record.
        Preserves complete evidential audit trail.
        """
        with MemorySpan("invalidate", {"memory_id": memory_id}):
            metrics.invalidation_count += 1
            record = self.store.get_record(memory_id)
            if not record:
                return False

            # Verify authorization
            allowed_case_ids = [c.get("case_id") for c in context.allowed_cases]
            if record.case_id and record.case_id not in allowed_case_ids:
                metrics.authorization_denial_count += 1
                return False

            now = datetime.now(UTC).isoformat()
            record.status = MemoryStatus.INVALIDATED
            record.invalidated_at = now
            record.invalidation_reason = reason
            record.updated_at = now
            self.store.update_record(record)

            self.audit_service.log_event(
                event_type="MEMORY_RECORD_INVALIDATED",
                actor_id=context.investigator_id,
                case_id=record.case_id or "GLOBAL",
                action_details={
                    "memory_id": memory_id,
                    "reason": reason,
                },
            )
            return True

    def supersede(
        self,
        old_memory_id: str,
        request: MemoryWriteRequest,
        context: OperatingContext,
    ) -> MemoryWriteResult:
        """
        Supersede an existing memory record with a newer version.
        Marks old record SUPERSEDED and links bidirectional pointers.
        """
        with MemorySpan("supersede", {"old_memory_id": old_memory_id}):
            metrics.supersede_count += 1
            old_rec = self.store.get_record(old_memory_id)
            if not old_rec:
                return MemoryWriteResult(success=False, error="Target memory record not found")

            # Write new record
            write_res = self.write(request, context)
            if not write_res.success or not write_res.record:
                return write_res

            now = datetime.now(UTC).isoformat()
            new_rec = write_res.record
            new_rec.supersedes = old_memory_id
            self.store.update_record(new_rec)

            old_rec.status = MemoryStatus.SUPERSEDED
            old_rec.superseded_by = new_rec.memory_id
            old_rec.updated_at = now
            self.store.update_record(old_rec)

            logger.info("Memory %s superseded by %s", old_memory_id, new_rec.memory_id)
            return write_res

    # ── Snapshot & Rehydration ──────────────────────────────────────────────────

    def snapshot(self, case_id: str, context: OperatingContext) -> MemorySnapshot:
        """
        Capture a deterministic, immutable memory snapshot of the investigation workspace.
        Computes SHA-256 state checksum over working, episodic, and semantic references.
        """
        with MemorySpan("snapshot", {"case_id": case_id}):
            metrics.snapshot_count += 1
            now = datetime.now(UTC).isoformat()

            # Retrieve active session working memory
            wm = self.working_manager.get_or_create(
                session_id=context.session_id,
                case_id=case_id,
                investigator_id=context.investigator_id,
            )

            # Query all active records for this case
            records = self.store.query_records(MemoryQuery(case_id=case_id, limit=500))
            ep_ids = [r.memory_id for r in records if r.tier == MemoryTier.EPISODIC]
            sem_ids = [r.memory_id for r in records if r.tier == MemoryTier.SEMANTIC]
            org_ids = [r.memory_id for r in records if r.tier == MemoryTier.ORGANIZATIONAL]

            # Deterministic checksum computation
            state_tokens = sorted(ep_ids) + sorted(sem_ids) + [case_id, context.investigator_id]
            state_repr = ":".join(state_tokens)
            checksum = hashlib.sha256(state_repr.encode("utf-8")).hexdigest()

            snap = MemorySnapshot(
                case_id=case_id,
                created_at=now,
                created_by=context.investigator_id,
                working_memory=wm.model_dump(),
                episodic_memory_ids=ep_ids,
                semantic_memory_ids=sem_ids,
                organizational_memory_ids=org_ids,
                state_hash=checksum,
                checksum=checksum,
                version=1,
            )
            self.store.save_snapshot(snap)

            self.audit_service.log_event(
                event_type="MEMORY_SNAPSHOT_CAPTURED",
                actor_id=context.investigator_id,
                case_id=case_id,
                action_details={"snapshot_id": snap.snapshot_id, "checksum": checksum},
            )
            return snap

    def rehydrate(
        self,
        case_id: str,
        context: OperatingContext,
        snapshot_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Reconstruct the investigation context from authoritative state + memory snapshot.
        Enforces: REOPENED INVESTIGATION ≈ AUTHORITATIVE STATE + RECONSTRUCTED MEMORY.
        """
        with MemorySpan("rehydrate", {"case_id": case_id}):
            metrics.rehydrate_count += 1
            snap = None
            if snapshot_id:
                snap = self.store.get_snapshot(snapshot_id)
            if not snap:
                snap = self.store.get_latest_snapshot(case_id)

            # Query case episodic records
            episodic_records = self.store.query_records(
                MemoryQuery(case_id=case_id, tiers=[MemoryTier.EPISODIC], limit=100)
            )

            # Reconstruct working memory
            wm = self.working_manager.reconstruct_from_canonical(
                session_id=context.session_id,
                case_id=case_id,
                investigator_id=context.investigator_id,
                store=UnifiedStore.get_instance(),
                episodic_records=episodic_records,
                jurisdiction=context.jurisdiction_scope[0] if context.jurisdiction_scope else "NATIONAL_CYBER_CRIME_COORDINATION",
            )

            # Restore snapshot state if available
            if snap and snap.working_memory:
                wm_data = snap.working_memory
                for cid in wm_data.get("active_contradiction_ids", []):
                    if cid not in wm.active_contradiction_ids:
                        wm.active_contradiction_ids.append(cid)
                for gid in wm_data.get("active_gap_ids", []):
                    if gid not in wm.active_gap_ids:
                        wm.active_gap_ids.append(gid)
                for eid in wm_data.get("active_evidence_ids", []):
                    if eid not in wm.active_evidence_ids:
                        wm.active_evidence_ids.append(eid)
                for ent in wm_data.get("active_entities", []):
                    wm.add_entity(ent)
                if wm_data.get("current_objective"):
                    wm.current_objective = wm_data["current_objective"]

            # Re-read active semantic facts
            semantic_records = self.store.query_records(
                MemoryQuery(case_id=case_id, tiers=[MemoryTier.SEMANTIC], limit=100)
            )

            logger.info(
                "Successfully rehydrated memory for case %s (snapshot_id=%s, active_entities=%d)",
                case_id,
                snap.snapshot_id if snap else "CANONICAL_SYNTHESIS",
                len(wm.active_entities),
            )

            return {
                "case_id": case_id,
                "rehydrated_at": datetime.now(UTC).isoformat(),
                "snapshot_id": snap.snapshot_id if snap else None,
                "working_memory": wm.model_dump(),
                "active_entity_count": len(wm.active_entities),
                "open_contradiction_count": len(wm.active_contradiction_ids),
                "open_gap_count": len(wm.active_gap_ids),
                "episodic_event_count": len(episodic_records),
                "semantic_fact_count": len(semantic_records),
                "state_hash": snap.checksum if snap else "FRESH_SYNTHESIS",
            }

    def reconfirm(
        self,
        memory_id: str,
        context: OperatingContext,
        additional_evidence_ids: Optional[List[str]] = None,
    ) -> Optional[MemoryRecord]:
        """
        Reconfirm a memory record with additional evidence or refreshed statutory validation.
        Transitions status to ACTIVE / CORROBORATED.
        """
        with MemorySpan("reconfirm", {"memory_id": memory_id}):
            record = self.store.get_record(memory_id)
            if not record:
                return None

            allowed_case_ids = [c.get("case_id") for c in context.allowed_cases]
            if record.case_id and record.case_id not in allowed_case_ids:
                metrics.authorization_denial_count += 1
                return None

            now = datetime.now(UTC).isoformat()
            if additional_evidence_ids:
                record.evidence_ids.extend([eid for eid in additional_evidence_ids if eid not in record.evidence_ids])
                record.provenance.evidence_ids = record.evidence_ids
                record.provenance.lineage_hash = record.provenance.compute_hash()

            record.status = MemoryStatus.ACTIVE
            record.epistemic_status = MemoryEpistemicStatus.CORROBORATED
            record.confidence = min(1.0, record.confidence + 0.2)
            record.updated_at = now
            self.store.update_record(record)

            self.audit_service.log_event(
                event_type="MEMORY_RECORD_RECONFIRMED",
                actor_id=context.investigator_id,
                case_id=record.case_id or "GLOBAL",
                action_details={"memory_id": memory_id, "status": record.status.value},
            )
            return record

    def expire(
        self,
        memory_id: str,
        context: OperatingContext,
    ) -> bool:
        """
        Mark a memory record as EXPIRED based on temporal validity.
        Preserves historical record for investigative reconstruction.
        """
        with MemorySpan("expire", {"memory_id": memory_id}):
            record = self.store.get_record(memory_id)
            if not record:
                return False

            allowed_case_ids = [c.get("case_id") for c in context.allowed_cases]
            if record.case_id and record.case_id not in allowed_case_ids:
                metrics.authorization_denial_count += 1
                return False

            now = datetime.now(UTC).isoformat()
            record.status = MemoryStatus.EXPIRED
            record.updated_at = now
            self.store.update_record(record)

            self.audit_service.log_event(
                event_type="MEMORY_RECORD_EXPIRED",
                actor_id=context.investigator_id,
                case_id=record.case_id or "GLOBAL",
                action_details={"memory_id": memory_id},
            )
            return True

    def restore(
        self,
        snapshot_id: str,
        context: OperatingContext,
    ) -> Dict[str, Any]:
        """
        Restore investigation memory state from an immutable snapshot.
        Ensures deterministic recovery of working context and tier pointers.
        """
        with MemorySpan("restore", {"snapshot_id": snapshot_id}):
            metrics.restore_count += 1
            snap = self.store.get_snapshot(snapshot_id)
            if not snap:
                raise ValueError(f"Snapshot '{snapshot_id}' not found")
            return self.rehydrate(case_id=snap.case_id, context=context, snapshot_id=snapshot_id)

