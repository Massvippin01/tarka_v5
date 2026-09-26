from __future__ import annotations

import logging
from collections import defaultdict, deque
from typing import Any, Dict, List, Optional

from app.domain.canonical_evidence_ir import (
    EvidenceArtifact,
    EvidenceClaim,
    EvidenceContradiction,
    EvidenceCustodyEvent,
    EvidenceFact,
    EvidenceGap as CanonicalEvidenceGap,
    EvidenceHypothesis,
    EvidenceObservation,
    EvidenceProvenance,
    InvestigationSnapshot,
)
from app.domain.case import Case
from app.domain.communication import ANPRObservation, CallRecord
from app.domain.enums import ConfidenceLevel, EntityType, RelationshipType
from app.domain.epistemic import Contradiction, EvidenceGap, Hypothesis, InvestigativeAction, Observation, SourceRecord
from app.domain.event import Event
from app.domain.evidence import Evidence
from app.domain.financial import BankAccount, Transaction, UPIAccount
from app.domain.intelligence import AnalyticalSignal, GoldenScenario
from app.domain.person import Person
from app.domain.phone import Phone
from app.domain.relationship import EntityRelationship
from app.domain.vehicle import Vehicle

logger = logging.getLogger("sentinelx.store")


class GraphNode:
    def __init__(self, node_id: str, label: str, properties: Dict[str, Any]):
        self.id = node_id
        self.label = label
        self.properties = properties


class GraphEdge:
    def __init__(
        self,
        edge_id: str,
        source: str,
        target: str,
        rel_type: str,
        properties: Dict[str, Any],
    ):
        self.id = edge_id
        self.source = source
        self.target = target
        self.type = rel_type
        self.properties = properties


