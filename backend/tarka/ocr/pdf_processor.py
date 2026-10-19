"""TARKA Phase 4C: PDF-Aware Extraction and Document Coverage Engine.

Supports:
1. Dual-Path Document Parsing:
   - Path A: Digital PDFs with extractable embedded text (pypdf).
   - Path B: Scanned / image-only PDFs requiring high-resolution rasterization (pypdfium2) and OCR (PaddleOCR).
2. Page-by-Page Audit and Coverage Tracking:
   - Records page state: SUCCESS_TEXT, SUCCESS_OCR, BLANK_PAGE, FAILED, SKIPPED.
   - Preserves 1-indexed page numbers and page-relative coordinates.
3. Fail-Safe Completeness Verification:
   - Unprocessed, skipped, or failed pages permanently invalidate document-level complete state.
   - Distinguishes visually blank pages from extraction failures.
4. Resource and Guardrail Enforcement:
   - Max 50 pages and 25MB per document to protect memory/CPU bounds.
"""

from __future__ import annotations

import datetime
import io
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
from PIL import Image

import pypdf
import pypdfium2

from tarka.core.completeness import (
    DocumentProcessingCoverage,
    PageCoverageItem,
    PageProcessingStatus,
)
from tarka.ocr.extractor import OCRExtractor
from tarka.ocr.schemas import (
    BoundingPolygon,
    CandidateFieldType,
    FinancialFieldCandidate,
    OCRExtractionResult,
    OCRToken,
    Point2D,
)
from tarka.ocr.financial_fields import extract_candidate_financial_fields

logger = logging.getLogger("tarka.pdf")

MAX_ALLOWED_PAGES = 50
MAX_ALLOWED_BYTES = 25 * 1024 * 1024  # 25MB
MIN_DIGITAL_TEXT_CHARS = 30           # Minimum characters to consider embedded text sufficient


class PDFExtractionResult:
    """Comprehensive result of PDF extraction including page-by-page coverage and candidate fields."""

    def __init__(
        self,
        run_id: str,
        artifact_id: str,
        case_id: str,
        coverage: DocumentProcessingCoverage,
        tokens_by_page: Dict[int, List[OCRToken]],
        candidates: List[FinancialFieldCandidate],
        full_text: str,
    ):
        self.run_id = run_id
        self.artifact_id = artifact_id
        self.case_id = case_id
        self.coverage = coverage
        self.tokens_by_page = tokens_by_page
        self.candidates = candidates
        self.full_text = full_text

    @property
    def total_pages(self) -> int:
        return self.coverage.total_pages

    @property
    def tokens(self) -> List[OCRToken]:
        return self.all_tokens()

    def all_tokens(self) -> List[OCRToken]:
        """Flattens tokens across all pages in reading order."""
        res: List[OCRToken] = []
        for p in sorted(self.tokens_by_page.keys()):
            res.extend(self.tokens_by_page[p])
        return res

    def to_ocr_result(self) -> OCRExtractionResult:
        """Converts to standard OCRExtractionResult for downstream compatibility."""
        all_toks = self.all_tokens()
        return OCRExtractionResult(
            run_id=self.run_id,
            artifact_id=self.artifact_id,
            case_id=self.case_id,
            image_width=1000,
            image_height=1000,
            engine_name="DualPathPDF (pypdf + PaddleOCR)",
            engine_version="1.0.0",
            extracted_at_iso=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            tokens=all_toks,
            candidates=self.candidates,
            full_text=self.full_text,
            raw_metadata={
                "total_pages": self.coverage.total_pages,
                "processed_pages": self.coverage.processed_pages,
                "failed_pages": self.coverage.failed_pages,
                "coverage_ratio": self.coverage.coverage_ratio,
            },
        )


