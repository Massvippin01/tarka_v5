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


class CCTVANPRAdapter(SourceAdapter):
    """
    Adapter for CCTV Video Observations and ANPR (Automatic Number Plate Recognition) toll sightings.
    Normalizes vehicle registration numbers via NormalizationService.
    """

    def __init__(self):
        super().__init__(
            adapter_id="CCTV_ANPR_ADAPTER",
            adapter_version="2.0.0",
            source_type=EvidenceSourceType.CCTV_ANPR,
        )

    def identify(self, data: bytes, metadata: Dict[str, Any]) -> bool:
        if metadata.get("source_type") == EvidenceSourceType.CCTV_ANPR:
            return True
        try:
            sample = json.loads(data.decode("utf-8", errors="ignore"))
            items = sample.get("sightings", [sample]) if isinstance(sample, dict) else sample
            if isinstance(items, list) and len(items) > 0:
                first = items[0]
                return "plate_number" in first or "camera_id" in first or "vehicle_plate" in first
            return False
        except Exception:
            return False

    def validate(self, artifact: EvidenceArtifact, data: bytes) -> Tuple[bool, List[str]]:
        errors = []
        try:
            payload = json.loads(data.decode("utf-8"))
            items = payload.get("sightings", [payload]) if isinstance(payload, dict) else payload
            if not isinstance(items, list) or len(items) == 0:
                errors.append("Payload must have sightings list")
        except Exception as e:
            errors.append(f"Invalid JSON: {e}")
        return len(errors) == 0, errors

    def parse(self, artifact: EvidenceArtifact, data: bytes) -> Dict[str, Any]:
        parsed = json.loads(data.decode("utf-8"))
        if isinstance(parsed, list):
            return {"sightings": parsed}
        if "sightings" not in parsed:
            return {"sightings": [parsed]}
        return parsed

    def normalize(self, raw_record: Dict[str, Any]) -> Dict[str, Any]:
        normalized = dict(raw_record)
        norm_sightings = []
        for s in normalized.get("sightings", []):
            item = dict(s)
            plate = item.get("plate_number") or item.get("vehicle_plate", "")
            if plate:
                item["normalized_plate"] = NormalizationService.normalize_vehicle_registration(plate).normalized_value
            norm_sightings.append(item)
        normalized["sightings"] = norm_sightings
        return normalized

    def extract_observations(
        self, artifact: EvidenceArtifact, parsed_data: Dict[str, Any]
    ) -> List[EvidenceObservation]:
        observations = []
        for idx, s in enumerate(parsed_data.get("sightings", [])):
            cam_id = s.get("camera_id", "CAM-UNKNOWN")
            geo = None
            if "lat" in s and "lng" in s:
                geo = {"lat": float(s["lat"]), "lng": float(s["lng"])}

            observations.append(
                EvidenceObservation(
                    artifact_id=artifact.artifact_id,
                    case_id=artifact.case_id,
                    source_location=f"sighting_index={idx}; camera_id={cam_id}",
                    observation_type="VEHICLE_ANPR_SIGHTING",
                    observed_at=s.get("timestamp", artifact.observed_at),
                    location_label=s.get("location", f"Toll Camera {cam_id}"),
                    geo_point=geo,
                    raw_data=s,
                    extraction_method="ANPR_OCR_EXTRACTION_V2",
                    parser_version=self.adapter_version,
                )
            )
        return observations

    def extract_facts(
        self, artifact: EvidenceArtifact, observations: List[EvidenceObservation]
    ) -> List[EvidenceFact]:
        facts = []
        for obs in observations:
            s = obs.raw_data
            plate = s.get("normalized_plate") or s.get("plate_number")
            location = obs.location_label

            if plate and location:
                facts.append(
                    EvidenceFact(
                        case_id=artifact.case_id,
                        subject=plate,
                        predicate="SIGHTED_AT",
                        object=location,
                        source_artifact_id=artifact.artifact_id,
                        source_observation_id=obs.observation_id,
                        source_location=obs.source_location,
                        observed_at=obs.observed_at,
                        extraction_method="ANPR_PLATE_DETECTION",
                        extraction_confidence=s.get("ocr_confidence", 0.98),
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
            s = obs.raw_data
            events.append({
                "event_type": "VEHICLE_ANPR_CAPTURE",
                "timestamp": obs.observed_at,
                "title": f"Vehicle Sighting: {s.get('plate_number')} @ {obs.location_label}",
                "description": f"Vehicle detected by camera {s.get('camera_id')}",
                "source_artifact_id": artifact.artifact_id,
            })
        return events

    def health(self) -> Dict[str, Any]:
        return {"status": "HEALTHY", "adapter": self.adapter_id, "version": self.adapter_version}

    def schema(self) -> Dict[str, Any]:
        return {"version": "2.0.0", "type": "object", "required": ["sightings"]}

    def capabilities(self) -> List[str]:
        return ["ANPR_PLATE_OCR", "SPEED_CALCULATION", "TOLL_PLAZA_TRACKING"]
