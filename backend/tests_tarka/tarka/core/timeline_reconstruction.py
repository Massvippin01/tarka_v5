"""TARKA Phase 5B: Timeline Reconstruction & Event Reasoning Engine.

Forensic Principles:
1. Evidence-Grounded Event Reconstruction:
   - Every timeline event is strictly derived from verified source facts, bank statements,
     chat messages, OCR extractions, and CDR records.
   - Zero hallucinated or ungrounded events.
2. Temporal Hierarchy & Explainability:
   - Priority 1: Exact source ledger timestamp (Core Banking, Telco switch).
   - Priority 2: Source artifact metadata timestamp (File mtime/EXIF).
   - Priority 3: Extracted content timestamp (OCR date strings, message text).
   - Priority 4: Investigator-supplied timestamp.
3. Strict Conflict Non-Obfuscation:
   - When evidence sources contradict in time or sequence (e.g. screenshot vs bank ledger),
     conflicts are explicitly exposed as TEMPORAL_CONFLICT without automatic heuristic smoothing.
4. Counterfactual Fidelity:
   - Excluding challenged artifacts deactivates derived events with an explanatory reason
     (STATUS: INACTIVE, "Derived from excluded artifact ART-XXX"), while independent events survive.
5. Graph Integration:
   - Adds EVENT nodes, PRECEDES edges, SUPPORTED_BY edges, and CONFLICTS_WITH edges to the
     Investigation Graph.
"""

from __future__ import annotations

import datetime
import hashlib
import json
import re
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple

from pydantic import BaseModel, Field

from tarka.core.canonical_fact import CanonicalFact, CanonicalFactKind
from tarka.core.evidence_dna import Artifact
from tarka.core.analysis_run import AnalysisRun
from tarka.core.cross_source_correlation import (
    normalize_amount,
    normalize_rrn,
    normalize_vpa,
    normalize_phone,
)
from tarka.core.investigation_graph import (
    InvestigationGraph,
    InvestigationNode,
    InvestigationEdge,
    ForensicNodeType,
    ForensicEdgeType,
    ForensicNodeStatus,
    compute_investigation_fingerprint,
)
from tarka.core.timezones import IST_TIMEZONE


# -----------------------------------------------------------------------------
# Enums & Domain Models
# -----------------------------------------------------------------------------

class TimelineEventType(str, Enum):
    """Categorical classification of forensic timeline events."""
    PAYMENT_COMPLETED = "PAYMENT_COMPLETED"
    PAYMENT_REQUEST = "PAYMENT_REQUEST"
    COMMUNICATION_EVENT = "COMMUNICATION_EVENT"
    DOCUMENTED_TRANSACTION_STATE = "DOCUMENTED_TRANSACTION_STATE"
    CALL_EVENT = "CALL_EVENT"
    TEMPORAL_CONFLICT = "TEMPORAL_CONFLICT"
    EVIDENCE_OBSERVATION = "EVIDENCE_OBSERVATION"


class TemporalResolutionPriority(int, Enum):
    """Hierarchy for resolving timestamps across disparate forensic sources."""
    EXACT_SOURCE = 1        # Core banking ledger, telco switch CDR
    EVIDENCE_SOURCE = 2     # File system metadata, container envelope
    EXTRACTED_METADATA = 3  # OCR extracted text, chat message body
    INVESTIGATOR_SUPPLIED = 4  # Manual examiner constraint


