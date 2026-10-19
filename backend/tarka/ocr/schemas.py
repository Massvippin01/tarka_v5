"""TARKA Phase 4B: OCR Data Models and Schemas.

Defines validated Pydantic models for:
- Normalized bounding points and polygons (0.0 to 1.0)
- OCR tokens with character/line positions and engine confidence
- Extracted candidate financial fields (Amount, RRN, VPA, Date/Time, Status)
- Extraction results with image metadata
- Investigator review actions and audit logs
"""

from __future__ import annotations

import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field, field_validator


class Point2D(BaseModel):
    """Normalized 2D coordinate where 0.0 <= x <= 1.0 and 0.0 <= y <= 1.0."""
    x: float = Field(ge=0.0, le=1.0, description="Normalized horizontal coordinate")
    y: float = Field(ge=0.0, le=1.0, description="Normalized vertical coordinate")

    @field_validator("x", "y")
    @classmethod
    def validate_finite(cls, v: float) -> float:
        if not (-0.0001 <= v <= 1.0001):
            raise ValueError(f"Coordinate must be normalized between 0.0 and 1.0, got {v}")
        return max(0.0, min(1.0, float(v)))


class BoundingPolygon(BaseModel):
    """4-point bounding polygon in normalized image space."""
    points: List[Point2D] = Field(min_length=4, max_length=4, description="Four polygon vertices in order")
    # Axis-aligned bounding box (min_x, min_y, max_x, max_y)
    bbox: Tuple[float, float, float, float] = Field(
        description="Axis-aligned bounding box [min_x, min_y, max_x, max_y]"
    )

    @classmethod
    def from_raw_coords(cls, coords: List[List[float]], img_width: int, img_height: int) -> "BoundingPolygon":
        """Construct normalized polygon from raw pixel coordinates [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]."""
        w = max(1, img_width)
        h = max(1, img_height)

        pts = []
        for pt in coords[:4]:
            nx = max(0.0, min(1.0, float(pt[0]) / w))
            ny = max(0.0, min(1.0, float(pt[1]) / h))
            pts.append(Point2D(x=round(nx, 5), y=round(ny, 5)))

        # Fill if fewer than 4 points
        while len(pts) < 4:
            pts.append(pts[-1] if pts else Point2D(x=0.0, y=0.0))

        min_x = min(p.x for p in pts)
        min_y = min(p.y for p in pts)
        max_x = max(p.x for p in pts)
        max_y = max(p.y for p in pts)

        return cls(points=pts, bbox=(round(min_x, 5), round(min_y, 5), round(max_x, 5), round(max_y, 5)))


class OCRToken(BaseModel):
    """Single recognized text token / line with source-linked confidence and polygon."""
    token_id: str = Field(description="Unique deterministic token identifier")
    artifact_id: str = Field(description="Preserved evidence artifact ID")
    run_id: str = Field(description="Associated OCR extraction run ID")
    text: str = Field(description="Raw recognized string")
    confidence: float = Field(ge=0.0, le=1.0, description="Raw model recognition confidence")
    polygon: BoundingPolygon = Field(description="Normalized 4-point bounding polygon")
    line_index: int = Field(ge=0, description="Line order in document reading flow")
    token_index: int = Field(ge=0, description="Token position inside line")


class CandidateFieldType(str, Enum):
    """Class of financial field parsed from OCR tokens."""
    AMOUNT = "AMOUNT"
    RRN = "RRN"
    PAYEE_VPA = "PAYEE_VPA"
    TRANSACTION_DATE = "TRANSACTION_DATE"
    TRANSACTION_TIME = "TRANSACTION_TIME"
    STATUS = "STATUS"
    PAYER_ACCOUNT = "PAYER_ACCOUNT"
    OTHER = "OTHER"


class CandidateReviewStatus(str, Enum):
    """Investigator review status of a proposed candidate field."""
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    MANUALLY_CORRECTED = "MANUALLY_CORRECTED"


class FinancialFieldCandidate(BaseModel):
    """Proposed candidate financial field linking OCR tokens to canonical values."""
    candidate_id: str = Field(description="Unique candidate identifier")
    artifact_id: str = Field(description="Parent artifact ID")
    run_id: str = Field(description="OCR extraction run ID")
    field_type: CandidateFieldType = Field(description="Detected financial field category")
    raw_text: str = Field(description="Verbatim raw text from supporting OCR tokens")
    normalized_value: Any = Field(description="Typed or cleaned value (e.g. float 15000.0, str 202602148891)")
    confidence: float = Field(ge=0.0, le=1.0, description="Aggregate confidence of supporting tokens")
    token_ids: List[str] = Field(description="IDs of contributing OCR tokens")
    polygon: BoundingPolygon = Field(description="Enclosing bounding polygon covering all contributing tokens")
    review_status: CandidateReviewStatus = Field(
        default=CandidateReviewStatus.PENDING,
        description="Current investigator review state",
    )
    corrected_value: Optional[Any] = Field(default=None, description="Investigator manual correction if modified")
    review_notes: Optional[str] = Field(default=None, description="Investigator review rationale or notes")
    reviewed_by: Optional[str] = Field(default=None, description="Investigating officer who reviewed this candidate")
    reviewed_at_iso: Optional[str] = Field(default=None, description="Timestamp of review")
    canonical_fact_id: Optional[str] = Field(default=None, description="Linked CanonicalFact ID once accepted")


class OCRExtractionResult(BaseModel):
    """Complete OCR extraction result containing all tokens, polygons, and candidate fields."""
    run_id: str = Field(description="Unique OCR extraction run identifier")
    artifact_id: str = Field(description="Target evidence artifact ID")
    case_id: str = Field(description="Case identifier")
    image_width: int = Field(gt=0, description="Original image pixel width")
    image_height: int = Field(gt=0, description="Original image pixel height")
    engine_name: str = Field(description="OCR engine implementation (e.g. PaddleOCR)")
    engine_version: str = Field(description="Version string of OCR engine")
    extracted_at_iso: str = Field(description="UTC ISO-8601 timestamp of extraction")
    tokens: List[OCRToken] = Field(default_factory=list, description="All recognized text tokens")
    candidates: List[FinancialFieldCandidate] = Field(
        default_factory=list,
        description="Extracted candidate financial fields",
    )
    full_text: str = Field(default="", description="Full concatenated recognized text")
    raw_metadata: Dict[str, Any] = Field(default_factory=dict, description="Engine specific execution metrics")


class OCRReviewAction(BaseModel):
    """Payload submitted by investigator to review a candidate financial field."""
    action: str = Field(description="Review action: ACCEPT, REJECT, or CORRECT")
    candidate_id: str = Field(description="Target candidate identifier")
    corrected_value: Optional[Any] = Field(default=None, description="Corrected value if action is CORRECT")
    review_notes: Optional[str] = Field(default=None, description="Investigator rationale or audit notes")
    reviewed_by: str = Field(default="Forensic Officer", description="Examiner ID")
