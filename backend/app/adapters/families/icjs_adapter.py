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


class ICJSRecordAdapter(SourceAdapter):
    """
    Adapter for ICJS (Inter-operable Criminal Justice System) records:
    Court dockets, bail hearings, conviction records, prison incarcerations.
    """

    def __init__(self):
        super().__init__(
            adapter_id="ICJS_RECORD_ADAPTER",
            adapter_version="2.0.0",
            source_type=EvidenceSourceType.ICJS_RECORD,
        )

    def identify(self, data: bytes, metadata: Dict[str, Any]) -> bool:
        if metadata.get("source_type") == EvidenceSourceType.ICJS_RECORD:
            return True
        try:
            sample = json.loads(data.decode("utf-8", errors="ignore"))
            return "icjs_record_id" in sample or "court_case_number" in sample
        except Exception:
            return False

    def validate(self, artifact: EvidenceArtifact, data: bytes) -> Tuple[bool, List[str]]:
        errors = []
        try:
            payload = json.loads(data.decode("utf-8"))
            if not payload.get("icjs_record_id") and not payload.get("record_id"):
                errors.append("Missing icjs_record_id")
            if not payload.get("subject"):
                errors.append("Missing subject data")
        except Exception as e:
            errors.append(f"Invalid JSON: {e}")
        return len(errors) == 0, errors

    def parse(self, artifact: EvidenceArtifact, data: bytes) -> Dict[str, Any]:
        return json.loads(data.decode("utf-8"))

    def normalize(self, raw_record: Dict[str, Any]) -> Dict[str, Any]:
        normalized = dict(raw_record)
        subj = normalized.get("subject", {})
        if "name" in subj:
            subj["normalized_name"] = NormalizationService.normalize_name(subj["name"]).normalized_value
        if "alias" in subj:
            subj["normalized_alias"] = NormalizationService.normalize_alias(subj["alias"]).normalized_value
        return normalized

    def extract_observations(
        self, artifact: EvidenceArtifact, parsed_data: Dict[str, Any]
    ) -> List[EvidenceObservation]:
        rec_id = parsed_data.get("icjs_record_id") or parsed_data.get("record_id", "ICJS-000")
        subj = parsed_data.get("subject", {})

        return [
            EvidenceObservation(
                artifact_id=artifact.artifact_id,
                case_id=artifact.case_id,
                source_location=f"icjs_record_id={rec_id}; json_path=$.subject",
                observation_type="JUDICIAL_RECORD_OBSERVATION",
                observed_at=parsed_data.get("disposition_date", artifact.observed_at),
                location_label=parsed_data.get("court_name", "Sessions Court"),
                raw_data=parsed_data,
                extraction_method="ICJS_PARSER_JSON_V2",
                parser_version=self.adapter_version,
            )
        ]

    def extract_facts(
        self, artifact: EvidenceArtifact, observations: List[EvidenceObservation]
    ) -> List[EvidenceFact]:
        facts = []
        for obs in observations:
            subj = obs.raw_data.get("subject", {})
            p_id = subj.get("person_id") or subj.get("normalized_name")
            status = obs.raw_data.get("legal_status", "ACCUSED")

            facts.append(
                EvidenceFact(
                    case_id=artifact.case_id,
                    subject=p_id,
                    predicate="HAS_LEGAL_STATUS",
                    object=status,
                    source_artifact_id=artifact.artifact_id,
                    source_observation_id=obs.observation_id,
                    source_location=obs.source_location,
                    observed_at=obs.observed_at,
                    extraction_method="ICJS_DETERMINISTIC_EXTRACTION",
                    extraction_confidence=1.0,
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
        events = []
        for obs in observations:
            events.append({
                "event_type": "JUDICIAL_PROCEEDING",
                "timestamp": obs.observed_at,
                "title": f"ICJS Proceeding: {obs.raw_data.get('court_name', 'Court')}",
                "description": obs.raw_data.get("charge_summary", "Judicial record entry"),
                "source_artifact_id": artifact.artifact_id,
            })
        return events

    def health(self) -> Dict[str, Any]:
        return {"status": "HEALTHY", "adapter": self.adapter_id, "version": self.adapter_version}

    def schema(self) -> Dict[str, Any]:
        return {"version": "2.0.0", "type": "object", "required": ["icjs_record_id", "subject"]}

    def capabilities(self) -> List[str]:
        return ["COURT_DOCKET", "PRISON_RECORD", "PRIORS_EXTRACTION"]