class EventStatus(str, Enum):
    """Status of an event under active counterfactual analysis."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    CONFLICT = "CONFLICT"


class TemporalConflict(BaseModel):
    """Forensic record of a detected temporal ordering or causal sequence conflict."""
    conflict_id: str
    conflict_type: str
    event_ids: List[str] = Field(default_factory=list)
    rrn: Optional[str] = None
    explanation: str = ""
    delta_amount: Optional[float] = None
    time_diff_seconds: Optional[float] = None


class ForensicTimelineEvent(BaseModel):
    """A reconstructed chronological forensic event backed by verifiable evidence."""
    event_id: str = Field(description="Unique event ID, e.g. EVT-001 or evt:FACT-01")
    timestamp: str = Field(description="Human-readable timestamp with timezone (e.g. 2026-02-14 10:24:00 IST)")
    timestamp_iso: str = Field(description="Normalized UTC ISO-8601 string (e.g. 2026-02-14T04:54:00Z)")
    timestamp_epoch: float = Field(description="UTC unix epoch seconds for mathematical sorting and solving")
    event_type: TimelineEventType = Field(description="Categorical event type")
    title: str = Field(description="Concise forensic event title")
    description: str = Field(description="Plain-language forensic description of the event")
    source_artifact_ids: List[str] = Field(default_factory=list, description="Source artifacts backing this event")
    supporting_fact_ids: List[str] = Field(default_factory=list, description="Canonical facts proving this event")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Confidence score")
    provenance_links: List[str] = Field(default_factory=list, description="Audit provenance identifiers")
    status: str = Field(default="ACTIVE", description="ACTIVE, INACTIVE, or CONFLICT")
    inactive_reason: Optional[str] = Field(default=None, description="Explanation if excluded in counterfactual run")
    temporal_priority: int = Field(default=1, description="1 (Exact) to 4 (Examiner-supplied)")
    is_timestamp_inferred: bool = Field(default=False, description="True if timestamp was inferred rather than recorded")
    primary_entity: Optional[str] = Field(default=None, description="Initiating party / sender")
    secondary_entity: Optional[str] = Field(default=None, description="Target party / receiver")
    amount: Optional[float] = Field(default=None, description="Monetary value if financial")
    currency: Optional[str] = Field(default="INR", description="Currency ISO code")
    identifiers: Dict[str, str] = Field(default_factory=dict, description="Extracted identifiers (RRN, VPA, phone)")
    evidence: Dict[str, Any] = Field(default_factory=dict, description="Supporting evidence details")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Technical metadata payload")
    conflicting_event_ids: List[str] = Field(default_factory=list, description="IDs of events in temporal or factual conflict")
    conflict_explanation: Optional[str] = Field(default=None, description="Explanation of temporal conflict if any")

    @property
    def id(self) -> str:
        """Alias for event_id to ensure interoperability across analysis rules."""
        return self.event_id

    def to_graph_node(self) -> InvestigationNode:
        """Converts timeline event to canonical InvestigationNode for graph visualization."""
        node_status = self.status
        if node_status == EventStatus.CONFLICT.value:
            node_status = ForensicNodeStatus.CONTRADICTION.value

        return InvestigationNode(
            node_id=f"evt:{self.event_id}",
            node_type=ForensicNodeType.EVENT,
            label=f"{self.event_type.value}: {self.title[:30]}",
            title=self.title,
            subtitle=f"{self.timestamp} | Conf: {int(self.confidence * 100)}%",
            description=self.description,
            source_artifact_ids=self.source_artifact_ids,
            source_artifact_id=self.source_artifact_ids[0] if self.source_artifact_ids else None,
            provenance_ids=self.provenance_links,
            identifiers=self.identifiers,
            amount=self.amount,
            confidence=self.confidence,
            status=node_status,
            inactive_reason=self.inactive_reason,
            timestamp_iso=self.timestamp_iso,
            is_timestamp_inferred=self.is_timestamp_inferred,
            metadata={
                "event_type": self.event_type.value,
                "temporal_priority": self.temporal_priority,
                "conflicting_event_ids": self.conflicting_event_ids,
                "conflict_explanation": self.conflict_explanation,
                **self.metadata,
            },
        )


class ForensicTimeline(BaseModel):
    """Complete case chronological timeline with provenance and conflict audit."""
    case_id: str
    run_id: Optional[str] = None
    total_events: int
    active_events_count: int
    inactive_events_count: int
    conflicts_count: int
    events: List[ForensicTimelineEvent]
    temporal_conflicts: List[Dict[str, Any]] = Field(default_factory=list)
    fingerprint: str


# -----------------------------------------------------------------------------
# Timestamp Normalization & Formatting Helpers
# -----------------------------------------------------------------------------

def _format_epoch_to_ist_str(epoch: float) -> str:
    """Formats unix epoch to human-readable IST string."""
    try:
        dt = datetime.datetime.fromtimestamp(epoch, tz=IST_TIMEZONE)
        return dt.strftime("%Y-%m-%d %H:%M:%S IST")
    except Exception:
        dt_utc = datetime.datetime.fromtimestamp(epoch, tz=datetime.timezone.utc)
        return dt_utc.strftime("%Y-%m-%d %H:%M:%S UTC")


def _format_epoch_to_iso(epoch: float) -> str:
    """Formats unix epoch to UTC ISO-8601 string."""
    dt_utc = datetime.datetime.fromtimestamp(epoch, tz=datetime.timezone.utc)
    return dt_utc.strftime("%Y-%m-%dT%H:%M:%SZ")


def _resolve_fact_timestamp(fact: CanonicalFact) -> Tuple[float, str, str, int, bool]:
    """Resolves fact timestamp into (epoch, iso, display_str, priority, is_inferred)."""
    if hasattr(fact, "time_provenance") and fact.time_provenance and fact.time_provenance.utc_epoch:
        # Explicitly check if the timestamp was inferred/unresolved
        if getattr(fact.time_provenance, "is_inferred", False):
            epoch = float(fact.time_provenance.utc_epoch)
            iso = fact.time_provenance.utc_iso or _format_epoch_to_iso(epoch)
            display = "Timestamp not recorded (Case intake default)"
            priority = TemporalResolutionPriority.INVESTIGATOR_SUPPLIED.value
            return epoch, iso, display, priority, True

        epoch = float(fact.time_provenance.utc_epoch)
        iso = fact.time_provenance.utc_iso or _format_epoch_to_iso(epoch)
        display = _format_epoch_to_ist_str(epoch)

        # Determine priority based on fact kind
        if fact.kind in [CanonicalFactKind.BANK_TRANSACTION, CanonicalFactKind.CDR_CALL]:
            priority = TemporalResolutionPriority.EXACT_SOURCE.value
        elif fact.kind in [CanonicalFactKind.CHAT_MESSAGE, CanonicalFactKind.PAYMENT_REQUEST]:
            priority = TemporalResolutionPriority.EVIDENCE_SOURCE.value
        elif fact.kind == CanonicalFactKind.MEDIA_METADATA or "ocr" in (fact.source_location or "").lower():
            priority = TemporalResolutionPriority.EXTRACTED_METADATA.value
        else:
            priority = TemporalResolutionPriority.EVIDENCE_SOURCE.value

        return epoch, iso, display, priority, False

    # Fallback to current time if completely missing (flagged as inferred)
    now_epoch = 1771065000.0  # Stable deterministic fallback in case timeframe
    return now_epoch, _format_epoch_to_iso(now_epoch), "Timestamp not recorded (Case intake default)", TemporalResolutionPriority.INVESTIGATOR_SUPPLIED.value, True


# -----------------------------------------------------------------------------
# Timeline Reconstruction Engine
# -----------------------------------------------------------------------------

class TimelineReconstructionEngine:
    """Deterministic timeline extraction, chronological ordering, and temporal conflict engine."""

    def __init__(self, conflict_threshold_seconds: float = 300.0):
        self.conflict_threshold_seconds = conflict_threshold_seconds

    def extract_event_from_fact(
        self,
        fact: CanonicalFact,
        event_seq: int,
        artifacts_map: Dict[str, Artifact],
        excluded_artifact_ids: Set[str] = set(),
    ) -> ForensicTimelineEvent:
        """Extracts a structured ForensicTimelineEvent from a CanonicalFact using deterministic rules."""
        epoch, iso, display_time, priority, is_inferred = _resolve_fact_timestamp(fact)
        art = artifacts_map.get(fact.artifact_id)
        source_name = fact.source_filename or (art.filename if art else fact.artifact_id)
        is_excluded = fact.artifact_id in excluded_artifact_ids

        # Normalized financial details
        amt, curr, raw_amt = normalize_amount(fact.amount)
        norm_rrn = normalize_rrn(fact.identifiers.get("rrn"))
        norm_vpa = normalize_vpa(fact.identifiers.get("vpa"))
        norm_phone = normalize_phone(fact.identifiers.get("msisdn") or fact.primary_entity)

        identifiers = dict(fact.identifiers)
        if norm_rrn:
            identifiers["rrn"] = norm_rrn
        if norm_vpa:
            identifiers["vpa"] = norm_vpa
        if norm_phone:
            identifiers["phone"] = norm_phone

        evidence_payload = {
            "source_filename": source_name,
            "source_location": fact.source_location,
            "raw_snippet": fact.raw_source_snippet,
            "trust_tier": fact.trust_tier.value if hasattr(fact.trust_tier, "value") else str(fact.trust_tier),
            "auth_track": fact.auth_track.value if hasattr(fact.auth_track, "value") else str(fact.auth_track),
            "sha256": fact.sha256,
        }

        # ---------------------------------------------------------------------
        # Rule 1: Payment Event (Bank Transaction)
        # ---------------------------------------------------------------------
        if fact.kind == CanonicalFactKind.BANK_TRANSACTION:
            event_type = TimelineEventType.PAYMENT_COMPLETED
            title = f"UPI Payment Completed ₹{amt:,.2f}" if amt is not None else "UPI Payment Completed"
            receiver = norm_vpa or fact.secondary_entity or "Merchant"
            rrn_str = f" (RRN {norm_rrn})" if norm_rrn else ""
            acc_str = f", A/c ...{identifiers.get('account_suffix')}" if identifiers.get("account_suffix") else ""
            amt_display = f"₹{amt:,.2f}" if amt is not None else "an undetermined amount"
            description = (
                f"Official bank ledger records debit of {amt_display} to {receiver}{rrn_str}{acc_str}. "
                f"Transaction authenticated via core banking gateway."
            )
            confidence = 0.99
            priority = TemporalResolutionPriority.EXACT_SOURCE.value

        # ---------------------------------------------------------------------
        # Rule 2: Chat / Payment Request Event
        # ---------------------------------------------------------------------
        elif fact.kind in [CanonicalFactKind.CHAT_MESSAGE, CanonicalFactKind.PAYMENT_REQUEST]:
            summary_lower = (fact.summary or "").lower()
            snippet_lower = (fact.raw_source_snippet or "").lower()
            is_payment_req = (
                fact.kind == CanonicalFactKind.PAYMENT_REQUEST
                or any(k in summary_lower or k in snippet_lower for k in ["transfer", "pay", "rs", "urgent", "rrn", "debit", "please transfer"])
                or amt is not None
            )

            if is_payment_req:
                event_type = TimelineEventType.PAYMENT_REQUEST
                amt_str = f"₹{amt:,.2f}" if amt is not None else "funds"
                target_vpa = norm_vpa or "destination UPI ID"
                title = f"Payment Request: {amt_str}"
                sender = fact.primary_entity or "Sender"
                description = (
                    f"{sender} instructed victim via messaging to transfer {amt_str} to {target_vpa}. "
                    f"Cites urgency and transaction coordination."
                )
            else:
                event_type = TimelineEventType.COMMUNICATION_EVENT
                title = f"Chat Message from {fact.primary_entity or 'Party'}"
                description = fact.summary or fact.raw_source_snippet or "Chat communication between parties."

            confidence = 0.95
            priority = TemporalResolutionPriority.EVIDENCE_SOURCE.value

        # ---------------------------------------------------------------------
        # Rule 3: Screenshot / Receipt Claim Event (OCR Facts)
        # ---------------------------------------------------------------------
        elif (
            fact.kind == CanonicalFactKind.MEDIA_METADATA
            or "screenshot" in source_name.lower()
            or "ocr" in (fact.source_location or "").lower()
            or getattr(fact, "is_contradiction", False)
        ):
            event_type = TimelineEventType.DOCUMENTED_TRANSACTION_STATE
            amt_str = f"₹{amt:,.2f}" if amt is not None else "payment"
            rrn_str = f" under RRN {norm_rrn}" if norm_rrn else ""
            title = f"Documented Receipt State: {amt_str}"
            description = (
                f"Receipt screenshot represented a completed payment of {amt_str}{rrn_str}. "
                f"Extracted from presentation-tier digital media."
            )
            confidence = 0.88
            priority = TemporalResolutionPriority.EXTRACTED_METADATA.value

        # ---------------------------------------------------------------------
        # Rule 4: CDR Call Event
        # ---------------------------------------------------------------------
        elif fact.kind == CanonicalFactKind.CDR_CALL:
            event_type = TimelineEventType.CALL_EVENT
            caller = fact.primary_entity or "Caller"
            callee = fact.secondary_entity or "Callee"
            title = f"Voice Call: {caller} -> {callee}"
            description = (
                f"Cellular switch recorded call from {caller} to {callee}. "
                f"Direct telco observation proving active handset connectivity."
            )
            confidence = 0.99
            priority = TemporalResolutionPriority.EXACT_SOURCE.value

        # ---------------------------------------------------------------------
        # Fallback: General Forensic Observation
        # ---------------------------------------------------------------------
        else:
            event_type = TimelineEventType.EVIDENCE_OBSERVATION
            title = f"Evidence Observation: {fact.summary[:40]}"
            description = fact.summary or "Forensic evidence event extracted from case artifact."
            confidence = 0.90
            priority = TemporalResolutionPriority.EVIDENCE_SOURCE.value

        # Counterfactual status
        status = EventStatus.INACTIVE.value if is_excluded else EventStatus.ACTIVE.value
        inactive_reason = (
            f"Derived from excluded artifact {fact.artifact_id} ({source_name})"
            if is_excluded
            else None
        )

        provenance_links = [fact.artifact_id, fact.fact_id]
        if fact.evidence_id:
            provenance_links.append(fact.evidence_id)

        event_id = f"EVENT_{event_seq:03d}"

        return ForensicTimelineEvent(
            event_id=event_id,
            timestamp=display_time,
            timestamp_iso=iso,
            timestamp_epoch=epoch,
            event_type=event_type,
            title=title,
            description=description,
            source_artifact_ids=[fact.artifact_id],
            supporting_fact_ids=[fact.fact_id],
            confidence=confidence,
            provenance_links=provenance_links,
            status=status,
            inactive_reason=inactive_reason,
            temporal_priority=TemporalResolutionPriority.INVESTIGATOR_SUPPLIED.value if is_inferred else priority,
            is_timestamp_inferred=is_inferred,
            primary_entity=fact.primary_entity,
            secondary_entity=fact.secondary_entity,
            amount=amt,
            currency=curr or "INR",
            identifiers=identifiers,
            evidence=evidence_payload,
            metadata={
                "fact_kind": fact.kind.value if hasattr(fact.kind, "value") else str(fact.kind),
                "fact_id": fact.fact_id,
                "artifact_id": fact.artifact_id,
            },
        )

    def extract_events_from_facts(
        self,
        facts: List[CanonicalFact],
        artifacts: List[Artifact],
        excluded_artifact_ids: Set[str] = set(),
    ) -> List[ForensicTimelineEvent]:
        """Extracts structured forensic timeline events across all case facts."""
        artifacts_map = {a.artifact_id: a for a in artifacts}
        events: List[ForensicTimelineEvent] = []

        for idx, fact in enumerate(facts, start=1):
            evt = self.extract_event_from_fact(
                fact=fact,
                event_seq=idx,
                artifacts_map=artifacts_map,
                excluded_artifact_ids=excluded_artifact_ids,
            )
            events.append(evt)

        return events

    def detect_temporal_conflicts(
        self,
        events: List[ForensicTimelineEvent],
    ) -> List[Dict[str, Any]]:
        """Detects contradictions, out-of-order claims, and timestamp conflicts across events."""
        conflicts: List[Dict[str, Any]] = []
        active_events = [e for e in events if e.status != EventStatus.INACTIVE.value]

        # ---------------------------------------------------------------------
        # Conflict Rule 1: Shared RRN with amount or state mismatch
        # ---------------------------------------------------------------------
        rrn_map: Dict[str, List[ForensicTimelineEvent]] = {}
        for e in active_events:
            rrn = e.identifiers.get("rrn")
            if rrn:
                rrn_map.setdefault(rrn, []).append(e)

        for rrn, ev_list in rrn_map.items():
            if len(ev_list) >= 2:
                # Check pairwise for amount discrepancies or impossible sequences
                for i in range(len(ev_list)):
                    for j in range(i + 1, len(ev_list)):
                        e1 = ev_list[i]
                        e2 = ev_list[j]

                        # If amounts are present and differ
                        if e1.amount is not None and e2.amount is not None:
                            if abs(e1.amount - e2.amount) > 0.01:
                                delta = abs(e1.amount - e2.amount)
                                time_diff = abs(e1.timestamp_epoch - e2.timestamp_epoch)
                                expl = (
                                    f"Temporal & State Conflict under RRN {rrn}: "
                                    f"{e1.event_id} ({e1.event_type.value}) records ₹{e1.amount:,.2f} at {e1.timestamp}, "
                                    f"while {e2.event_id} ({e2.event_type.value}) claims ₹{e2.amount:,.2f} at {e2.timestamp} "
                                    f"(Discrepancy: ₹{delta:,.2f}, Δt: {int(time_diff)}s)."
                                )

                                e1.status = EventStatus.CONFLICT.value
                                e2.status = EventStatus.CONFLICT.value
                                if e2.event_id not in e1.conflicting_event_ids:
                                    e1.conflicting_event_ids.append(e2.event_id)
                                if e1.event_id not in e2.conflicting_event_ids:
                                    e2.conflicting_event_ids.append(e1.event_id)

                                e1.conflict_explanation = expl
                                e2.conflict_explanation = expl

                                conflicts.append({
                                    "conflict_id": f"CONF-RRN-{rrn}",
                                    "conflict_type": "AMOUNT_AND_STATE_MISMATCH",
                                    "event_ids": [e1.event_id, e2.event_id],
                                    "rrn": rrn,
                                    "explanation": expl,
                                    "delta_amount": delta,
                                    "time_diff_seconds": time_diff,
                                })

                        # If payment was completed BEFORE it was requested
                        if (
                            e1.event_type == TimelineEventType.PAYMENT_COMPLETED
                            and e2.event_type == TimelineEventType.PAYMENT_REQUEST
                            and not e1.is_timestamp_inferred
                            and not e2.is_timestamp_inferred
                            and e1.timestamp_epoch < e2.timestamp_epoch
                        ):
                            expl = (
                                f"Causal Inversion Conflict: Payment completed ({e1.event_id} at {e1.timestamp}) "
                                f"prior to payment request ({e2.event_id} at {e2.timestamp}) under RRN {rrn}."
                            )
                            e1.status = EventStatus.CONFLICT.value
                            e2.status = EventStatus.CONFLICT.value
                            if e2.event_id not in e1.conflicting_event_ids:
                                e1.conflicting_event_ids.append(e2.event_id)
                            if e1.event_id not in e2.conflicting_event_ids:
                                e2.conflicting_event_ids.append(e1.event_id)

                            conflicts.append({
                                "conflict_id": f"CONF-CAUSAL-{rrn}",
                                "conflict_type": "CAUSAL_INVERSION",
                                "event_ids": [e1.event_id, e2.event_id],
                                "rrn": rrn,
                                "explanation": expl,
                            })

        return conflicts

    def order_and_reconcile_events(
        self,
        events: List[ForensicTimelineEvent],
    ) -> Tuple[List[ForensicTimelineEvent], List[Dict[str, Any]]]:
        """Orders events by timestamp and priority, then detects temporal conflicts."""
        # 1. Primary Sort Key: timestamp_epoch ASC
        # 2. Secondary Sort Key: temporal_priority ASC (Exact source > Metadata > Investigator)
        # 3. Tertiary Sort Key: event_id for absolute determinism
        sorted_events = sorted(
            events,
            key=lambda e: (e.timestamp_epoch, e.temporal_priority, e.event_id),
        )

        # Detect conflicts across the active ordered set
        conflicts = self.detect_temporal_conflicts(sorted_events)

        return sorted_events, conflicts

    def build_timeline(
        self,
        case_id: str,
        facts: List[CanonicalFact],
        artifacts: List[Artifact],
        run: Optional[AnalysisRun] = None,
        baseline_run: Optional[AnalysisRun] = None,
    ) -> ForensicTimeline:
        """Constructs a fully reconciled, verifiable forensic timeline for a case."""
        excluded_artifact_ids: Set[str] = set()
        if run and run.excluded_artifact_ids:
            excluded_artifact_ids = set(run.excluded_artifact_ids)

        # 1. Extract events
        raw_events = self.extract_events_from_facts(
            facts=facts,
            artifacts=artifacts,
            excluded_artifact_ids=excluded_artifact_ids,
        )

        # 2. Order and detect conflicts
        ordered_events, conflicts = self.order_and_reconcile_events(raw_events)

        # 3. Compute counts
        total = len(ordered_events)
        active_count = sum(1 for e in ordered_events if e.status == EventStatus.ACTIVE.value)
        inactive_count = sum(1 for e in ordered_events if e.status == EventStatus.INACTIVE.value)
        conflicts_count = sum(1 for e in ordered_events if e.status == EventStatus.CONFLICT.value)

        # 4. Deterministic fingerprint
        fp_payload = [
            f"{e.event_id}:{e.timestamp_epoch}:{e.event_type.value}:{e.status}"
            for e in ordered_events
        ]
        fingerprint = hashlib.sha256("|".join(fp_payload).encode("utf-8")).hexdigest()

        return ForensicTimeline(
            case_id=case_id,
            run_id=run.run_id if run else None,
            total_events=total,
            active_events_count=active_count,
            inactive_events_count=inactive_count,
            conflicts_count=conflicts_count,
            events=ordered_events,
            temporal_conflicts=conflicts,
            fingerprint=fingerprint,
        )

    def integrate_timeline_into_graph(
        self,
        graph: InvestigationGraph,
        timeline: ForensicTimeline,
    ) -> InvestigationGraph:
        """Augments an InvestigationGraph with EVENT nodes, PRECEDES edges,
        SUPPORTED_BY edges, and CONFLICTS_WITH edges."""
        nodes = list(graph.nodes)
        edges = list(graph.edges)
        seen_node_ids = {n.node_id for n in nodes}

        # 1. Add EVENT nodes
        active_timeline_events: List[ForensicTimelineEvent] = []
        for evt in timeline.events:
            node = evt.to_graph_node()
            if node.node_id not in seen_node_ids:
                seen_node_ids.add(node.node_id)
                nodes.append(node)

            if evt.status != EventStatus.INACTIVE.value:
                active_timeline_events.append(evt)

            # 2. Add SUPPORTED_BY edges to source artifacts
            for art_id in evt.source_artifact_ids:
                art_node_id = f"ent:art:{art_id}"
                edges.append(
                    InvestigationEdge(
                        edge_id=f"edge:supp:{evt.event_id}:{art_id}",
                        source_id=f"evt:{evt.event_id}",
                        target_id=art_node_id,
                        edge_type=ForensicEdgeType.SUPPORTED_BY,
                        label="Supported by",
                        explanation=f"Event {evt.event_id} evidenced by artifact {art_id}",
                        provenance_ids=[art_id, evt.event_id],
                        status=evt.status,
                        inactive_reason=evt.inactive_reason,
                    )
                )

        # 3. Add PRECEDES edges between consecutive active events
        for i in range(len(active_timeline_events) - 1):
            e_curr = active_timeline_events[i]
            e_next = active_timeline_events[i + 1]
            time_delta = e_next.timestamp_epoch - e_curr.timestamp_epoch
            edges.append(
                InvestigationEdge(
                    edge_id=f"edge:prec:{e_curr.event_id}:{e_next.event_id}",
                    source_id=f"evt:{e_curr.event_id}",
                    target_id=f"evt:{e_next.event_id}",
                    edge_type=ForensicEdgeType.PRECEDES,
                    label=f"Precedes (+{int(time_delta)}s)",
                    explanation=f"{e_curr.title} chronologically precedes {e_next.title}",
                    provenance_ids=[e_curr.event_id, e_next.event_id],
                    status="ACTIVE",
                )
            )

        # 4. Add CONFLICTS_WITH edges between conflicting events
        for conf in timeline.temporal_conflicts:
            c_evts = conf.get("event_ids", [])
            if len(c_evts) == 2:
                edges.append(
                    InvestigationEdge(
                        edge_id=f"edge:conf:{c_evts[0]}:{c_evts[1]}",
                        source_id=f"evt:{c_evts[0]}",
                        target_id=f"evt:{c_evts[1]}",
                        edge_type=ForensicEdgeType.CONFLICTS_WITH,
                        label="Conflicts with",
                        explanation=conf.get("explanation", "Temporal conflict between evidence records"),
                        provenance_ids=c_evts,
                        is_contradiction=True,
                        status="ACTIVE",
                    )
                )

        fingerprint = compute_investigation_fingerprint(nodes, edges)

        return InvestigationGraph(
            graph_id=graph.graph_id,
            case_id=graph.case_id,
            nodes=nodes,
            edges=edges,
            fingerprint=fingerprint,
        )
