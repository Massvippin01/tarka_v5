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


class MobileForensicAdapter(SourceAdapter):
    """
    Adapter for Mobile Device Forensic Exports (Cellebrite, UFED, XRY, WhatsApp chat databases).
    """

    def __init__(self):
        super().__init__(
            adapter_id="MOBILE_FORENSIC_ADAPTER",
            adapter_version="2.0.0",
            source_type=EvidenceSourceType.MOBILE_FORENSIC_EXPORT,
        )

    def identify(self, data: bytes, metadata: Dict[str, Any]) -> bool:
        if metadata.get("source_type") == EvidenceSourceType.MOBILE_FORENSIC_EXPORT:
            return True
        try:
            sample = json.loads(data.decode("utf-8", errors="ignore"))
            return "device_metadata" in sample or "chat_threads" in sample or "extracted_contacts" in sample
        except Exception:
            return False

    def validate(self, artifact: EvidenceArtifact, data: bytes) -> Tuple[bool, List[str]]:
        errors = []
        try:
            payload = json.loads(data.decode("utf-8"))
            if "device_metadata" not in payload and "chat_threads" not in payload:
                errors.append("Payload must have device_metadata or chat_threads")
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
        device = parsed_data.get("device_metadata", {})
        imei = device.get("imei", "UNKNOWN_IMEI")

        # Device extraction observation
        observations.append(
            EvidenceObservation(
                artifact_id=artifact.artifact_id,
                case_id=artifact.case_id,
                source_location=f"imei={imei}; json_path=$.device_metadata",
                observation_type="MOBILE_DEVICE_HARDWARE",
                observed_at=device.get("acquisition_timestamp", artifact.observed_at),
                raw_data=device,
                extraction_method="UFED_DEVICE_PARSER_V2",
                parser_version=self.adapter_version,
            )
        )

        # Chat messages
        for t_idx, thread in enumerate(parsed_data.get("chat_threads", [])):
            thread_id = thread.get("thread_id", f"TH-{t_idx}")
            for m_idx, msg in enumerate(thread.get("messages", [])):
                observations.append(
                    EvidenceObservation(
                        artifact_id=artifact.artifact_id,
                        case_id=artifact.case_id,
                        source_location=f"thread_id={thread_id}; message_index={m_idx}",
                        observation_type="INSTANT_MESSAGE_RECORD",
                        observed_at=msg.get("timestamp", artifact.observed_at),
                        raw_data=msg,
                        extraction_method="UFED_CHAT_DATABASE_PARSER",
                        parser_version=self.adapter_version,
                    )
                )

        return observations

    def extract_facts(
        self, artifact: EvidenceArtifact, observations: List[EvidenceObservation]
    ) -> List[EvidenceFact]:
        facts = []
        for obs in observations:
            if obs.observation_type == "INSTANT_MESSAGE_RECORD":
                sender = obs.raw_data.get("sender")
                recipient = obs.raw_data.get("recipient")
                if sender and recipient:
                    facts.append(
                        EvidenceFact(
                            case_id=artifact.case_id,
                            subject=sender,
                            predicate="MESSAGED",
                            object=recipient,
                            source_artifact_id=artifact.artifact_id,
                            source_observation_id=obs.observation_id,
                            source_location=obs.source_location,
                            observed_at=obs.observed_at,
                            extraction_method="CHAT_DATABASE_EXTRACTION",
                            extraction_confidence=0.98,
                            source_reliability=SourceReliability.A_COMPLETELY_RELIABLE,
                            corroboration_level=CorroborationLevel.CORROBORATED,
                            epistemic_status=EpistemicStatus.FACT,
                            supporting_evidence_ids=[artifact.artifact_id],
                        )
                    )
            elif obs.observation_type == "MOBILE_DEVICE_HARDWARE":
                dev = obs.raw_data
                imei = dev.get("imei")
                user = dev.get("extracted_owner")
                if imei and user:
                    facts.append(
                        EvidenceFact(
                            case_id=artifact.case_id,
                            subject=user,
                            predicate="POSSESSED_DEVICE",
                            object=imei,
                            source_artifact_id=artifact.artifact_id,
                            source_observation_id=obs.observation_id,
                            source_location=obs.source_location,
                            observed_at=obs.observed_at,
                            extraction_method="HARDWARE_SERIAL_EXTRACTION",
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
        return [
            {
                "event_type": "MOBILE_DEVICE_EXTRACTED",
                "timestamp": artifact.observed_at,
                "title": f"Mobile Forensic Image: {artifact.record_id}",
                "description": "Full physical extraction dump completed via forensic tool",
                "source_artifact_id": artifact.artifact_id,
            }
        ]

    def health(self) -> Dict[str, Any]:
        return {"status": "HEALTHY", "adapter": self.adapter_id, "version": self.adapter_version}

    def schema(self) -> Dict[str, Any]:
        return {"version": "2.0.0", "type": "object", "required": ["device_metadata"]}

    def capabilities(self) -> List[str]:
        return ["CHAT_COMMUNICATIONS", "DEVICE_IMEI", "CONTACT_LIST", "APP_DATA"]