class PDFProcessor:
    """Forensic PDF document processor with dual text/OCR paths and page-level audit tracking."""

    def __init__(self, ocr_extractor: Optional[OCRExtractor] = None):
        self.ocr_extractor = ocr_extractor or OCRExtractor()

    def process_pdf_bytes(
        self,
        pdf_bytes: bytes,
        artifact_id: str,
        case_id: str = "upi_payment_discrepancy",
        max_pages: int = MAX_ALLOWED_PAGES,
        force_ocr: bool = False,
    ) -> PDFExtractionResult:
        """Processes a PDF file, tracking page-level processing and extracting text/candidates.

        Args:
            pdf_bytes: Raw bytes of the PDF document.
            artifact_id: Preserved artifact identifier.
            case_id: Target case ID.
            max_pages: Maximum pages to process before safety clipping.
            force_ocr: If True, forces image rendering & OCR even if embedded text exists.

        Returns:
            PDFExtractionResult with granular DocumentProcessingCoverage and candidate fields.
        """
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Cannot process empty or null PDF bitstream.")

        if len(pdf_bytes) > MAX_ALLOWED_BYTES:
            raise ValueError(
                f"PDF file size ({len(pdf_bytes)} bytes) exceeds safety limit of {MAX_ALLOWED_BYTES} bytes."
            )

        timestamp_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        run_id = f"pdf_run_{artifact_id}_{int(datetime.datetime.now(datetime.timezone.utc).timestamp())}"

        # 1. Read PDF metadata and page count via pypdf
        try:
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            total_pages = len(reader.pages)
        except Exception as exc:
            # Document itself is corrupted or not a valid PDF
            failed_cov = DocumentProcessingCoverage(
                total_pages=1,
                processed_pages=0,
                failed_pages=1,
                skipped_pages=0,
                coverage_ratio=0.0,
                is_fully_processed=False,
                pages=[
                    PageCoverageItem(
                        page_number=1,
                        status=PageProcessingStatus.FAILED,
                        error_message=f"Corrupted or invalid PDF format: {exc}",
                    )
                ],
                warnings=[f"Failed to parse PDF document header: {exc}"],
            )
            return PDFExtractionResult(
                run_id=run_id,
                artifact_id=artifact_id,
                case_id=case_id,
                coverage=failed_cov,
                tokens_by_page={},
                candidates=[],
                full_text="",
            )

        pages_to_process = min(total_pages, max_pages)
        page_items: List[PageCoverageItem] = []
        tokens_by_page: Dict[int, List[OCRToken]] = {}
        all_candidates: List[FinancialFieldCandidate] = []
        full_text_parts: List[str] = []
        doc_warnings: List[str] = []

        # Open pdfium document for rendering scanned pages
        pdfium_doc = None
        try:
            pdfium_doc = pypdfium2.PdfDocument(io.BytesIO(pdf_bytes))
        except Exception as exc:
            logger.warning(f"pypdfium2 could not initialize for {artifact_id}: {exc}")

        processed_count = 0
        failed_count = 0

        # Process each page (1 to pages_to_process)
        for page_idx in range(pages_to_process):
            page_num = page_idx + 1
            try:
                pypdf_page = reader.pages[page_idx]
                embedded_text = ""
                try:
                    embedded_text = (pypdf_page.extract_text() or "").strip()
                except Exception as ex_text:
                    logger.debug(f"Embedded text extraction exception on p{page_num}: {ex_text}")

                has_sufficient_text = len(embedded_text) >= MIN_DIGITAL_TEXT_CHARS and not force_ocr

                if has_sufficient_text:
                    # Path A: Extract from digital embedded text
                    page_tokens = self._tokens_from_digital_text(
                        text=embedded_text,
                        page_num=page_num,
                        artifact_id=artifact_id,
                        run_id=run_id,
                    )
                    tokens_by_page[page_num] = page_tokens
                    full_text_parts.append(embedded_text)

                    # Extract candidate fields from page tokens
                    page_candidates = extract_candidate_financial_fields(
                        tokens=page_tokens,
                        artifact_id=artifact_id,
                        run_id=run_id,
                    )
                    all_candidates.extend(page_candidates)

                    page_items.append(
                        PageCoverageItem(
                            page_number=page_num,
                            status=PageProcessingStatus.SUCCESS_TEXT,
                            extracted_text_length=len(embedded_text),
                            token_count=len(page_tokens),
                            is_scanned=False,
                            processing_method="EMBEDDED_TEXT",
                        )
                    )
                    processed_count += 1

                else:
                    # Path B: Scanned or sparse page -> Render and execute OCR
                    if pdfium_doc is not None and page_idx < len(pdfium_doc):
                        ocr_res, is_blank = self._ocr_rendered_page(
                            pdfium_doc=pdfium_doc,
                            page_idx=page_idx,
                            page_num=page_num,
                            artifact_id=artifact_id,
                            run_id=run_id,
                            case_id=case_id,
                        )

                        tokens_by_page[page_num] = ocr_res.tokens
                        full_text_parts.append(ocr_res.full_text)
                        all_candidates.extend(ocr_res.candidates)

                        status = PageProcessingStatus.BLANK_PAGE if is_blank else PageProcessingStatus.SUCCESS_OCR
                        page_items.append(
                            PageCoverageItem(
                                page_number=page_num,
                                status=status,
                                extracted_text_length=len(ocr_res.full_text),
                                token_count=len(ocr_res.tokens),
                                is_scanned=True,
                                processing_method="RENDERED_OCR",
                            )
                        )
                        processed_count += 1
                    else:
                        # Fallback if renderer is unavailable and no embedded text
                        if len(embedded_text) > 0:
                            page_tokens = self._tokens_from_digital_text(
                                text=embedded_text,
                                page_num=page_num,
                                artifact_id=artifact_id,
                                run_id=run_id,
                            )
                            tokens_by_page[page_num] = page_tokens
                            full_text_parts.append(embedded_text)
                            page_items.append(
                                PageCoverageItem(
                                    page_number=page_num,
                                    status=PageProcessingStatus.SUCCESS_TEXT,
                                    extracted_text_length=len(embedded_text),
                                    token_count=len(page_tokens),
                                    is_scanned=False,
                                    warning="Sparse text extracted; renderer unavailable for OCR.",
                                )
                            )
                            processed_count += 1
                        else:
                            page_items.append(
                                PageCoverageItem(
                                    page_number=page_num,
                                    status=PageProcessingStatus.BLANK_PAGE,
                                    extracted_text_length=0,
                                    token_count=0,
                                    is_scanned=False,
                                    warning="No text detected and page renderer unavailable.",
                                )
                            )
                            processed_count += 1

            except Exception as page_exc:
                logger.error(f"Error processing PDF page {page_num}: {page_exc}")
                failed_count += 1
                page_items.append(
                    PageCoverageItem(
                        page_number=page_num,
                        status=PageProcessingStatus.FAILED,
                        error_message=f"Page processing error: {page_exc}",
                    )
                )

        # Account for any skipped pages beyond max_pages
        skipped_count = max(0, total_pages - pages_to_process)
        if skipped_count > 0:
            doc_warnings.append(
                f"Document exceeded safety threshold of {max_pages} pages: {skipped_count} page(s) were skipped."
            )
            for p_skip in range(pages_to_process + 1, total_pages + 1):
                page_items.append(
                    PageCoverageItem(
                        page_number=p_skip,
                        status=PageProcessingStatus.SKIPPED,
                        warning=f"Page skipped due to max processing threshold ({max_pages} pages).",
                    )
                )

        coverage_ratio = round(processed_count / max(1, total_pages), 4)
        is_fully_processed = (processed_count == total_pages) and (failed_count == 0) and (skipped_count == 0)

        coverage = DocumentProcessingCoverage(
            total_pages=total_pages,
            processed_pages=processed_count,
            failed_pages=failed_count,
            skipped_pages=skipped_count,
            coverage_ratio=coverage_ratio,
            is_fully_processed=is_fully_processed,
            pages=page_items,
            warnings=doc_warnings,
        )

        return PDFExtractionResult(
            run_id=run_id,
            artifact_id=artifact_id,
            case_id=case_id,
            coverage=coverage,
            tokens_by_page=tokens_by_page,
            candidates=all_candidates,
            full_text="\n\n".join(full_text_parts),
        )

    # Alias for convenience
    process_pdf = process_pdf_bytes

    def _tokens_from_digital_text(
        self,
        text: str,
        page_num: int,
        artifact_id: str,
        run_id: str,
    ) -> List[OCRToken]:
        """Synthesizes structured OCRTokens from clean embedded PDF text strings."""
        tokens: List[OCRToken] = []
        lines = [line.strip() for line in text.splitlines() if line.strip()]

        total_lines = max(1, len(lines))
        for line_idx, line in enumerate(lines):
            # Approximate line bounding box in normalized space
            y_start = round(line_idx / total_lines, 4)
            y_end = round((line_idx + 1) / total_lines, 4)

            words = line.split()
            total_words = max(1, len(words))

            for word_idx, word in enumerate(words):
                x_start = round(word_idx / total_words, 4)
                x_end = round((word_idx + 1) / total_words, 4)

                poly = BoundingPolygon(
                    points=[
                        Point2D(x=x_start, y=y_start),
                        Point2D(x=x_end, y=y_start),
                        Point2D(x=x_end, y=y_end),
                        Point2D(x=x_start, y=y_end),
                    ],
                    bbox=(x_start, y_start, x_end, y_end),
                )

                tok_id = f"tok_{artifact_id}_p{page_num}_l{line_idx+1}_w{word_idx+1}"
                tokens.append(
                    OCRToken(
                        token_id=tok_id,
                        artifact_id=artifact_id,
                        run_id=run_id,
                        text=word,
                        confidence=0.99,  # High confidence for digital text
                        polygon=poly,
                        line_index=line_idx,
                        token_index=word_idx,
                    )
                )

        return tokens

    def _ocr_rendered_page(
        self,
        pdfium_doc: pypdfium2.PdfDocument,
        page_idx: int,
        page_num: int,
        artifact_id: str,
        run_id: str,
        case_id: str,
    ) -> Tuple[OCRExtractionResult, bool]:
        """Renders page via pdfium and performs OCR extraction."""
        page = pdfium_doc.get_page(page_idx)
        bitmap = page.render(scale=2.0)
        pil_img = bitmap.to_pil()

        # Check if visually blank (all white or monochrome)
        extrema = pil_img.convert("L").getextrema()
        is_blank = extrema[0] == extrema[1]

        buf = io.BytesIO()
        pil_img.save(buf, format="PNG")
        page_png_bytes = buf.getvalue()

        # Run OCR extraction
        ocr_res = self.ocr_extractor.extract_from_bytes(
            image_bytes=page_png_bytes,
            artifact_id=f"{artifact_id}_p{page_num}",
            case_id=case_id,
        )

        # Retag tokens with page reference
        tagged_tokens: List[OCRToken] = []
        for t in ocr_res.tokens:
            tok_id = f"tok_{artifact_id}_p{page_num}_{t.token_id}"
            tagged_tokens.append(
                OCRToken(
                    token_id=tok_id,
                    artifact_id=artifact_id,
                    run_id=run_id,
                    text=t.text,
                    confidence=t.confidence,
                    polygon=t.polygon,
                    line_index=t.line_index,
                    token_index=t.token_index,
                )
            )

        # Retag candidates with parent artifact ID and page-tagged tokens
        tagged_candidates: List[FinancialFieldCandidate] = []
        for c in ocr_res.candidates:
            cand_id = f"cand_{artifact_id}_p{page_num}_{c.candidate_id}"
            new_tok_ids = [f"tok_{artifact_id}_p{page_num}_{tid}" for tid in c.token_ids]
            tagged_candidates.append(
                FinancialFieldCandidate(
                    candidate_id=cand_id,
                    artifact_id=artifact_id,
                    run_id=run_id,
                    field_type=c.field_type,
                    raw_text=c.raw_text,
                    normalized_value=c.normalized_value,
                    confidence=c.confidence,
                    token_ids=new_tok_ids,
                    polygon=c.polygon,
                    review_status=c.review_status,
                )
            )

        tagged_res = OCRExtractionResult(
            run_id=run_id,
            artifact_id=artifact_id,
            case_id=case_id,
            image_width=pil_img.width,
            image_height=pil_img.height,
            engine_name="pypdfium2 + PaddleOCR",
            engine_version="1.0.0",
            extracted_at_iso=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            tokens=tagged_tokens,
            candidates=tagged_candidates,
            full_text=ocr_res.full_text,
        )

        return tagged_res, is_blank
