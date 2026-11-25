"""TARKA Phase 4B: OCR Extractor Adapter and Orchestration.

Provides production OCR extraction with:
- PaddleOCR integration with pinned CPU settings
- Graceful fallbacks for system/device faults
- Validated normalized 4-point bounding polygons [0.0, 1.0]
- Token IDs and candidate financial fields
- Immutable preservation of original image bytes
"""

from __future__ import annotations

import datetime
import io
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
from PIL import Image, ImageOps

from tarka.ocr.schemas import (
    BoundingPolygon,
    FinancialFieldCandidate,
    OCRExtractionResult,
    OCRToken,
)
from tarka.ocr.normalization import validate_and_normalize_coordinates
from tarka.ocr.financial_fields import extract_candidate_financial_fields

logger = logging.getLogger("tarka.ocr")

# Configure environment for PaddlePaddle CPU compatibility on Windows
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "False"
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"


class OCRExtractor:
    """Forensic OCR orchestrator producing normalized tokens and financial fields."""

    def __init__(self, preferred_engine: str = "PaddleOCR"):
        self.preferred_engine = preferred_engine
        self._paddle_ocr = None
        self._rapid_ocr = None
        self._init_paddle_engine()

    def _init_paddle_engine(self):
        """Initializes PaddleOCR or RapidOCR engine safely."""
        try:
            from paddleocr import PaddleOCR
            # Initialize with English language and mobile detection
            self._paddle_ocr = PaddleOCR(
                ocr_version="PP-OCRv4",
                lang="en",
                use_textline_orientation=True,
            )
            logger.info("PaddleOCR engine initialized successfully.")
            return
        except Exception as exc:
            logger.info(f"PaddleOCR not available, trying RapidOCR: {exc}")
            self._paddle_ocr = None

        try:
            from rapidocr_onnxruntime import RapidOCR
            self._rapid_ocr = RapidOCR()
            logger.info("RapidOCR (ONNX) engine initialized successfully.")
        except Exception as exc:
            logger.warning(f"Neither PaddleOCR nor RapidOCR available: {exc}")
            self._rapid_ocr = None

    def extract_from_bytes(
        self,
        image_bytes: bytes,
        artifact_id: str,
        case_id: str = "upi_payment_discrepancy",
    ) -> OCRExtractionResult:
        """Extracts OCR text and bounding polygons from raw image bitstream.

        Args:
            image_bytes: Immutable raw file bytes.
            artifact_id: Preserved artifact identifier.
            case_id: Target case identifier.

        Returns:
            OCRExtractionResult with tokens, polygons, and candidate financial fields.
        """
        if not image_bytes or len(image_bytes) == 0:
            raise ValueError("Cannot perform OCR on empty or null image bitstream.")

        # Inspect and validate image with Pillow (respecting EXIF orientation)
        try:
            with Image.open(io.BytesIO(image_bytes)) as pil_img:
                pil_img = ImageOps.exif_transpose(pil_img) or pil_img
                img_width, img_height = pil_img.size
                img_format = pil_img.format or "PNG"
                # Convert to RGB if palette/RGBA
                rgb_img = pil_img.convert("RGB")
        except Exception as exc:
            raise ValueError(f"Invalid or corrupted image format: {exc}") from exc

        if img_width <= 0 or img_height <= 0:
            raise ValueError(f"Invalid image dimensions: {img_width}x{img_height}")

        timestamp_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        run_id = f"ocr_run_{artifact_id}_{int(datetime.datetime.now(datetime.timezone.utc).timestamp())}"

        tokens: List[OCRToken] = []
        engine_name = "PaddleOCR"
        engine_version = ""

        # 1. Execute PaddleOCR
        if self._paddle_ocr is not None:
            try:
                # Save temporarily or pass PIL / ndarray
                import numpy as np
                img_np = np.array(rgb_img)
                res = self._paddle_ocr.predict(img_np)
                if res and len(res) > 0:
                    raw_dict = res[0]
                    rec_texts = raw_dict.get("rec_texts", [])
                    rec_scores = raw_dict.get("rec_scores", [])
                    rec_polys = raw_dict.get("rec_polys", [])

                    for idx, (text, score, poly) in enumerate(zip(rec_texts, rec_scores, rec_polys)):
                        # Poly is typically 4x2 array: [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
                        raw_coords = poly.tolist() if hasattr(poly, "tolist") else list(poly)
                        norm_poly = validate_and_normalize_coordinates(
                            coords=raw_coords,
                            img_width=img_width,
                            img_height=img_height,
                        )
                        tok_id = f"tok_{artifact_id}_{idx + 1}"
                        tokens.append(
                            OCRToken(
                                token_id=tok_id,
                                artifact_id=artifact_id,
                                run_id=run_id,
                                text=str(text).strip(),
                                confidence=round(float(score), 4),
                                polygon=norm_poly,
                                line_index=idx,
                                token_index=0,
                            )
                        )
            except Exception as exc:
                logger.error(f"PaddleOCR inference exception: {exc}")
        elif self._rapid_ocr is not None:
            try:
                import numpy as np
                img_np = np.array(rgb_img)
                res, _ = self._rapid_ocr(img_np)
                engine_name = "RapidOCR"
                engine_version = "1.4.4"
                if res:
                    for idx, (poly, text, score) in enumerate(res):
                        raw_coords = poly.tolist() if hasattr(poly, "tolist") else list(poly)
                        norm_poly = validate_and_normalize_coordinates(
                            coords=raw_coords,
                            img_width=img_width,
                            img_height=img_height,
                        )
                        tok_id = f"tok_{artifact_id}_{idx + 1}"
                        tokens.append(
                            OCRToken(
                                token_id=tok_id,
                                artifact_id=artifact_id,
                                run_id=run_id,
                                text=str(text).strip(),
                                confidence=round(float(score), 4),
                                polygon=norm_poly,
                                line_index=idx,
                                token_index=0,
                            )
                        )
            except Exception as exc:
                logger.error(f"RapidOCR inference exception: {exc}")
        else:
            # No engine installed: return no tokens. Never invent text.
            engine_name = "NONE"
            engine_version = "OCR engine not available"

        # 2. Extract Candidate Financial Fields
        candidates = extract_candidate_financial_fields(
            tokens=tokens,
            artifact_id=artifact_id,
            run_id=run_id,
        )

        full_text = " \n ".join(t.text for t in tokens)

        return OCRExtractionResult(
            run_id=run_id,
            artifact_id=artifact_id,
            case_id=case_id,
            image_width=img_width,
            image_height=img_height,
            engine_name=engine_name,
            engine_version=engine_version,
            extracted_at_iso=timestamp_iso,
            tokens=tokens,
            candidates=candidates,
            full_text=full_text,
            raw_metadata={"token_count": len(tokens), "format": img_format},
        )

    def extract_from_file(
        self,
        file_path: Union[str, Path],
        artifact_id: str,
        case_id: str = "upi_payment_discrepancy",
    ) -> OCRExtractionResult:
        """Extracts OCR text and bounding polygons from an image file path."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Image evidence file not found at {file_path}")
        with open(path, "rb") as fp:
            data = fp.read()
        return self.extract_from_bytes(data, artifact_id=artifact_id, case_id=case_id)
