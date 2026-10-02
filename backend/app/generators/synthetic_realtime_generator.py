from __future__ import annotations

import random
from datetime import UTC, datetime, timedelta
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.domain.canonical_evidence_ir import generate_uuid7
from app.domain.graph_projection import (
    GraphEdgeOntology,
    GraphNodeOntology,
    GraphOperationType,
    GraphProjectionRecord,
)


class SyntheticGenerationParams(BaseModel):
    seed: int = 42
    case_id: str = "CASE-2026-SYNTH"
    jurisdiction: str = "Delhi NCR / Special Cell"
    person_count: int = 5
    vehicle_count: int = 3
    phone_count: int = 4
    location_count: int = 2
    event_count: int = 3
    evidence_count: int = 4
    relationship_density: float = 0.4
    contradiction_rate: float = 0.2
    missing_evidence_rate: float = 0.1
    duplicate_rate: float = 0.05
    noise_rate: float = 0.05


class SyntheticStreamItem(BaseModel):
    record: GraphProjectionRecord
    node: Optional[GraphNodeOntology] = None
    edge: Optional[GraphEdgeOntology] = None
    is_duplicate: bool = False
    is_contradiction: bool = False
    is_synthetic: bool = True


class SyntheticRealtimeGenerator:
    """
    Deterministic Synthetic Realtime Event Generator for SentinelX Graph Projection (Subphase A5).
    Produces reproducible streams of nodes, edges, contradictions, and evidentiary mutations.
    """

    FIRST_NAMES = ["Amit", "Vikram", "Rahul", "Pooja", "Sunil", "Rajesh", "Kavita", "Sanjay", "Anil", "Meera"]
    LAST_NAMES = ["Kumar", "Singh", "Verma", "Sharma", "Yadav", "Gupta", "Patel", "Reddy", "Mehta", "Joshi"]
    VEHICLE_MAKES = ["Hyundai Creta", "Maruti Swift", "Toyota Fortuner", "Tata Nexon", "Mahindra Scorpio"]
    CARRIERS = ["Airtel", "Jio", "Vodafone Idea", "BSNL"]
    LOCATIONS = ["Connaught Place, Delhi", "Cyber City, Gurugram", "DND Flyway, Noida", "Kashmere Gate, Delhi"]

    def __init__(self, params: Optional[SyntheticGenerationParams] = None) -> None:
        self.params = params or SyntheticGenerationParams()
        self.rng = random.Random(self.params.seed)

    def generate_event_stream(self) -> List[SyntheticStreamItem]:
        """Generate a deterministic sequence of graph projection items."""
        items: List[SyntheticStreamItem] = []
        base_time = datetime(2026, 9, 30, 8, 0, 0, tzinfo=UTC)

        people_ids: List[str] = []
        phone_ids: List[str] = []
        vehicle_ids: List[str] = []
        location_ids: List[str] = []

        # 1. Generate People Nodes
        for i in range(self.params.person_count):
            pid = f"SYNTH-P{i+1:03d}"
            people_ids.append(pid)
            fn = self.rng.choice(self.FIRST_NAMES)
            ln = self.rng.choice(self.LAST_NAMES)
            node = GraphNodeOntology(
                identifier=pid,
                canonical_id=f"CANON-{pid}",
                display_label=f"{fn} {ln}",
                entity_type="Person",
                case_scope=self.params.case_id,
                jurisdiction=self.params.jurisdiction,
                epistemic_status="OBSERVED",
                risk_level=self.rng.choice(["LOW", "MEDIUM", "HIGH"]),
                source_refs=["SYNTHETIC_DATA"],
                created_at=(base_time + timedelta(minutes=i * 5)).isoformat(),
            )
            rec = GraphProjectionRecord(
                canonical_object_id=pid,
                canonical_object_type="Person",
                graph_object_id=pid,
                operation=GraphOperationType.CREATE,
                version=1,
                case_id=self.params.case_id,
                jurisdiction=self.params.jurisdiction,
            )
            items.append(SyntheticStreamItem(record=rec, node=node))

        # 2. Generate Phone Nodes & Ownership Edges
        for i in range(self.params.phone_count):
            ph_id = f"SYNTH-PH{i+1:03d}"
            phone_ids.append(ph_id)
            phone_num = f"+91-98{self.rng.randint(10000000, 99999999)}"
            node = GraphNodeOntology(
                identifier=ph_id,
                canonical_id=f"CANON-{ph_id}",
                display_label=phone_num,
                entity_type="Phone",
                case_scope=self.params.case_id,
                jurisdiction=self.params.jurisdiction,
                epistemic_status="OBSERVED",
                source_refs=["SYNTHETIC_DATA"],
            )
            rec = GraphProjectionRecord(
                canonical_object_id=ph_id,
                canonical_object_type="Phone",
                graph_object_id=ph_id,
                operation=GraphOperationType.CREATE,
                version=1,
                case_id=self.params.case_id,
                jurisdiction=self.params.jurisdiction,
            )
            items.append(SyntheticStreamItem(record=rec, node=node))

            # Link to person
            if people_ids:
                owner = self.rng.choice(people_ids)
                edge_id = f"REL-{owner}-{ph_id}"
                edge = GraphEdgeOntology(
                    relationship_id=edge_id,
                    source=owner,
                    target=ph_id,
                    relationship_type="USES_PHONE",
                    epistemic_status="DOCUMENTED",
                    confidence=1.0,
                    evidence_refs=[f"CAF-{ph_id}"],
                    source_refs=["SYNTHETIC_DATA"],
                    case_scope=self.params.case_id,
                    jurisdiction=self.params.jurisdiction,
                )
                e_rec = GraphProjectionRecord(
                    canonical_object_id=edge_id,
                    canonical_object_type="Relationship",
                    graph_object_id=edge_id,
                    operation=GraphOperationType.CREATE,
                    version=1,
                    case_id=self.params.case_id,
                    jurisdiction=self.params.jurisdiction,
                )
                items.append(SyntheticStreamItem(record=e_rec, edge=edge))

        # 3. Generate Vehicle Nodes & Ownership Edges
        for i in range(self.params.vehicle_count):
            vid = f"SYNTH-V{i+1:03d}"
            vehicle_ids.append(vid)
            plate = f"DL-01-AB-{self.rng.randint(1000, 9999)}"
            make = self.rng.choice(self.VEHICLE_MAKES)
            node = GraphNodeOntology(
                identifier=vid,
                canonical_id=f"CANON-{vid}",
                display_label=f"{plate} ({make})",
                entity_type="Vehicle",
                case_scope=self.params.case_id,
                jurisdiction=self.params.jurisdiction,
                epistemic_status="OBSERVED",
                source_refs=["SYNTHETIC_DATA"],
            )
            rec = GraphProjectionRecord(
                canonical_object_id=vid,
                canonical_object_type="Vehicle",
                graph_object_id=vid,
                operation=GraphOperationType.CREATE,
                version=1,
                case_id=self.params.case_id,
                jurisdiction=self.params.jurisdiction,
            )
            items.append(SyntheticStreamItem(record=rec, node=node))

            if people_ids:
                owner = self.rng.choice(people_ids)
                edge_id = f"REL-{owner}-{vid}"
                edge = GraphEdgeOntology(
                    relationship_id=edge_id,
                    source=owner,
                    target=vid,
                    relationship_type="OWNS_VEHICLE",
                    epistemic_status="DOCUMENTED",
                    confidence=1.0,
                    evidence_refs=[f"RC-{vid}"],
                    source_refs=["SYNTHETIC_DATA"],
                    case_scope=self.params.case_id,
                    jurisdiction=self.params.jurisdiction,
                )
                e_rec = GraphProjectionRecord(
                    canonical_object_id=edge_id,
                    canonical_object_type="Relationship",
                    graph_object_id=edge_id,
                    operation=GraphOperationType.CREATE,
                    version=1,
                    case_id=self.params.case_id,
                    jurisdiction=self.params.jurisdiction,
                )
                items.append(SyntheticStreamItem(record=e_rec, edge=edge))

        # 4. Generate Communication Edges (CDR calls between phones)
        if len(phone_ids) >= 2:
            p_a, p_b = phone_ids[0], phone_ids[1]
            rel_cdr = f"REL-CDR-{p_a}-{p_b}"
            edge_cdr = GraphEdgeOntology(
                relationship_id=rel_cdr,
                source=p_a,
                target=p_b,
                relationship_type="COMMUNICATED_WITH",
                epistemic_status="VERIFIED",
                confidence=0.95,
                evidence_refs=["CDR-LOG-001"],
                source_refs=["SYNTHETIC_DATA"],
                case_scope=self.params.case_id,
                jurisdiction=self.params.jurisdiction,
                observed_at=(base_time + timedelta(hours=2)).isoformat(),
            )
            e_rec_cdr = GraphProjectionRecord(
                canonical_object_id=rel_cdr,
                canonical_object_type="Relationship",
                graph_object_id=rel_cdr,
                operation=GraphOperationType.CREATE,
                version=1,
                case_id=self.params.case_id,
                jurisdiction=self.params.jurisdiction,
            )
            items.append(SyntheticStreamItem(record=e_rec_cdr, edge=edge_cdr))

        # 5. Contradiction Injection if configured
        if self.params.contradiction_rate > 0 and vehicle_ids and people_ids:
            v_target = vehicle_ids[0]
            p_target = people_ids[-1]
            rel_contra = f"REL-CONTRA-{p_target}-{v_target}"
            edge_contra = GraphEdgeOntology(
                relationship_id=rel_contra,
                source=p_target,
                target=v_target,
                relationship_type="REPORTED_OCCUPANT",
                epistemic_status="CONTRADICTED",
                confidence=0.4,
                evidence_refs=["ANPR-DISCREPANCY-01"],
                source_refs=["SYNTHETIC_DATA"],
                case_scope=self.params.case_id,
                jurisdiction=self.params.jurisdiction,
                properties={"conflict_reason": "ANPR sighting contradicts CDR cell tower tower fix by 320 km/h"},
            )
            e_rec_contra = GraphProjectionRecord(
                canonical_object_id=rel_contra,
                canonical_object_type="Relationship",
                graph_object_id=rel_contra,
                operation=GraphOperationType.CREATE,
                version=1,
                case_id=self.params.case_id,
                jurisdiction=self.params.jurisdiction,
                epistemic_status="CONTRADICTED",
            )
            items.append(SyntheticStreamItem(record=e_rec_contra, edge=edge_contra, is_contradiction=True))

        # 6. Duplicate Injection for Idempotency Testing
        if self.params.duplicate_rate > 0 and len(items) > 0:
            first_item = items[0]
            dup_item = SyntheticStreamItem(
                record=first_item.record.model_copy(),
                node=first_item.node.model_copy() if first_item.node else None,
                edge=first_item.edge.model_copy() if first_item.edge else None,
                is_duplicate=True,
                is_synthetic=True,
            )
            items.append(dup_item)

        return items
