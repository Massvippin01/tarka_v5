from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Tuple

from app.adapters.adapter_context import AdapterContext
from app.adapters.adapter_result import AdapterResult
from app.domain.canonical_evidence_ir import (
    EvidenceArtifact,
    EvidenceFact,
    EvidenceObservation,
    EvidenceSourceType,
)


class SourceAdapter(ABC):
    """
    Standard plugin contract for all investigative and forensic source adapters.
    
    Adapters parse, normalize, and extract observations, facts, and events from artifacts.
    Adapters NEVER own:
      - hashing
      - object storage
      - chain of custody
      - artifact identity
      - authorization
      - raw evidence mutation
    """

    def __init__(self, adapter_id: str, adapter_version: str, source_type: EvidenceSourceType):
        self.adapter_id = adapter_id
        self.adapter_version = adapter_version
        self.source_type = source_type

    @abstractmethod
    def identify(self, data: bytes, metadata: Dict[str, Any]) -> bool:
        """Return True if this adapter can process the given data payload or file metadata."""
        pass

    @abstractmethod
    def validate(self, artifact: EvidenceArtifact, data: bytes) -> Tuple[bool, List[str]]:
        """Validate payload structure and schema compliance. Return (is_valid, error_list)."""
        pass

    @abstractmethod
    def parse(self, artifact: EvidenceArtifact, data: bytes) -> Dict[str, Any]:
        """Parse raw bytes into structured dictionary representation."""
        pass

    @abstractmethod
    def normalize(self, raw_record: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize attributes (phones, vehicles, names) using NormalizationService."""
        pass

    @abstractmethod
    def extract_observations(
        self, artifact: EvidenceArtifact, parsed_data: Dict[str, Any]
    ) -> List[EvidenceObservation]:
        """Extract atomic evidence observations preserving exact source location."""
        pass

    @abstractmethod
    def extract_facts(
        self, artifact: EvidenceArtifact, observations: List[EvidenceObservation]
    ) -> List[EvidenceFact]:
        """Extract derived facts anchored to observations and the source artifact."""
        pass

    @abstractmethod
    def extract_events(
        self, artifact: EvidenceArtifact, observations: List[EvidenceObservation]
    ) -> List[Dict[str, Any]]:
        """Extract temporal investigation events."""
        pass

    def execute(self, context: AdapterContext, data: bytes) -> AdapterResult:
        """
        Execute full adapter pipeline: validate -> parse -> normalize -> extract -> return AdapterResult.
        """
        artifact = context.artifact
        is_valid, validation_errors = self.validate(artifact, data)
        if not is_valid:
            return AdapterResult(
                adapter_id=self.adapter_id,
                adapter_version=self.adapter_version,
                source_type=self.source_type,
                schema_version=self.schema().get("version", "1.0.0"),
                observations=[],
                facts=[],
                events=[],
                warnings=[],
                errors=validation_errors,
                provenance_metadata={"status": "VALIDATION_FAILED"},
            )

        try:
            parsed = self.parse(artifact, data)
            normalized = self.normalize(parsed)
            observations = self.extract_observations(artifact, normalized)
            facts = self.extract_facts(artifact, observations)
            events = self.extract_events(artifact, observations)

            return AdapterResult(
                adapter_id=self.adapter_id,
                adapter_version=self.adapter_version,
                source_type=self.source_type,
                schema_version=self.schema().get("version", "1.0.0"),
                observations=observations,
                facts=facts,
                events=events,
                warnings=[],
                errors=[],
                provenance_metadata={
                    "adapter_id": self.adapter_id,
                    "adapter_version": self.adapter_version,
                    "artifact_id": artifact.artifact_id,
                    "content_hash": artifact.content_hash,
                },
            )
        except Exception as e:
            return AdapterResult(
                adapter_id=self.adapter_id,
                adapter_version=self.adapter_version,
                source_type=self.source_type,
                schema_version=self.schema().get("version", "1.0.0"),
                observations=[],
                facts=[],
                events=[],
                warnings=[],
                errors=[f"Adapter execution error: {str(e)}"],
                provenance_metadata={"status": "EXCEPTION", "error": str(e)},
            )

    @abstractmethod
    def health(self) -> Dict[str, Any]:
        """Return adapter operational health status."""
        pass

    @abstractmethod
    def schema(self) -> Dict[str, Any]:
        """Return expected JSON schema or field contract."""
        pass

    @abstractmethod
    def capabilities(self) -> List[str]:
        """Return list of extraction capabilities (e.g. ['OBSERVATIONS', 'FACTS', 'EVENTS'])."""
        pass
