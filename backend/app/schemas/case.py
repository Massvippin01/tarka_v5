from typing import Any, Dict, List, Optional
from pydantic import Field
from .common import BaseSchema


class CaseCreate(BaseSchema):
    case_number: str
    fir_number: Optional[str] = None
    title: str
    description: Optional[str] = None
    crime_type: Optional[str] = "DIGITAL_ARREST"
    priority: Optional[str] = "HIGH_SYNDICATE"
    status: Optional[str] = "INTAKE"
    police_station: Optional[str] = "Noida Cyber Crime PS, UP"
    typology: Optional[str] = None
    assigned_io: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    station_id: Optional[str] = None
    claimed_loss_inr: Optional[float] = None
    booked_loss_inr: Optional[float] = None
    metadata_json: Optional[Dict[str, Any]] = None


class CasePatch(BaseSchema):
    title: Optional[str] = None
    description: Optional[str] = None
    crime_type: Optional[str] = None
    typology: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    police_station: Optional[str] = None
    station_id: Optional[str] = None
    fir_number: Optional[str] = None
    assigned_io: Optional[str] = None
    tags: Optional[List[str]] = None
    claimed_loss_inr: Optional[float] = None
    booked_loss_inr: Optional[float] = None
    recoverable_inr: Optional[float] = None
    metadata_json: Optional[Dict[str, Any]] = None


class CaseStatusRequest(BaseSchema):
    status: str
    reason: Optional[str] = None
    closure_checklist: Optional[Dict[str, Any]] = None


class CaseLinkRequest(BaseSchema):
    target_case_id: str
    link_type: Optional[str] = "RELATED_FIR"
    notes: Optional[str] = None


class CaseResponse(BaseSchema):
    id: str
    case_number: str
    fir_number: Optional[str] = None
    title: str
    description: Optional[str] = None
    crime_type: Optional[str] = "DIGITAL_ARREST"
    typology: Optional[str] = None
    priority: Optional[str] = "HIGH_SYNDICATE"
    status: Optional[str] = "INVESTIGATION_ACTIVE"
    police_station: Optional[str] = None
    station_id: Optional[str] = None
    assigned_io: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    archived_at: Optional[str] = None
    closed_at: Optional[str] = None
    closure_reason: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    complainant_name: Optional[str] = None
    claimed_loss_inr: Optional[float] = None
    booked_loss_inr: Optional[float] = None
    recoverable_inr: Optional[float] = None
    golden_hour_remaining_mins: Optional[int] = None
    metadata_json: Optional[Dict[str, Any]] = None
    artifacts_count: Optional[int] = 0
    syndicate_links: List[Dict[str, Any]] = Field(default_factory=list)
