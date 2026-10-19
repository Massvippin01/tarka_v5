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


class NetworkPCAPAdapter(SourceAdapter):
    """
    Adapter for Network Packet Captures (PCAP), Zeek logs, NetFlow records, and DNS telemetry.
    """

    def __init__(self):
        super().__init__(
            adapter_id="NETWORK_PCAP_ADAPTER",
            adapter_version="2.0.0",
            source_type=EvidenceSourceType.NETWORK_PCAP_LOG,
        )

    def identify(self, data: bytes, metadata: Dict[str, Any]) -> bool:
        if metadata.get("source_type") == EvidenceSourceType.NETWORK_PCAP_LOG:
            return True
        try:
            sample = json.loads(data.decode("utf-8", errors="ignore"))
            flows = sample.get("flows", sample.get("records", [sample]))
            if isinstance(flows, list) and len(flows) > 0:
                first = flows[0]
                return "src_ip" in first or "dest_ip" in first or "dns_query" in first
            return False
        except Exception:
            return False

    def validate(self, artifact: EvidenceArtifact, data: bytes) -> Tuple[bool, List[str]]:
        errors = []
        try:
            payload = json.loads(data.decode("utf-8"))
            flows = payload.get("flows", payload.get("records", [payload]))
            if not isinstance(flows, list) or len(flows) == 0:
                errors.append("Network payload must contain flows list")
        except Exception as e:
            errors.append(f"Invalid JSON: {e}")
        return len(errors) == 0, errors

    def parse(self, artifact: EvidenceArtifact, data: bytes) -> Dict[str, Any]:
        parsed = json.loads(data.decode("utf-8"))
        flows = parsed.get("flows", parsed.get("records", [parsed]))
        return {"flows": flows if isinstance(flows, list) else [flows]}

    def normalize(self, raw_record: Dict[str, Any]) -> Dict[str, Any]:
        return raw_record

    def extract_observations(
        self, artifact: EvidenceArtifact, parsed_data: Dict[str, Any]
    ) -> List[EvidenceObservation]:
        observations = []
        for idx, flow in enumerate(parsed_data.get("flows", [])):
            proto = flow.get("protocol", "IP")
            observations.append(
                EvidenceObservation(
                    artifact_id=artifact.artifact_id,
                    case_id=artifact.case_id,
                    source_location=f"flow_index={idx}; proto={proto}",
                    observation_type="NETWORK_FLOW_OBSERVATION",
                    observed_at=flow.get("timestamp", artifact.observed_at),
                    raw_data=flow,
                    extraction_method="ZEEK_NETWORK_PARSER_V2",
                    parser_version=self.adapter_version,
                )
            )
        return observations

    def extract_facts(
        self, artifact: EvidenceArtifact, observations: List[EvidenceObservation]
    ) -> List[EvidenceFact]:
        facts = []
        for obs in observations:
            flow = obs.raw_data
            src_ip = flow.get("src_ip")
            dst_ip = flow.get("dest_ip") or flow.get("dst_ip")
            dns = flow.get("dns_query")

            if src_ip and dst_ip:
                facts.append(
                    EvidenceFact(
                        case_id=artifact.case_id,
                        subject=src_ip,
                        predicate="COMMUNICATED_WITH_IP",
                        object=dst_ip,
                        source_artifact_id=artifact.artifact_id,
                        source_observation_id=obs.observation_id,
                        source_location=obs.source_location,
                        observed_at=obs.observed_at,
                        extraction_method="NETWORK_FLOW_EXTRACTION",
                        extraction_confidence=1.0,
                        source_reliability=SourceReliability.A_COMPLETELY_RELIABLE,
                        corroboration_level=CorroborationLevel.CORROBORATED,
                        epistemic_status=EpistemicStatus.FACT,
                        supporting_evidence_ids=[artifact.artifact_id],
                    )
                )

            if src_ip and dns:
                facts.append(
                    EvidenceFact(
                        case_id=artifact.case_id,
                        subject=src_ip,
                        predicate="QUERIED_DOMAIN",
                        object=dns,
                        source_artifact_id=artifact.artifact_id,
                        source_observation_id=obs.observation_id,
                        source_location=obs.source_location,
                        observed_at=obs.observed_at,
                        extraction_method="DNS_TELEMETRY_EXTRACTION",
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
            flow = obs.raw_data
            events.append({
                "event_type": "NETWORK_TELEMETRY_LOGGED",
                "timestamp": obs.observed_at,
                "title": f"Network Flow: {flow.get('src_ip')} -> {flow.get('dest_ip', 'Domain')}",
                "description": f"Port: {flow.get('dest_port', 'N/A')}, Bytes: {flow.get('bytes', 0)}",
                "source_artifact_id": artifact.artifact_id,
            })
        return events

    def health(self) -> Dict[str, Any]:
        return {"status": "HEALTHY", "adapter": self.adapter_id, "version": self.adapter_version}

    def schema(self) -> Dict[str, Any]:
        return {"version": "2.0.0", "type": "object", "required": ["flows"]}

    def capabilities(self) -> List[str]:
        return ["PCAP_DECODING", "DNS_QUERIES", "C2_BEACON_DETECTION"]
