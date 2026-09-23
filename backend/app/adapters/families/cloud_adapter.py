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


class CloudAuditAdapter(SourceAdapter):
    """
    Adapter for Cloud Audit Logs (AWS CloudTrail, Azure Activity, Google Workspace / GCP Audit).
    """

    def __init__(self):
        super().__init__(
            adapter_id="CLOUD_AUDIT_ADAPTER",
            adapter_version="2.0.0",
            source_type=EvidenceSourceType.CLOUD_AUDIT_LOG,
        )

    def identify(self, data: bytes, metadata: Dict[str, Any]) -> bool:
        if metadata.get("source_type") == EvidenceSourceType.CLOUD_AUDIT_LOG:
            return True
        try:
            sample = json.loads(data.decode("utf-8", errors="ignore"))
            events = sample.get("Records", sample.get("events", [sample]))
            if isinstance(events, list) and len(events) > 0:
                first = events[0]
                return "eventName" in first or "eventSource" in first or "principalId" in first or "source_ip" in first
            return False
        except Exception:
            return False

    def validate(self, artifact: EvidenceArtifact, data: bytes) -> Tuple[bool, List[str]]:
        errors = []
        try:
            payload = json.loads(data.decode("utf-8"))
            records = payload.get("Records", payload.get("events", [payload]))
            if not isinstance(records, list) or len(records) == 0:
                errors.append("Cloud log payload must contain event records")
        except Exception as e:
            errors.append(f"Invalid JSON: {e}")
        return len(errors) == 0, errors

    def parse(self, artifact: EvidenceArtifact, data: bytes) -> Dict[str, Any]:
        parsed = json.loads(data.decode("utf-8"))
        records = parsed.get("Records", parsed.get("events", [parsed]))
        return {"events": records if isinstance(records, list) else [records]}

    def normalize(self, raw_record: Dict[str, Any]) -> Dict[str, Any]:
        return raw_record

    def extract_observations(
        self, artifact: EvidenceArtifact, parsed_data: Dict[str, Any]
    ) -> List[EvidenceObservation]:
        observations = []
        for idx, ev in enumerate(parsed_data.get("events", [])):
            ev_name = ev.get("eventName") or ev.get("action", "CloudAction")
            observations.append(
                EvidenceObservation(
                    artifact_id=artifact.artifact_id,
                    case_id=artifact.case_id,
                    source_location=f"event_index={idx}; eventName={ev_name}",
                    observation_type="CLOUD_AUDIT_EVENT",
                    observed_at=ev.get("eventTime", artifact.observed_at),
                    location_label=ev.get("awsRegion") or ev.get("cloud_region", "Cloud Region"),
                    raw_data=ev,
                    extraction_method="CLOUDTRAIL_PARSER_V2",
                    parser_version=self.adapter_version,
                )
            )
        return observations

    def extract_facts(
        self, artifact: EvidenceArtifact, observations: List[EvidenceObservation]
    ) -> List[EvidenceFact]:
        facts = []
        for obs in observations:
            ev = obs.raw_data
            user = ev.get("userIdentity", {}).get("userName") or ev.get("principal", "UnknownPrincipal")
            action = ev.get("eventName") or ev.get("action")
            src_ip = ev.get("sourceIPAddress") or ev.get("source_ip")

            if user and src_ip:
                facts.append(
                    EvidenceFact(
                        case_id=artifact.case_id,
                        subject=user,
                        predicate="AUTHENTICATED_FROM_IP",
                        object=src_ip,
                        source_artifact_id=artifact.artifact_id,
                        source_observation_id=obs.observation_id,
                        source_location=obs.source_location,
                        observed_at=obs.observed_at,
                        extraction_method="CLOUD_IAM_AUDIT_EXTRACTION",
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
            ev = obs.raw_data
            events.append({
                "event_type": "CLOUD_OPERATION_EXECUTED",
                "timestamp": obs.observed_at,
                "title": f"Cloud Action: {ev.get('eventName', 'API Call')}",
                "description": f"Executed by {ev.get('userIdentity', {}).get('userName', 'User')} from {ev.get('sourceIPAddress', 'IP')}",
                "source_artifact_id": artifact.artifact_id,
            })
        return events

    def health(self) -> Dict[str, Any]:
        return {"status": "HEALTHY", "adapter": self.adapter_id, "version": self.adapter_version}

    def schema(self) -> Dict[str, Any]:
        return {"version": "2.0.0", "type": "object", "required": ["events"]}

    def capabilities(self) -> List[str]:
        return ["IAM_AUDIT", "CLOUD_API_ACTIVITY", "IP_PROVENANCE"]