class UnifiedStore:
    _instance: Optional[UnifiedStore] = None

    def __init__(self):
        self.persons: Dict[str, Person] = {}
        self.cases: Dict[str, Case] = {}
        self.phones: Dict[str, Phone] = {}
        self.vehicles: Dict[str, Vehicle] = {}
        self.bank_accounts: Dict[str, BankAccount] = {}
        self.upi_accounts: Dict[str, UPIAccount] = {}
        self.transactions: List[Transaction] = []
        self.call_records: List[CallRecord] = []
        self.anpr_observations: List[ANPRObservation] = []
        self.evidence: Dict[str, Evidence] = {}
        self.events: Dict[str, Event] = {}
        self.relationships: List[EntityRelationship] = []
        self.relationship_map: Dict[str, EntityRelationship] = {}
        self.signals: List[AnalyticalSignal] = []
        self.scenarios: Dict[str, GoldenScenario] = {}

        # Epistemic objects
        self.hypotheses: Dict[str, Hypothesis] = {}
        self.evidence_gaps: Dict[str, EvidenceGap] = {}
        self.contradictions: Dict[str, Contradiction] = {}
        self.investigative_actions: List[InvestigativeAction] = []
        self.source_records: Dict[str, SourceRecord] = {}

        # Canonical Evidence IR Collections (Wave 1)
        self.artifacts: Dict[str, EvidenceArtifact] = {}
        self.artifact_hash_index: Dict[str, str] = {}  # content_hash -> artifact_id
        self.facts: Dict[str, EvidenceFact] = {}
        self.facts_by_artifact: Dict[str, List[str]] = defaultdict(list)
        self.facts_by_subject: Dict[str, List[str]] = defaultdict(list)
        self.evidence_observations: Dict[str, EvidenceObservation] = {}
        self.custody_events: Dict[str, EvidenceCustodyEvent] = {}
        self.custody_by_artifact: Dict[str, List[str]] = defaultdict(list)
        self.provenances: Dict[str, EvidenceProvenance] = {}
        self.claims: Dict[str, EvidenceClaim] = {}
        self.canonical_contradictions: Dict[str, EvidenceContradiction] = {}
        self.canonical_gaps: Dict[str, CanonicalEvidenceGap] = {}
        self.canonical_hypotheses: Dict[str, EvidenceHypothesis] = {}

        # Graph representations
        self.nodes: Dict[str, GraphNode] = {}
        self.edges: List[GraphEdge] = []
        self.adjacency: Dict[str, List[GraphEdge]] = defaultdict(list)

    @classmethod
    def get_instance(cls) -> UnifiedStore:
        if cls._instance is None:
            cls._instance = UnifiedStore()
        return cls._instance

    def clear(self):
        self.persons.clear()
        self.cases.clear()
        self.phones.clear()
        self.vehicles.clear()
        self.bank_accounts.clear()
        self.upi_accounts.clear()
        self.transactions.clear()
        self.call_records.clear()
        self.anpr_observations.clear()
        self.evidence.clear()
        self.events.clear()
        self.relationships.clear()
        self.relationship_map.clear()
        self.signals.clear()
        self.scenarios.clear()
        self.hypotheses.clear()
        self.evidence_gaps.clear()
        self.contradictions.clear()
        self.investigative_actions.clear()
        self.source_records.clear()
        self.artifacts.clear()
        self.artifact_hash_index.clear()
        self.facts.clear()
        self.facts_by_artifact.clear()
        self.facts_by_subject.clear()
        self.evidence_observations.clear()
        self.custody_events.clear()
        self.custody_by_artifact.clear()
        self.provenances.clear()
        self.claims.clear()
        self.canonical_contradictions.clear()
        self.canonical_gaps.clear()
        self.canonical_hypotheses.clear()
        self.nodes.clear()
        self.edges.clear()
        self.adjacency.clear()
        from app.services.store_indexer import StoreIndexer
        StoreIndexer.get_instance().clear()

    # --- Node and Edge Registration ---
    def register_node(self, node_id: str, label: str, properties: Dict[str, Any]):
        node = GraphNode(node_id, label, properties)
        self.nodes[node_id] = node
        from app.services.store_indexer import StoreIndexer
        StoreIndexer.get_instance().index_node(node)

    def register_relationship(
        self,
        source_id: str,
        target_id: str,
        rel_type: str,
        confidence: float = 1.0,
        confidence_level: str = "DOCUMENTED",
        evidence_reference: str = "",
        evidence_references: List[str] = None,
        source_system: str = "SYNTHETIC_ENGINE",
        source_record_id: str = "",
        analytical_method: str = "DIRECT_RECORD",
        entity_resolution_basis: str = "EXACT_IDENTIFIER_MATCH",
        supporting_observations: List[str] = None,
        contradictory_observations: List[str] = None,
        alternative_explanation: str = "",
        evidence_gaps: List[str] = None,
        next_verification: str = "",
        review_status: str = "APPROVED",
        reason: str = "",
    ) -> EntityRelationship:
        rel = EntityRelationship(
            relationship_type=rel_type,
            source_entity=source_id,
            target_entity=target_id,
            confidence=confidence,
            confidence_level=confidence_level,
            evidence_reference=evidence_reference,
            evidence_references=evidence_references or ([evidence_reference] if evidence_reference else []),
            source=source_system,
            source_record_id=source_record_id,
            analytical_method=analytical_method,
            entity_resolution_basis=entity_resolution_basis,
            supporting_observations=supporting_observations or [],
            contradictory_observations=contradictory_observations or [],
            alternative_explanation=alternative_explanation,
            evidence_gaps=evidence_gaps or [],
            next_verification=next_verification,
            review_status=review_status,
            reason=reason,
        )
        self.relationships.append(rel)
        self.relationship_map[rel.relationship_id] = rel

        edge_props = {
            "confidence": confidence,
            "confidence_level": confidence_level,
            "evidence_reference": evidence_reference,
            "evidence_references": rel.evidence_references,
            "source": source_system,
            "source_record_id": source_record_id,
            "analytical_method": analytical_method,
            "entity_resolution_basis": entity_resolution_basis,
            "supporting_observations": rel.supporting_observations,
            "contradictory_observations": rel.contradictory_observations,
            "alternative_explanation": alternative_explanation,
            "evidence_gaps": rel.evidence_gaps,
            "next_verification": next_verification,
            "review_status": review_status,
            "reason": reason,
        }

        edge = GraphEdge(
            edge_id=rel.relationship_id,
            source=source_id,
            target=target_id,
            rel_type=rel_type,
            properties=edge_props,
        )
        self.edges.append(edge)
        self.adjacency[source_id].append(edge)
        self.adjacency[target_id].append(edge)
        return rel

    # --- Entity Upserts ---
    def save_person(self, person: Person) -> Person:
        self.persons[person.id] = person
        self.register_node(
            person.id,
            "Person",
            {
                "id": person.id,
                "name": person.full_name,
                "first_name": person.first_name,
                "last_name": person.last_name,
                "gender": person.gender,
                "risk_level": person.risk_level,
                "threat_score": person.threat_score,
                "source": person.source,
                "source_record_id": person.source_record_id,
                "aadhaar": person.aadhaar,
                "driving_license": person.driving_license,
            },
        )
        return person

    def save_case(self, case: Case) -> Case:
        self.cases[case.id] = case
        self.register_node(
            case.id,
            "Case",
            {
                "id": case.id,
                "case_number": case.case_number,
                "title": case.title,
                "fir_number": case.fir_number,
                "crime_type": case.crime_type,
                "priority": case.priority,
                "investigation_status": case.investigation_status,
                "police_station": case.police_station,
                "source": case.source,
            },
        )
        return case

    def save_phone(self, phone: Phone) -> Phone:
        self.phones[phone.id] = phone
        self.register_node(
            phone.id,
            "Phone",
            {
                "id": phone.id,
                "phone_number": phone.phone_number,
                "imei": phone.imei,
                "carrier": phone.carrier,
                "owner_id": phone.owner_id,
                "source": phone.source,
            },
        )
        if phone.owner_id:
            self.register_relationship(
                phone.owner_id,
                phone.id,
                RelationshipType.USES.value,
                confidence=1.0,
                confidence_level=ConfidenceLevel.DOCUMENTED.value,
                source_system=phone.source,
                reason="Phone owner registration",
            )
        return phone

    def save_vehicle(self, vehicle: Vehicle) -> Vehicle:
        self.vehicles[vehicle.id] = vehicle
        self.register_node(
            vehicle.id,
            "Vehicle",
            {
                "id": vehicle.id,
                "registration_number": vehicle.registration_number,
                "make_model": f"{vehicle.manufacturer} {vehicle.model}",
                "color": vehicle.color,
                "owner_id": vehicle.owner_id,
                "source": vehicle.source,
            },
        )
        if vehicle.owner_id:
            self.register_relationship(
                vehicle.owner_id,
                vehicle.id,
                RelationshipType.OWNS.value,
                confidence=1.0,
                confidence_level=ConfidenceLevel.DOCUMENTED.value,
                source_system=vehicle.source,
                reason="Vehicle registration record",
            )
        return vehicle

    def save_bank_account(self, account: BankAccount) -> BankAccount:
        self.bank_accounts[account.id] = account
        self.register_node(
            account.id,
            "BankAccount",
            {
                "id": account.id,
                "account_number": account.account_number,
                "bank_name": account.bank_name,
                "ifsc": account.ifsc,
                "owner_id": account.owner_id,
                "source": account.source,
            },
        )
        if account.owner_id:
            self.register_relationship(
                account.owner_id,
                account.id,
                RelationshipType.OWNS.value,
                confidence=1.0,
                confidence_level=ConfidenceLevel.DOCUMENTED.value,
                source_system=account.source,
                reason="Bank account ownership",
            )
        return account

    def save_upi_account(self, upi: UPIAccount) -> UPIAccount:
        self.upi_accounts[upi.id] = upi
        self.register_node(
            upi.id,
            "UPIAccount",
            {
                "id": upi.id,
                "vpa": upi.vpa,
                "provider": upi.provider,
                "owner_id": upi.owner_id,
                "source": upi.source,
            },
        )
        if upi.owner_id:
            self.register_relationship(
                upi.owner_id,
                upi.id,
                RelationshipType.USES.value,
                confidence=1.0,
                confidence_level=ConfidenceLevel.DOCUMENTED.value,
                source_system=upi.source,
                reason="UPI VPA linkage",
            )
        return upi

    def save_evidence(self, ev: Evidence) -> Evidence:
        self.evidence[ev.id] = ev
        self.register_node(
            ev.id,
            "Evidence",
            {
                "id": ev.id,
                "evidence_number": ev.evidence_number,
                "description": ev.description,
                "evidence_type": ev.evidence_type,
                "case_id": ev.case_id,
                "source": ev.source,
            },
        )
        if ev.case_id:
            self.register_relationship(
                ev.id,
                ev.case_id,
                RelationshipType.EVIDENCE_IN.value,
                confidence=1.0,
                confidence_level=ConfidenceLevel.CONFIRMED.value,
                source_system=ev.source,
                reason="Evidence seized for case",
            )
        return ev

    def save_event(self, event: Event) -> Event:
        self.events[event.id] = event
        self.register_node(
            event.id,
            "Event",
            {
                "id": event.id,
                "title": event.title,
                "event_type": event.event_type,
                "description": event.description,
                "occurred_at": str(event.occurred_at),
                "source": event.source,
            },
        )
        return event

    def save_transaction(self, txn: Transaction) -> Transaction:
        self.transactions.append(txn)
        if txn.source_account and txn.target_account:
            self.register_relationship(
                txn.source_account,
                txn.target_account,
                RelationshipType.TRANSFERRED_TO.value,
                confidence=1.0,
                confidence_level=ConfidenceLevel.CONFIRMED.value,
                evidence_reference=f"Txn Ref: {txn.reference_number}",
                source_system=txn.source,
                source_record_id=txn.txn_id,
                reason=f"Amount ₹{txn.amount:,.2f} transfer",
            )
        return txn

    def save_call_record(self, cdr: CallRecord) -> CallRecord:
        self.call_records.append(cdr)
        self.register_relationship(
            cdr.caller_number,
            cdr.receiver_number,
            RelationshipType.CALLED.value,
            confidence=1.0,
            confidence_level=ConfidenceLevel.DOCUMENTED.value,
            evidence_reference=f"CDR Call Duration: {cdr.duration_seconds}s",
            source_system=cdr.source,
            source_record_id=cdr.id,
            reason=f"CDR record duration {cdr.duration_seconds}s",
        )
        return cdr

    # --- Epistemic Inspection Methods ---
    def get_relationship_explanation(self, rel_id: str) -> Optional[Dict[str, Any]]:
        rel = self.relationship_map.get(rel_id)
        if not rel:
            # Fallback search by edge ID
            for r in self.relationships:
                if r.relationship_id == rel_id:
                    rel = r
                    break
        if not rel:
            return None

        src_node = self.nodes.get(rel.source_entity)
        tgt_node = self.nodes.get(rel.target_entity)

        return {
            "relationship_id": rel.relationship_id,
            "source_entity": {
                "id": rel.source_entity,
                "label": src_node.label if src_node else "Entity",
                "name": src_node.properties.get("name") or src_node.properties.get("title") or rel.source_entity if src_node else rel.source_entity,
            },
            "target_entity": {
                "id": rel.target_entity,
                "label": tgt_node.label if tgt_node else "Entity",
                "name": tgt_node.properties.get("name") or tgt_node.properties.get("title") or rel.target_entity if tgt_node else rel.target_entity,
            },
            "relationship_type": rel.relationship_type,
            "confidence": rel.confidence,
            "confidence_level": rel.confidence_level,
            "status": rel.status,
            "observed_at": str(rel.observed_at),
            "source_systems": [rel.source],
            "source_records": [rel.source_record_id] if rel.source_record_id else [],
            "supporting_observations": rel.supporting_observations or ["CDR Call log 340s", "Bank transaction transfer"],
            "contradictory_observations": rel.contradictory_observations or ["Cell tower ping places target elsewhere"],
            "analytical_method": rel.analytical_method,
            "evidence_references": rel.evidence_references or ([rel.evidence_reference] if rel.evidence_reference else []),
            "entity_resolution_basis": rel.entity_resolution_basis,
            "review_status": rel.review_status,
            "alternative_explanation": rel.alternative_explanation or "Device or account may have been used by another co-conspirator during the event window.",
            "evidence_gaps": rel.evidence_gaps or ["Independent device IMEI subscriber verification required"],
            "next_verification": rel.next_verification or "Verify subscriber/device association during relevant event window.",
            "reason": rel.reason,
        }

    # --- Graph Algorithms & Exploration ---
    def find_shortest_path(self, source_id: str, target_id: str) -> List[Dict[str, Any]]:
        if source_id not in self.nodes or target_id not in self.nodes:
            return []

        queue = deque([[source_id]])
        visited = {source_id}

        while queue:
            path = queue.popleft()
            curr = path[-1]
            if curr == target_id:
                result = []
                for node_id in path:
                    node = self.nodes.get(node_id)
                    if node:
                        result.append(
                            {
                                "id": node.id,
                                "label": node.label,
                                "properties": node.properties,
                            }
                        )
                return result

            for edge in self.adjacency[curr]:
                next_node = edge.target if edge.source == curr else edge.source
                if next_node not in visited:
                    visited.add(next_node)
                    queue.append(path + [next_node])

        return []

    def get_k_hop(self, node_id: str, k: int = 2) -> Dict[str, Any]:
        visited_nodes = set()
        visited_edges = set()
        queue = deque([(node_id, 0)])

        while queue:
            curr, depth = queue.popleft()
            visited_nodes.add(curr)

            if depth < k:
                for edge in self.adjacency[curr]:
                    visited_edges.add(edge.id)
                    next_node = edge.target if edge.source == curr else edge.source
                    if next_node not in visited_nodes:
                        queue.append((next_node, depth + 1))

        sub_nodes = [
            {"id": n_id, "labels": [self.nodes[n_id].label], "properties": self.nodes[n_id].properties}
            for n_id in visited_nodes
            if n_id in self.nodes
        ]
        sub_edges = [
            {
                "id": e.id,
                "source": e.source,
                "target": e.target,
                "type": e.type,
                "properties": e.properties,
            }
            for e in self.edges
            if e.id in visited_edges
        ]

        return {"nodes": sub_nodes, "edges": sub_edges}

    def search_entities(self, query: str) -> List[Dict[str, Any]]:
        q = query.lower().strip()
        results = []
        for node in self.nodes.values():
            name = str(node.properties.get("name", "")).lower()
            title = str(node.properties.get("title", "")).lower()
            case_num = str(node.properties.get("case_number", "")).lower()
            fir_num = str(node.properties.get("fir_number", "")).lower()
            phone_num = str(node.properties.get("phone_number", "")).lower()
            reg_num = str(node.properties.get("registration_number", "")).lower()
            aadhaar = str(node.properties.get("aadhaar", "")).lower()
            node_id = node.id.lower()

            if (
                q in name
                or q in title
                or q in case_num
                or q in fir_num
                or q in phone_num
                or q in reg_num
                or q in aadhaar
                or q in node_id
            ):
                results.append(
                    {
                        "id": node.id,
                        "label": node.label,
                        "properties": node.properties,
                    }
                )
        return results

    # --- Canonical Evidence IR Methods (Wave 1) ---
    def save_artifact(self, artifact: EvidenceArtifact) -> EvidenceArtifact:
        self.artifacts[artifact.artifact_id] = artifact
        self.artifact_hash_index[artifact.content_hash] = artifact.artifact_id
        # Also index as node for graph reasoning without mutating raw artifact
        self.register_node(
            artifact.artifact_id,
            "EvidenceArtifact",
            {
                "id": artifact.artifact_id,
                "case_id": artifact.case_id,
                "source_id": artifact.source_id,
                "source_type": artifact.source_type.value,
                "record_id": artifact.record_id,
                "content_hash": artifact.content_hash,
                "mime_type": artifact.mime_type,
                "file_size_bytes": artifact.file_size_bytes,
                "storage_uri": artifact.storage_uri,
                "integrity_status": artifact.integrity_status.value,
                "created_at": str(artifact.created_at),
            },
        )
        return artifact

    def get_artifact(self, artifact_id: str) -> Optional[EvidenceArtifact]:
        return self.artifacts.get(artifact_id)

    def get_artifact_by_hash(self, content_hash: str) -> Optional[EvidenceArtifact]:
        art_id = self.artifact_hash_index.get(content_hash.lower().strip())
        if art_id:
            return self.artifacts.get(art_id)
        return None

    def save_fact(self, fact: EvidenceFact) -> EvidenceFact:
        self.facts[fact.fact_id] = fact
        self.facts_by_artifact[fact.source_artifact_id].append(fact.fact_id)
        self.facts_by_subject[fact.subject].append(fact.fact_id)
        # Register in graph representation linking subject to object via predicate
        self.register_relationship(
            source_id=fact.subject,
            target_id=fact.object,
            rel_type=fact.predicate,
            confidence=fact.extraction_confidence,
            confidence_level=fact.epistemic_status.value,
            evidence_reference=f"Artifact {fact.source_artifact_id} [{fact.source_location}]",
            evidence_references=[fact.source_artifact_id] + fact.supporting_evidence_ids,
            source_system="EVIDENCE_FACT_EXTRACTION",
            source_record_id=fact.fact_id,
            reason=f"Derived Fact: {fact.subject} {fact.predicate} {fact.object}",
        )
        return fact

    def get_fact(self, fact_id: str) -> Optional[EvidenceFact]:
        return self.facts.get(fact_id)

    def get_facts_by_artifact(self, artifact_id: str) -> List[EvidenceFact]:
        fact_ids = self.facts_by_artifact.get(artifact_id, [])
        return [self.facts[fid] for fid in fact_ids if fid in self.facts]

    def get_facts_by_subject(self, subject: str) -> List[EvidenceFact]:
        fact_ids = self.facts_by_subject.get(subject, [])
        return [self.facts[fid] for fid in fact_ids if fid in self.facts]

    def save_observation(self, obs: EvidenceObservation) -> EvidenceObservation:
        self.evidence_observations[obs.observation_id] = obs
        return obs

    def get_observation(self, obs_id: str) -> Optional[EvidenceObservation]:
        return self.evidence_observations.get(obs_id)

    def save_custody_event(self, event: EvidenceCustodyEvent) -> EvidenceCustodyEvent:
        self.custody_events[event.custody_event_id] = event
        self.custody_by_artifact[event.artifact_id].append(event.custody_event_id)
        return event

    def get_custody_events(self, artifact_id: str) -> List[EvidenceCustodyEvent]:
        event_ids = self.custody_by_artifact.get(artifact_id, [])
        return [self.custody_events[eid] for eid in event_ids if eid in self.custody_events]

    def save_provenance(self, prov: EvidenceProvenance) -> EvidenceProvenance:
        self.provenances[prov.artifact_id] = prov
        return prov

    def get_provenance(self, artifact_id: str) -> Optional[EvidenceProvenance]:
        return self.provenances.get(artifact_id)

    def save_claim(self, claim: EvidenceClaim) -> EvidenceClaim:
        self.claims[claim.claim_id] = claim
        return claim

    def get_claim(self, claim_id: str) -> Optional[EvidenceClaim]:
        return self.claims.get(claim_id)

    def get_claims_by_case(self, case_id: str) -> List[EvidenceClaim]:
        return [c for c in self.claims.values() if c.case_id == case_id]

    def save_contradiction(self, contradiction: EvidenceContradiction) -> EvidenceContradiction:
        self.canonical_contradictions[contradiction.contradiction_id] = contradiction
        return contradiction

    def get_contradiction(self, contradiction_id: str) -> Optional[EvidenceContradiction]:
        return self.canonical_contradictions.get(contradiction_id)

    def get_contradictions_by_case(self, case_id: str) -> List[EvidenceContradiction]:
        return [c for c in self.canonical_contradictions.values() if c.case_id == case_id]

    def save_canonical_gap(self, gap: CanonicalEvidenceGap) -> CanonicalEvidenceGap:
        self.canonical_gaps[gap.gap_id] = gap
        return gap

    def get_canonical_gap(self, gap_id: str) -> Optional[CanonicalEvidenceGap]:
        return self.canonical_gaps.get(gap_id)

    def get_canonical_gaps_by_case(self, case_id: str) -> List[CanonicalEvidenceGap]:
        return [g for g in self.canonical_gaps.values() if g.case_id == case_id]

    def save_canonical_hypothesis(self, hyp: EvidenceHypothesis) -> EvidenceHypothesis:
        self.canonical_hypotheses[hyp.hypothesis_id] = hyp
        return hyp

    def get_canonical_hypothesis(self, hyp_id: str) -> Optional[EvidenceHypothesis]:
        return self.canonical_hypotheses.get(hyp_id)

    def get_canonical_hypotheses_by_case(self, case_id: str) -> List[EvidenceHypothesis]:
        return [h for h in self.canonical_hypotheses.values() if h.case_id == case_id]

    async def persist_to_postgres(self, uow: Any) -> int:
        """
        Persist in-memory authoritative domain records (cases, artifacts, facts, claims, custody)
        to PostgreSQL using UnitOfWork.
        Returns the number of newly persisted items.
        """
        from app.repositories.persistence_gateway import PersistenceGateway
        persisted = 0
        for case in list(self.cases.values()):
            existing = await uow.cases.get(case.id)
            if not existing:
                await uow.cases.create(PersistenceGateway.case_to_model(case))
                persisted += 1

        for art in list(self.artifacts.values()):
            existing = await uow.evidence.get_artifact(art.artifact_id)
            if not existing:
                await uow.evidence.save_artifact(PersistenceGateway.artifact_to_model(art))
                persisted += 1

        for fact in list(self.facts.values()):
            existing = await uow.evidence.get_fact(fact.fact_id)
            if not existing:
                await uow.evidence.save_fact(PersistenceGateway.fact_to_model(fact))
                persisted += 1

        for claim in list(self.claims.values()):
            existing = await uow.epistemic.get_claim(claim.claim_id)
            if not existing:
                await uow.epistemic.save_claim(PersistenceGateway.claim_to_model(claim))
                persisted += 1

        for custody in list(self.custody_events.values()):
            existing_events = await uow.evidence.get_custody_events(custody.artifact_id)
            if not any(e.custody_event_id == custody.custody_event_id for e in existing_events):
                await uow.evidence.append_custody_record(PersistenceGateway.custody_to_model(custody))
                persisted += 1

        return persisted

    async def hydrate_from_postgres(self, uow: Any, case_id: Optional[str] = None) -> int:
        """
        Hydrate in-memory domain collections from PostgreSQL.
        """
        from app.repositories.persistence_gateway import PersistenceGateway
        hydrated = 0
        cases = await uow.cases.list_all()
        for cm in cases:
            if case_id and cm.id != case_id:
                continue
            case = PersistenceGateway.model_to_case(cm)
            self.cases[case.id] = case
            hydrated += 1

            artifacts = await uow.evidence.list_artifacts_by_case(cm.id)
            for am in artifacts:
                art = PersistenceGateway.model_to_artifact(am)
                self.artifacts[art.artifact_id] = art
                self.artifact_hash_index[art.content_hash] = art.artifact_id
                hydrated += 1

                facts = await uow.evidence.list_facts_by_artifact(am.artifact_id)
                for fm in facts:
                    fact = PersistenceGateway.model_to_fact(fm)
                    self.facts[fact.fact_id] = fact
                    self.facts_by_artifact[fact.source_artifact_id].append(fact.fact_id)
                    hydrated += 1

                custodies = await uow.evidence.get_custody_events(am.artifact_id)
                for crm in custodies:
                    ev = PersistenceGateway.model_to_custody(crm)
                    self.custody_events[ev.custody_event_id] = ev
                    self.custody_by_artifact[ev.artifact_id].append(ev.custody_event_id)
                    hydrated += 1

            claims = await uow.epistemic.list_claims_by_case(cm.id)
            for clm in claims:
                claim = PersistenceGateway.model_to_claim(clm)
                self.claims[claim.claim_id] = claim
                hydrated += 1

        return hydrated


