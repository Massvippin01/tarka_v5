from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class EntityType(str, Enum):
    PERSON = "Person"
    CASE = "Case"
    FIR = "FIR"
    PHONE = "Phone"
    DEVICE = "Device"
    VEHICLE = "Vehicle"
    LOCATION = "Location"
    ORGANIZATION = "Organization"
    ACCOUNT = "Account"
    TRANSACTION = "Transaction"
    DOCUMENT = "Document"
    EVIDENCE = "Evidence"
    EVENT = "Event"


class ProvenanceMetadata(BaseModel):
    source_system: str = "SYNTHETIC_CCTNS"
    source_record_id: Optional[str] = None
    ingested_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    confidence_level: str = "DOCUMENTED"  # DOCUMENTED, INFERRED, PROPOSED
    review_status: str = "APPROVED"       # APPROVED, PENDING_REVIEW, REJECTED
    evidence_references: List[str] = Field(default_factory=list)


class CanonicalEntity(BaseModel):
    id: str
    type: EntityType
    display_name: str
    canonical_identifiers: Dict[str, Any] = Field(default_factory=dict)
    aliases: List[str] = Field(default_factory=list)
    source_references: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    observed_at: Optional[str] = None
    provenance: ProvenanceMetadata = Field(default_factory=ProvenanceMetadata)
    attributes: Dict[str, Any] = Field(default_factory=dict)

    def to_safe_dict(self) -> Dict[str, Any]:
        """
        Return dict representation with sensitive canonical identifiers masked for UI safety.
        """
        data = self.model_dump()
        safe_identifiers = {}
        for k, v in self.canonical_identifiers.items():
            if not v or not isinstance(v, str):
                safe_identifiers[k] = v
                continue
            str_v = str(v)
            if k.lower() in ("aadhaar", "aadhaar_number") and len(str_v) >= 12:
                safe_identifiers[k] = f"XXXX-XXXX-{str_v[-4:]}"
            elif k.lower() in ("pan", "pan_number") and len(str_v) >= 10:
                safe_identifiers[k] = f"{str_v[:2]}XXXXX{str_v[-3:]}"
            elif k.lower() in ("account_number", "bank_account") and len(str_v) >= 4:
                safe_identifiers[k] = f"XXXXXX{str_v[-4:]}"
            else:
                safe_identifiers[k] = v

        data["canonical_identifiers_masked"] = safe_identifiers
        return data
