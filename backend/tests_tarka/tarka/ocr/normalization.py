"""TARKA Phase 4B: Coordinate and Text Normalization Utilities.

Provides mathematical validation and normalization for:
1. 2D points and 4-point polygon coordinates clamped to [0.0, 1.0].
2. Validation of finite coordinates and geometry sanity.
3. Text cleaning and financial token normalization (amounts, RRN, VPAs, timestamps).
"""

from __future__ import annotations

import math
import re
from typing import Any, List, Optional, Tuple
from tarka.ocr.schemas import BoundingPolygon, Point2D


def validate_and_normalize_coordinates(
    coords: List[List[float]],
    img_width: int,
    img_height: int,
) -> BoundingPolygon:
    """Validates raw image coordinates and normalizes into [0.0, 1.0] image space.

    Args:
        coords: List of 4 points [[x1, y1], [x2, y2], [x3, y3], [x4, y4]] in pixels.
        img_width: Pixel width of original image (> 0).
        img_height: Pixel height of original image (> 0).

    Returns:
        BoundingPolygon with 4 normalized Point2D vertices and axis-aligned bbox.
    """
    w = max(1, int(img_width))
    h = max(1, int(img_height))

    if not coords:
        # Default fallback unit box at center
        return BoundingPolygon(
            points=[
                Point2D(x=0.0, y=0.0),
                Point2D(x=1.0, y=0.0),
                Point2D(x=1.0, y=1.0),
                Point2D(x=0.0, y=1.0),
            ],
            bbox=(0.0, 0.0, 1.0, 1.0),
        )

    pts: List[Point2D] = []
    for pt in coords[:4]:
        raw_x = float(pt[0]) if len(pt) > 0 and math.isfinite(pt[0]) else 0.0
        raw_y = float(pt[1]) if len(pt) > 1 and math.isfinite(pt[1]) else 0.0

        # Normalize relative to image dimensions and clamp to [0.0, 1.0]
        nx = max(0.0, min(1.0, raw_x / w))
        ny = max(0.0, min(1.0, raw_y / h))
        pts.append(Point2D(x=round(nx, 5), y=round(ny, 5)))

    # Ensure exactly 4 points
    while len(pts) < 4:
        pts.append(Point2D(x=pts[-1].x, y=pts[-1].y) if pts else Point2D(x=0.0, y=0.0))

    min_x = min(p.x for p in pts)
    min_y = min(p.y for p in pts)
    max_x = max(p.x for p in pts)
    max_y = max(p.y for p in pts)

    return BoundingPolygon(
        points=pts,
        bbox=(round(min_x, 5), round(min_y, 5), round(max_x, 5), round(max_y, 5)),
    )


def compute_enclosing_polygon(polygons: List[BoundingPolygon]) -> BoundingPolygon:
    """Computes an enclosing bounding polygon spanning multiple contributing polygons."""
    if not polygons:
        return BoundingPolygon(
            points=[
                Point2D(x=0.0, y=0.0),
                Point2D(x=1.0, y=0.0),
                Point2D(x=1.0, y=1.0),
                Point2D(x=0.0, y=1.0),
            ],
            bbox=(0.0, 0.0, 1.0, 1.0),
        )

    all_x = [pt.x for poly in polygons for pt in poly.points]
    all_y = [pt.y for poly in polygons for pt in poly.points]

    min_x = max(0.0, min(all_x))
    min_y = max(0.0, min(all_y))
    max_x = min(1.0, max(all_x))
    max_y = min(1.0, max(all_y))

    pts = [
        Point2D(x=round(min_x, 5), y=round(min_y, 5)),
        Point2D(x=round(max_x, 5), y=round(min_y, 5)),
        Point2D(x=round(max_x, 5), y=round(max_y, 5)),
        Point2D(x=round(min_x, 5), y=round(max_y, 5)),
    ]
    return BoundingPolygon(
        points=pts,
        bbox=(round(min_x, 5), round(min_y, 5), round(max_x, 5), round(max_y, 5)),
    )


def normalize_whitespace(text: str) -> str:
    """Normalizes multiple spaces, tabs, and newlines."""
    return re.sub(r"\s+", " ", text or "").strip()


def parse_monetary_amount(text: str) -> Optional[float]:
    """Extracts numeric monetary amount from text like 'Rs 15,000', '₹15000.00', 'INR 15,000'."""
    cleaned = text.replace("₹", " ").replace("Rs.", " ").replace("Rs", " ").replace("INR", " ")
    match = re.search(r"\b(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?\b", cleaned)
    if match:
        num_str = match.group(0).replace(",", "")
        try:
            val = float(num_str)
            if val > 0:
                return val
        except ValueError:
            pass
    return None


def parse_rrn(text: str) -> Optional[str]:
    """Extracts 12-digit Indian UPI / Banking RRN reference number."""
    # Matches exactly 12 contiguous digits
    match = re.search(r"\b(\d{12})\b", text)
    if match:
        return match.group(1)
    return None


def parse_vpa(text: str) -> Optional[str]:
    """Extracts UPI Virtual Payment Address (e.g. user@bank, merchant.pay@okaxis)."""
    match = re.search(r"([a-zA-Z0-9_\.\-]+@[a-zA-Z0-9]+)", text)
    if match:
        return match.group(1).lower()
    return None
