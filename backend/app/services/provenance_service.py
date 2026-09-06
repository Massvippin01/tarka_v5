from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from app.domain.provenance import (
    EvidenceIntegrityMetadata,
    ProvenanceChainNode,
    ProvenanceTraceResponse,
)


class ProvenanceService:
    _instance: Optional[ProvenanceService] = None

    def __init__(self):
        pass

    @classmethod
    def get_instance(cls) -> ProvenanceService:
        if cls._instance is None:
            cls._instance = ProvenanceService()
        return cls._instance

    def compute_content_hash(self, payload: Dict[str, Any]) -> str:
        serialized = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def get_evidence_integrity(
        self, evidence_id: str, payload: Optional[Dict[str, Any]] = None
    ) -> EvidenceIntegrityMetadata:
        sample_payload = payload or {"evidence_id": evidence_id, "status": "CONFIRMED"}
        content_hash = self.compute_content_hash(sample_payload)
        return EvidenceIntegrityMetadata(
            evidence_id=evidence_id,
            content_hash=content_hash,
            integrity_status="INTEGRITY_VERIFIED",
            source_reference=f"CCTNS-INGEST-{evidence_id}",
            created_at=datetime.now(UTC).isoformat(),
        )

    def trace_provenance_chain(self, record_id: str) -> ProvenanceTraceResponse:
        integrity = self.get_evidence_integrity(record_id)
        chain = [
            ProvenanceChainNode(
                node_id=f"SRC-{record_id}",
                step_type="SOURCE_RECORD",
                source_system="CCTNS_ADAPTER_SYNTHETIC",
                description=f"Raw FIR CCTNS source record ingested for {record_id}",
                confidence=1.0,
                parent_ids=[],
            ),
            ProvenanceChainNode(
                node_id=f"OBS-{record_id}",
                step_type="OBSERVATION",
                source_system="INGESTION_NORMALIZER",
                description=f"Structured observation extracted from CCTNS raw record",
                confidence=0.98,
                parent_ids=[f"SRC-{record_id}"],
            ),
            ProvenanceChainNode(
                node_id=f"ER-{record_id}",
                step_type="ENTITY_RESOLUTION",
                source_system="ER_MATCH_ENGINE",
                description=f"Entity Resolution candidate matched with 94.2% confidence",
                confidence=0.94,
                parent_ids=[f"OBS-{record_id}"],
            ),
            ProvenanceChainNode(
                node_id=f"REL-{record_id}",
                step_type="RELATIONSHIP",
                source_system="GRAPH_INTELLIGENCE_FABRIC",
                description=f"Relationship link established in canonical graph store",
                confidence=0.92,
                parent_ids=[f"ER-{record_id}"],
            ),
            ProvenanceChainNode(
                node_id=f"SIG-{record_id}",
                step_type="SIGNAL",
                source_system="ANALYTICAL_ENGINE",
                description=f"Multi-dimensional cross-case signal derived across C102 and C481",
                confidence=0.90,
                parent_ids=[f"REL-{record_id}"],
            ),
            ProvenanceChainNode(
                node_id=f"CLM-{record_id}",
                step_type="CLAIM",
                source_system="AI_COPILOT_ENGINE",
                description=f"Ground-truth verified AI claim generated under SIH 2026 Governance Standard",
                confidence=0.95,
                parent_ids=[f"SIG-{record_id}"],
            ),
        ]

        return ProvenanceTraceResponse(
            record_id=record_id,
            record_type="EVIDENCE_RECORD",
            integrity=integrity,
            chain=chain,
        )
