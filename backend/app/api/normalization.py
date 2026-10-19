from __future__ import annotations

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.services.auth_service import get_current_user
from app.services.normalization_service import NormalizationService, NormalizedValue

router = APIRouter(dependencies=[Depends(get_current_user)])


class NormalizationRequest(BaseModel):
    field_type: str = Field(..., description="phone, vehicle, name, alias, address, location, identifier, organization")
    raw_value: Any
    id_type: Optional[str] = "aadhaar"
    country_code: Optional[str] = "91"
    source_reference: Optional[str] = "INVESTIGATOR_INPUT"


@router.post("/clean", response_model=NormalizedValue)
def normalize_field(req: NormalizationRequest):
    ft = req.field_type.lower()
    if ft == "phone":
        return NormalizationService.normalize_phone(
            str(req.raw_value), country_code=req.country_code or "91", source_ref=req.source_reference
        )
    elif ft in ("vehicle", "vehicle_reg", "registration"):
        return NormalizationService.normalize_vehicle_registration(
            str(req.raw_value), source_ref=req.source_reference
        )
    elif ft == "name":
        return NormalizationService.normalize_name(
            str(req.raw_value), source_ref=req.source_reference
        )
    elif ft == "alias":
        return NormalizationService.normalize_alias(
            str(req.raw_value), source_ref=req.source_reference
        )
    elif ft == "address":
        return NormalizationService.normalize_address(
            str(req.raw_value), source_ref=req.source_reference
        )
    elif ft == "location":
        if isinstance(req.raw_value, dict) and "lat" in req.raw_value and "lng" in req.raw_value:
            return NormalizationService.normalize_location(
                float(req.raw_value["lat"]), float(req.raw_value["lng"]), source_ref=req.source_reference
            )
        elif isinstance(req.raw_value, str) and "," in req.raw_value:
            parts = req.raw_value.split(",")
            return NormalizationService.normalize_location(
                float(parts[0]), float(parts[1]), source_ref=req.source_reference
            )
    elif ft == "identifier":
        return NormalizationService.normalize_identifier(
            req.id_type or "aadhaar", str(req.raw_value), source_ref=req.source_reference
        )
    elif ft in ("organization", "org"):
        return NormalizationService.normalize_organization(
            str(req.raw_value), source_ref=req.source_reference
        )

    # Fallback default
    return NormalizedValue(
        raw_value=req.raw_value,
        normalized_value=str(req.raw_value).strip(),
        normalization_method="RAW_STRIP_FALLBACK",
        source_reference=req.source_reference,
    )
