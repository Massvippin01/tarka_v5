from __future__ import annotations

import json
from typing import Any, Dict, List, Tuple

from app.adapters.source_adapter import SourceAdapter
from app.domain.canonical_evidence_ir import (
    CorroborationLevel,
    EpistemicStatus,
    EvidenceArtifact,
    EvidenceFact,
    EvidenceObservation,
    EvidenceSourceType,
    SourceReliability,
)
from app.services.normalization_service import NormalizationService


class ForensicDocumentAdapter(SourceAdapter):
    """
    Adapter for Forensic Documents (Seizure Memos, Panchnamas, Witness Statements, Confession Memos, Invoices).
    """

    def __init__(self):
        super().__init__(
            adapter_id="FORENSIC_DOCUMENT_ADAPTER",
            adapter_version="2.0.0",
            source_type=EvidenceSourceType.FORENSIC_DOCUMENT,
        )

    def identify(self, data: bytes, metadata: Dict[str, Any]) -> bool:
        if metadata.get("source_type") == EvidenceSourceType.FORENSIC_DOCUMENT:
            return True
        try:
            sample = json.loads(data.decode("utf-8", errors="ignore"))
            return "document_title" in sample or "statement_text" in sample or "panchnama" in sample
        except Exception:
            return False

    def validate(self, artifact: EvidenceArtifact, data: bytes) -> Tuple[bool, List[str]]:
        errors = []
        try:
            payload = json.loads(data.decode("utf-8"))
            if not payload.get("document_title"):
                errors.append("Missing document_title")
            if not payload.get("statements") and not payload.get("content"):
                errors.append("Document must have statements or content")
        except Exception as e:
            errors.append(f"Invalid JSON: {e}")
        return len(errors) == 0, errors

    def parse(self, artifact: EvidenceArtifact, data: bytes) -> Dict[str, Any]:
        return json.loads(data.decode("utf-8"))

    def normalize(self, raw_record: Dict[str, Any]) -> Dict[str, Any]:
        normalized = dict(raw_record)
        author = normalized.get("author") or normalized.get("witness_name")
        if author:
            normalized["normalized_author"] = NormalizationService.normalize_name(author).normalized_value
        return normalized

    def extract_observations(
        self, artifact: EvidenceArtifact, parsed_data: Dict[str, Any]
    ) -> List[EvidenceObservation]:
        observations = []
        doc_title = parsed_data.get("document_title", "Document")
        author = parsed_data.get("normalized_author") or parsed_data.get("witness_name", "Witness")

        statements = parsed_data.get("statements", [parsed_data.get("content", "")])
        for idx, stmt in enumerate(statements):
            stmt_text = stmt if isinstance(stmt, str) else stmt.get("text", "")
            page_no = stmt.get("page", 1) if isinstance(stmt, dict) else 1

            observations.append(
                EvidenceObservation(
                    artifact_id=artifact.artifact_id,
                    case_id=artifact.case_id,
                    source_location=f"doc_title={doc_title}; page={page_no}; statement_index={idx}",
                    observation_type="DOCUMENTARY_STATEMENT",
                    observed_at=parsed_data.get("recorded_at", artifact.observed_at),
                    location_label=parsed_data.get("recording_location", "Investigator Office"),
                    raw_data={"statement": stmt_text, "author": author, "document_type": parsed_data.get("document_type")},
                    extraction_method="DOCUMENT_NLP_EXTRACTION_V2",
                    parser_version=self.adapter_version,
                )
            )

        return observations

    def extract_facts(
        self, artifact: EvidenceArtifact, observations: List[EvidenceObservation]
    ) -> List[EvidenceFact]:
        facts = []
        for obs in observations:
            author = obs.raw_data.get("author")
            doc_type = obs.raw_data.get("document_type", "STATEMENT")
            stmt = obs.raw_data.get("statement", "")

            # If document mentions an assertion or alibi
            facts.append(
                EvidenceFact(
                    case_id=artifact.case_id,
                    subject=author,
                    predicate="TESTIFIED_IN_DOCUMENT",
                    object=doc_type,
                    source_artifact_id=artifact.artifact_id,
                    source_observation_id=obs.observation_id,
                    source_location=obs.source_location,
                    observed_at=obs.observed_at,
                    extraction_method="DOCUMENT_STATEMENT_EXTRACTION",
                    extraction_confidence=0.90,
                    source_reliability=SourceReliability.B_USUALLY_RELIABLE,
                    corroboration_level=CorroborationLevel.SINGLE_SOURCE,
                    epistemic_status=EpistemicStatus.FACT,
                    supporting_evidence_ids=[artifact.artifact_id],
                )
            )

        return facts

    def extract_events(
        self, artifact: EvidenceArtifact, observations: List[EvidenceObservation]
    ) -> List[Dict[str, Any]]:
        return [
            {
                "event_type": "STATEMENT_RECORDED",
                "timestamp": artifact.observed_at,
                "title": f"Document Recorded: {artifact.record_id}",
                "description": "Witness or suspect statement officially recorded",
                "source_artifact_id": artifact.artifact_id,
            }
        ]

    def health(self) -> Dict[str, Any]:
        return {"status": "HEALTHY", "adapter": self.adapter_id, "version": self.adapter_version}

    def schema(self) -> Dict[str, Any]:
        return {"version": "2.0.0", "type": "object", "required": ["document_title"]}

    def capabilities(self) -> List[str]:
        return ["STATEMENT_EXTRACTION", "PANCHNAMA_PARSING", "ALIBI_RECORDING"]
