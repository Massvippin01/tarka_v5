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


class CCTNSFIRAdapter(SourceAdapter):
    """
    Adapter for CCTNS FIRs (First Information Reports) and Police Station records.
    """

    def __init__(self):
        super().__init__(
            adapter_id="CCTNS_FIR_ADAPTER",
            adapter_version="2.0.0",
            source_type=EvidenceSourceType.CCTNS_FIR,
        )

    def identify(self, data: bytes, metadata: Dict[str, Any]) -> bool:
        if metadata.get("source_type") == EvidenceSourceType.CCTNS_FIR:
            return True
        try:
            sample = json.loads(data.decode("utf-8", errors="ignore"))
            return "fir_number" in sample or "police_station" in sample
        except Exception:
            return False

    def validate(self, artifact: EvidenceArtifact, data: bytes) -> Tuple[bool, List[str]]:
        errors = []
        try:
            payload = json.loads(data.decode("utf-8"))
            if not payload.get("fir_number"):
                errors.append("Missing required field: fir_number")
            if not payload.get("police_station"):
                errors.append("Missing required field: police_station")
        except Exception as e:
            errors.append(f"Invalid JSON payload: {e}")
        return len(errors) == 0, errors

    def parse(self, artifact: EvidenceArtifact, data: bytes) -> Dict[str, Any]:
        return json.loads(data.decode("utf-8"))

    def normalize(self, raw_record: Dict[str, Any]) -> Dict[str, Any]:
        normalized = dict(raw_record)
        if "complainant" in normalized:
            c = normalized["complainant"]
            if isinstance(c, dict) and "name" in c:
                c["normalized_name"] = NormalizationService.normalize_name(c["name"]).normalized_value
        if "accused" in normalized and isinstance(normalized["accused"], list):
            for acc in normalized["accused"]:
                if "name" in acc:
                    acc["normalized_name"] = NormalizationService.normalize_name(acc["name"]).normalized_value
                if "alias" in acc:
                    acc["normalized_alias"] = NormalizationService.normalize_alias(acc["alias"]).normalized_value
        return normalized

    def extract_observations(
        self, artifact: EvidenceArtifact, parsed_data: Dict[str, Any]
    ) -> List[EvidenceObservation]:
        observations = []
        fir_num = parsed_data.get("fir_number", "UNKNOWN")
        incident_time = parsed_data.get("incident_datetime", artifact.observed_at)

        # Observation 1: FIR Registration
        observations.append(
            EvidenceObservation(
                artifact_id=artifact.artifact_id,
                case_id=artifact.case_id,
                source_location=f"fir_number={fir_num}; json_path=$.fir_number",
                observation_type="FIR_REGISTRATION",
                observed_at=incident_time,
                location_label=parsed_data.get("police_station", "Unknown Police Station"),
                raw_data=parsed_data,
                extraction_method="CCTNS_PARSER_JSON_V2",
                parser_version=self.adapter_version,
            )
        )

        # Observations for each accused
        for idx, acc in enumerate(parsed_data.get("accused", [])):
            observations.append(
                EvidenceObservation(
                    artifact_id=artifact.artifact_id,
                    case_id=artifact.case_id,
                    source_location=f"fir_number={fir_num}; json_path=$.accused[{idx}]",
                    observation_type="ACCUSED_NAMED_IN_FIR",
                    observed_at=incident_time,
                    raw_data=acc,
                    extraction_method="CCTNS_PARSER_JSON_V2",
                    parser_version=self.adapter_version,
                )
            )

        return observations

    def extract_facts(
        self, artifact: EvidenceArtifact, observations: List[EvidenceObservation]
    ) -> List[EvidenceFact]:
        facts = []
        for obs in observations:
            if obs.observation_type == "ACCUSED_NAMED_IN_FIR":
                acc_id = obs.raw_data.get("person_id") or obs.raw_data.get("normalized_name")
                facts.append(
                    EvidenceFact(
                        case_id=artifact.case_id,
                        subject=acc_id,
                        predicate="ACCUSED_IN",
                        object=artifact.case_id,
                        source_artifact_id=artifact.artifact_id,
                        source_observation_id=obs.observation_id,
                        source_location=obs.source_location,
                        observed_at=obs.observed_at,
                        extraction_method="CCTNS_DETERMINISTIC_EXTRACTION",
                        extraction_confidence=1.0,
                        source_reliability=SourceReliability.A_COMPLETELY_RELIABLE,
                        corroboration_level=CorroborationLevel.SINGLE_SOURCE,
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
            if obs.observation_type == "FIR_REGISTRATION":
                events.append({
                    "event_type": "CRIMINAL_INCIDENT_REPORTED",
                    "timestamp": obs.observed_at,
                    "title": f"FIR Registered: {obs.raw_data.get('fir_number')}",
                    "description": obs.raw_data.get("crime_summary", "Incident reported under IPC/IT Act"),
                    "source_artifact_id": artifact.artifact_id,
                })
        return events

    def health(self) -> Dict[str, Any]:
        return {"status": "HEALTHY", "adapter": self.adapter_id, "version": self.adapter_version}

    def schema(self) -> Dict[str, Any]:
        return {
            "version": "2.0.0",
            "type": "object",
            "required": ["fir_number", "police_station", "incident_datetime", "accused"],
        }

    def capabilities(self) -> List[str]:
        return ["FIR_REGISTRATION", "ACCUSED_EXTRACTION", "COMPLAINANT_EXTRACTION", "OFFENSE_CLASSIFICATION"]
