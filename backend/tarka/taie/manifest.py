"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
TAIE INTEGRATION FOUNDATION: INSTITUTION CAPABILITY MANIFEST

Defines the formal capability profile, statutory scope, rate limits,
and consent policies for institutional data exchange.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class InstitutionCapabilityManifest(BaseModel):
    """
    Formal capability manifest published by or registered for an institutional connector.
    Governs protocol, schema, rate limits, and statutory authority.
    """
    institution_id: str = Field(..., description="Unique institution identifier (e.g. HDFC_BANK, AIRTEL_IND)")
    institution_name: str = Field(..., description="Human-readable organization name")
    institution_type: str = Field(..., description="Entity class: BANK, TELCO, PAYMENT_GATEWAY, LAW_ENFORCEMENT")
    supported_protocols: List[str] = Field(
        default_factory=list,
        description="Supported transport protocols: REST, BATCH_FILE, LEGACY_CBS, GRPC"
    )
    supported_schemas: List[str] = Field(
        default_factory=list,
        description="Supported data schemas: CANONICAL_V1, CBS_8583, UPI_SWITCH_V2, TELCO_IPDR_V1"
    )
    rate_limits: Dict[str, Any] = Field(
        default_factory=lambda: {
            "requests_per_minute": 600,
            "max_batch_size": 10000,
            "burst_limit": 50
        },
        description="Rate limiting constraints"
    )
    concurrency_limits: Dict[str, Any] = Field(
        default_factory=lambda: {
            "max_concurrent_connections": 10,
            "max_concurrent_batches": 2
        },
        description="Concurrency boundaries"
    )
    statutory_scopes: List[str] = Field(
        default_factory=lambda: ["PMLA_2002", "IT_ACT_69A", "CRPC_91", "RBI_MASTER_DIRECTION"],
        description="Legal and statutory authorizations under Indian jurisdiction"
    )
    data_classification_policy: Dict[str, Any] = Field(
        default_factory=lambda: {
            "allowed_tiers": ["T1", "T2"],
            "encryption": "AES_256_GCM",
            "retention_days": 3650,
            "air_gap_compliant": True
        },
        description="Information security and evidence handling policy"
    )
    consent_framework_policy: Dict[str, Any] = Field(
        default_factory=lambda: {
            "requires_warrant_ref": True,
            "customer_notification": False,
            "mandate_type": "STATUTORY_SUMMONS",
            "institutional_consent_recorded": True
        },
        description="Explicit warrant references and consent boundaries"
    )
    schema_version: str = Field(default="v1.0.0")
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def is_protocol_supported(self, protocol: str) -> bool:
        return protocol.upper() in [p.upper() for p in self.supported_protocols]

    def is_schema_supported(self, schema_name: str) -> bool:
        return schema_name.upper() in [s.upper() for s in self.supported_schemas]

    def check_statutory_scope(self, statute: str) -> bool:
        return statute.upper() in [s.upper() for s in self.statutory_scopes]

    def validate_batch_size(self, size: int) -> bool:
        max_size = self.rate_limits.get("max_batch_size", 10000)
        return 0 < size <= max_size

