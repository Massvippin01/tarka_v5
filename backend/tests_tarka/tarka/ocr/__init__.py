"""TARKA OCR Package.

Exposes production PaddleOCR extraction, normalized bounding polygons,
candidate financial fields, and review models.
"""

from tarka.ocr.schemas import (
    Point2D,
    BoundingPolygon,
    OCRToken,
    CandidateFieldType,
    CandidateReviewStatus,
    FinancialFieldCandidate,
    OCRExtractionResult,
    OCRReviewAction,
)
from tarka.ocr.normalization import (
    validate_and_normalize_coordinates,
    compute_enclosing_polygon,
    parse_monetary_amount,
    parse_rrn,
    parse_vpa,
)
from tarka.ocr.financial_fields import extract_candidate_financial_fields
from tarka.ocr.extractor import OCRExtractor
from tarka.ocr.pdf_processor import PDFProcessor, PDFExtractionResult

__all__ = [
    "Point2D",
    "BoundingPolygon",
    "OCRToken",
    "CandidateFieldType",
    "CandidateReviewStatus",
    "FinancialFieldCandidate",
    "OCRExtractionResult",
    "OCRReviewAction",
    "validate_and_normalize_coordinates",
    "compute_enclosing_polygon",
    "parse_monetary_amount",
    "parse_rrn",
    "parse_vpa",
    "extract_candidate_financial_fields",
    "OCRExtractor",
    "PDFProcessor",
    "PDFExtractionResult",
]
