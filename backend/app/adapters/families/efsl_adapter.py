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


class EFSLReportAdapter(SourceAdapter):
    """
    Adapter for e-FSL Forensic Science Laboratory official examination reports.
    """

    def __init__(self):
        super().__init__(
            adapter_id="EFSL_REPORT_ADAPTER",
            adapter_version="2.0.0",
            source_type=EvidenceSourceType.EFSL_REPORT,
        )

    def identify(self, data: bytes, metadata: Dict[str, Any]) -> bool:
        if metadata.get("source_type") == EvidenceSourceType.EFSL_REPORT:
            return True
        try:
            sample = json.loads(data.decode("utf-8", errors="ignore"))
            return "fsl_report_number" in sample or "laboratory" in sample
        except Exception:
            return False

    def validate(self, artifact: EvidenceArtifact, data: bytes) -> Tuple[bool, List[str]]:
        errors = []
        try:
            payload = json.loads(data.decode("utf-8"))
            if not payload.get("fsl_report_number"):
                errors.append("Missing fsl_report_number")
            if not payload.get("findings"):
                errors.append("Missing findings in FSL report")
        except Exception as e:
            errors.append(f"Invalid JSON: {e}")
        return len(errors) == 0, errors

    def parse(self, artifact: EvidenceArtifact, data: bytes) -> Dict[str, Any]:
        return json.loads(data.decode("utf-8"))

    def normalize(self, raw_record: Dict[str, Any]) -> Dict[str, Any]:
        return raw_record

    def extract_observations(
        self, artifact: EvidenceArtifact, parsed_data: Dict[str, Any]
    ) -> List[EvidenceObservation]:
        fsl_num = parsed_data.get("fsl_report_number", "FSL-UNKNOWN")
        observations = []

        for idx, item in enumerate(parsed_data.get("findings", [])):
            observations.append(
                EvidenceObservation(
                    artifact_id=artifact.artifact_id,
                    case_id=artifact.case_id,
                    source_location=f"fsl_report_number={fsl_num}; findings[{idx}]",
                    observation_type="FORENSIC_EXAMINATION_FINDING",
                    observed_at=parsed_data.get("examination_date", artifact.observed_at),
                    location_label=parsed_data.get("laboratory", "Forensic Science Laboratory"),
                    raw_data=item,
                    extraction_method="EFSL_PARSER_JSON_V2",
                    parser_version=self.adapter_version,
                )
            )

        return observations

    def extract_facts(
        self, artifact: EvidenceArtifact, observations: List[EvidenceObservation]
    ) -> List[EvidenceFact]:
        facts = []
        for obs in observations:
            finding = obs.raw_data
            facts.append(
                EvidenceFact(
                    case_id=artifact.case_id,
                    subject=finding.get("examined_entity_id", artifact.case_id),
                    predicate="FORENSICALLY_MATCHES" if finding.get("is_conclusive") else "EXAMINED_AS",
                    object=finding.get("conclusion", "Conclusive Forensic Result"),
                    source_artifact_id=artifact.artifact_id,
                    source_observation_id=obs.observation_id,
                    source_location=obs.source_location,
                    observed_at=obs.observed_at,
                    extraction_method="EFSL_EXPERT_EXTRACTION",
                    extraction_confidence=finding.get("confidence", 0.99),
                    source_reliability=SourceReliability.A_COMPLETELY_RELIABLE,
                    corroboration_level=CorroborationLevel.CORROBORATED,
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
                "event_type": "FSL_EXAMINATION_COMPLETED",
                "timestamp": artifact.observed_at,
                "title": f"FSL Report Completed: {artifact.record_id}",
                "description": "Forensic laboratory examination findings compiled",
                "source_artifact_id": artifact.artifact_id,
            }
        ]

    def health(self) -> Dict[str, Any]:
        return {"status": "HEALTHY", "adapter": self.adapter_id, "version": self.adapter_version}

    def schema(self) -> Dict[str, Any]:
        return {"version": "2.0.0", "type": "object", "required": ["fsl_report_number", "findings"]}

    def capabilities(self) -> List[str]:
        return ["FORENSIC_FINDINGS", "BALLISTIC_MATCH", "CHEMICAL_ANALYSIS", "DIGITAL_EXAMINATION"]
