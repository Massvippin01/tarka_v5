"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
TAIE INTEGRATION FOUNDATION PACKAGE

Standardized, secure, and provably compliant institutional ingestion layer
connecting banking switches, telecom CDR/IPDR dumps, and law enforcement portals
with TARKA's Canonical v1 domain models.
"""

from tarka.taie.manifest import InstitutionCapabilityManifest
from tarka.taie.sdk import BaseInstitutionalAdapter, IngestBatchResult
from tarka.taie.registry import ConnectorRegistry, default_connector_registry
from tarka.taie.mapping import CanonicalSchemaMappingEngine, MappingResult
from tarka.taie.provenance import (
    TransformationProvenanceTracker,
    TransformationProvenanceRecord,
)
from tarka.taie.health import (
    IntegrationHealthReporter,
    CircuitState,
    HealthReport,
)
from tarka.taie.idempotency import IdempotencyManager, IngestRecordEntry
from tarka.taie.evolution import SchemaEvolutionAnalyzer, EvolutionReport
from tarka.taie.claim_impact import (
    ClaimImpactEvaluator,
    ClaimImpactReport,
    ImpactedClaimSummary,
)
from tarka.taie.simulation import CompatibilitySimulationLab, SimulationLabReport
from tarka.taie.adapters import (
    MockBankRestAdapter,
    MockBankBatchAdapter,
    MockLegacyCBSAdapter,
)

__all__ = [
    "InstitutionCapabilityManifest",
    "BaseInstitutionalAdapter",
    "IngestBatchResult",
    "ConnectorRegistry",
    "default_connector_registry",
    "CanonicalSchemaMappingEngine",
    "MappingResult",
    "TransformationProvenanceTracker",
    "TransformationProvenanceRecord",
    "IntegrationHealthReporter",
    "CircuitState",
    "HealthReport",
    "IdempotencyManager",
    "IngestRecordEntry",
    "SchemaEvolutionAnalyzer",
    "EvolutionReport",
    "ClaimImpactEvaluator",
    "ClaimImpactReport",
    "ImpactedClaimSummary",
    "CompatibilitySimulationLab",
    "SimulationLabReport",
    "MockBankRestAdapter",
    "MockBankBatchAdapter",
    "MockLegacyCBSAdapter",
]

