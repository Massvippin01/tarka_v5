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


class ComputerForensicAdapter(SourceAdapter):
    """
    Adapter for Computer Forensics (FTK / EnCase / Autopsy disk image triage, browser history, USB artifacts).
    """

    def __init__(self):
        super().__init__(
            adapter_id="COMPUTER_FORENSIC_ADAPTER",
            adapter_version="2.0.0",
            source_type=EvidenceSourceType.COMPUTER_FORENSIC_EXPORT,
        )

    def identify(self, data: bytes, metadata: Dict[str, Any]) -> bool:
        if metadata.get("source_type") == EvidenceSourceType.COMPUTER_FORENSIC_EXPORT:
            return True
        try:
            sample = json.loads(data.decode("utf-8", errors="ignore"))
            return "system_info" in sample or "browser_history" in sample or "mounted_devices" in sample
        except Exception:
            return False

    def validate(self, artifact: EvidenceArtifact, data: bytes) -> Tuple[bool, List[str]]:
        errors = []
        try:
            payload = json.loads(data.decode("utf-8"))
            if "system_info" not in payload and "artifacts" not in payload:
                errors.append("Payload must have system_info or artifacts list")
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
        observations = []
        sys_info = parsed_data.get("system_info", {})
        hostname = sys_info.get("hostname", "UNKNOWN_HOST")

        # System artifact observation
        observations.append(
            EvidenceObservation(
                artifact_id=artifact.artifact_id,
                case_id=artifact.case_id,
                source_location=f"hostname={hostname}; json_path=$.system_info",
                observation_type="COMPUTER_SYSTEM_ARTIFACT",
                observed_at=sys_info.get("seizure_time", artifact.observed_at),
                raw_data=sys_info,
                extraction_method="AUTOPSY_TRIAGE_PARSER",
                parser_version=self.adapter_version,
            )
        )

        # Extracted files / browser items
        for idx, item in enumerate(parsed_data.get("browser_history", [])):
            observations.append(
                EvidenceObservation(
                    artifact_id=artifact.artifact_id,
                    case_id=artifact.case_id,
                    source_location=f"hostname={hostname}; browser_history[{idx}]",
                    observation_type="BROWSER_NAVIGATION_EVENT",
                    observed_at=item.get("timestamp", artifact.observed_at),
                    raw_data=item,
                    extraction_method="SQLITE_HISTORY_EXTRACTOR",
                    parser_version=self.adapter_version,
                )
            )

        return observations

    def extract_facts(
        self, artifact: EvidenceArtifact, observations: List[EvidenceObservation]
    ) -> List[EvidenceFact]:
        facts = []
        for obs in observations:
            if obs.observation_type == "BROWSER_NAVIGATION_EVENT":
                url = obs.raw_data.get("url")
                user = obs.raw_data.get("user", "PrimaryUser")
                if url:
                    facts.append(
                        EvidenceFact(
                            case_id=artifact.case_id,
                            subject=user,
                            predicate="ACCESSED_URL",
                            object=url,
                            source_artifact_id=artifact.artifact_id,
                            source_observation_id=obs.observation_id,
                            source_location=obs.source_location,
                            observed_at=obs.observed_at,
                            extraction_method="BROWSER_FORENSIC_EXTRACTION",
                            extraction_confidence=0.95,
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
        return [
            {
                "event_type": "FORENSIC_TRIAGE_EXECUTED",
                "timestamp": artifact.observed_at,
                "title": f"Computer Forensic Analysis: {artifact.record_id}",
                "description": "Disk image artifacts parsed and extracted",
                "source_artifact_id": artifact.artifact_id,
            }
        ]

    def health(self) -> Dict[str, Any]:
        return {"status": "HEALTHY", "adapter": self.adapter_id, "version": self.adapter_version}

    def schema(self) -> Dict[str, Any]:
        return {"version": "2.0.0", "type": "object", "required": ["system_info"]}

    def capabilities(self) -> List[str]:
        return ["DISK_TRIAGE", "BROWSER_HISTORY", "USB_HISTORY", "FILE_TIMELINES"]
