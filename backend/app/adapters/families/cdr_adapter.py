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


class CDRTelecomAdapter(SourceAdapter):
    """
    Adapter for Telecom Call Detail Records (CDR), SMS logs, and Cell Tower pings.
    Uses NormalizationService for E.164 phone standardization.
    """

    def __init__(self):
        super().__init__(
            adapter_id="CDR_TELECOM_ADAPTER",
            adapter_version="2.0.0",
            source_type=EvidenceSourceType.CDR_TELECOM,
        )

    def identify(self, data: bytes, metadata: Dict[str, Any]) -> bool:
        if metadata.get("source_type") == EvidenceSourceType.CDR_TELECOM:
            return True
        try:
            sample = json.loads(data.decode("utf-8", errors="ignore"))
            records = sample.get("records", [sample]) if isinstance(sample, dict) else sample
            if isinstance(records, list) and len(records) > 0:
                first = records[0]
                return "caller" in first or "calling_number" in first or "cell_tower" in first
            return False
        except Exception:
            return False

    def validate(self, artifact: EvidenceArtifact, data: bytes) -> Tuple[bool, List[str]]:
        errors = []
        try:
            payload = json.loads(data.decode("utf-8"))
            records = payload.get("records", [payload]) if isinstance(payload, dict) else payload
            if not isinstance(records, list) or len(records) == 0:
                errors.append("CDR payload must contain a list of records")
        except Exception as e:
            errors.append(f"Invalid CDR JSON: {e}")
        return len(errors) == 0, errors

    def parse(self, artifact: EvidenceArtifact, data: bytes) -> Dict[str, Any]:
        parsed = json.loads(data.decode("utf-8"))
        if isinstance(parsed, list):
            return {"records": parsed}
        if "records" not in parsed:
            return {"records": [parsed]}
        return parsed

    def normalize(self, raw_record: Dict[str, Any]) -> Dict[str, Any]:
        normalized = dict(raw_record)
        norm_records = []
        for rec in normalized.get("records", []):
            item = dict(rec)
            caller = item.get("caller") or item.get("calling_number", "")
            receiver = item.get("receiver") or item.get("called_number", "")
            if caller:
                item["normalized_caller"] = NormalizationService.normalize_phone(caller).normalized_value
            if receiver:
                item["normalized_receiver"] = NormalizationService.normalize_phone(receiver).normalized_value
            norm_records.append(item)
        normalized["records"] = norm_records
        return normalized

    def extract_observations(
        self, artifact: EvidenceArtifact, parsed_data: Dict[str, Any]
    ) -> List[EvidenceObservation]:
        observations = []
        for idx, rec in enumerate(parsed_data.get("records", [])):
            obs_type = "PHONE_CALL_RECORD" if rec.get("duration", 0) > 0 else "SMS_EVENT"
            geo = None
            if "lat" in rec and "lng" in rec:
                geo = {"lat": float(rec["lat"]), "lng": float(rec["lng"])}

            observations.append(
                EvidenceObservation(
                    artifact_id=artifact.artifact_id,
                    case_id=artifact.case_id,
                    source_location=f"record_index={idx}; call_id={rec.get('call_id', idx)}",
                    observation_type=obs_type,
                    observed_at=rec.get("timestamp", artifact.observed_at),
                    location_label=rec.get("cell_tower", "Cell Tower"),
                    geo_point=geo,
                    raw_data=rec,
                    extraction_method="CDR_PARSER_JSON_V2",
                    parser_version=self.adapter_version,
                )
            )
        return observations

    def extract_facts(
        self, artifact: EvidenceArtifact, observations: List[EvidenceObservation]
    ) -> List[EvidenceFact]:
        facts = []
        for obs in observations:
            rec = obs.raw_data
            caller = rec.get("normalized_caller") or rec.get("caller")
            receiver = rec.get("normalized_receiver") or rec.get("receiver")

            if caller and receiver:
                facts.append(
                    EvidenceFact(
                        case_id=artifact.case_id,
                        subject=caller,
                        predicate="CONTACTED",
                        object=receiver,
                        source_artifact_id=artifact.artifact_id,
                        source_observation_id=obs.observation_id,
                        source_location=obs.source_location,
                        observed_at=obs.observed_at,
                        extraction_method="CDR_DETERMINISTIC_EXTRACTION",
                        extraction_confidence=1.0,
                        source_reliability=SourceReliability.A_COMPLETELY_RELIABLE,
                        corroboration_level=CorroborationLevel.CORROBORATED,
                        epistemic_status=EpistemicStatus.FACT,
                        supporting_evidence_ids=[artifact.artifact_id],
                    )
                )

            # Sighting at cell tower
            if caller and obs.location_label:
                facts.append(
                    EvidenceFact(
                        case_id=artifact.case_id,
                        subject=caller,
                        predicate="CONNECTED_AT_CELL_TOWER",
                        object=obs.location_label,
                        source_artifact_id=artifact.artifact_id,
                        source_observation_id=obs.observation_id,
                        source_location=obs.source_location,
                        observed_at=obs.observed_at,
                        extraction_method="CDR_TOWER_LOCALIZATION",
                        extraction_confidence=0.90,
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
            events.append({
                "event_type": "TELECOM_TRANSMISSION",
                "timestamp": obs.observed_at,
                "title": f"Call: {obs.raw_data.get('caller')} -> {obs.raw_data.get('receiver')}",
                "description": f"Duration {obs.raw_data.get('duration', 0)}s at tower {obs.location_label}",
                "source_artifact_id": artifact.artifact_id,
            })
        return events

    def health(self) -> Dict[str, Any]:
        return {"status": "HEALTHY", "adapter": self.adapter_id, "version": self.adapter_version}

    def schema(self) -> Dict[str, Any]:
        return {"version": "2.0.0", "type": "object", "required": ["records"]}

    def capabilities(self) -> List[str]:
        return ["CDR_CALL_LOGS", "SMS_LOGS", "CELL_TOWER_SIGHTINGS", "PHONE_NORMALIZATION"]
