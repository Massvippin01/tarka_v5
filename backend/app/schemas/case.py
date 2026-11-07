from typing import Any, Dict, Optional
from .common import BaseSchema


class CaseCreate(BaseSchema):
    case_number: str
    fir_number: Optional[str] = None
    title: str
    description: Optional[str] = None
    crime_type: Optional[str] = "DIGITAL_ARREST"
    priority: Optional[str] = "HIGH_SYNDICATE"
    police_station: Optional[str] = "Noida Cyber Crime PS, UP"
    metadata_json: Optional[Dict[str, Any]] = None


class CaseResponse(BaseSchema):
    id: str
    case_number: str
    fir_number: Optional[str] = None
    title: str
    description: Optional[str] = None
    crime_type: Optional[str] = "DIGITAL_ARREST"
    priority: Optional[str] = "HIGH_SYNDICATE"
    status: Optional[str] = "INVESTIGATION_ACTIVE"
    police_station: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None
    artifacts_count: Optional[int] = 0
