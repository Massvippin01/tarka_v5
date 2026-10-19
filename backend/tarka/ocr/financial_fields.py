"""TARKA Phase 4B: Candidate Financial Field Extraction.

Extracts explainable financial field candidates from recognized OCR tokens:
- Transaction amount (e.g. Rs 15,000 -> 15000.0)
- RRN / 12-digit reference number (e.g. 202602148891)
- Payee VPA (e.g. merchant.pay@okaxis)
- Transaction date and time (e.g. 14/02/2026, 10:20:00)
- Transaction status text (e.g. Payment Successful, SUCCESS)

Retains:
- All contributing token IDs
- Aggregate confidence score
- Enclosing bounding polygon
- Raw text vs normalized value
- Ambiguity and audit warnings
"""

from __future__ import annotations

import re
from typing import List, Optional
from tarka.ocr.schemas import (
    CandidateFieldType,
    CandidateReviewStatus,
    FinancialFieldCandidate,
    OCRToken,
)
from tarka.ocr.normalization import (
    compute_enclosing_polygon,
    normalize_whitespace,
    parse_monetary_amount,
    parse_rrn,
    parse_vpa,
)


def extract_candidate_financial_fields(
    tokens: List[OCRToken],
    artifact_id: str,
    run_id: str,
) -> List[FinancialFieldCandidate]:
    """Inspects tokens and extracts candidate financial fields with explicit token references."""
    candidates: List[FinancialFieldCandidate] = []
    seen_types = set()

    # 1. Amount Extraction
    for tok in tokens:
        raw = tok.text
        # Look for explicit amount indications: currency symbol or 'Rs' or standalone numbers formatted as currency
        if any(c in raw for c in ("₹", "Rs", "INR")) or re.search(r"\b\d{1,3}(?:,\d{3})+\b", raw):
            amount_val = parse_monetary_amount(raw)
            if amount_val is not None:
                cand_id = f"cand_amt_{artifact_id}_{len(candidates)+1}"
                candidates.append(
                    FinancialFieldCandidate(
                        candidate_id=cand_id,
                        artifact_id=artifact_id,
                        run_id=run_id,
                        field_type=CandidateFieldType.AMOUNT,
                        raw_text=raw,
                        normalized_value=amount_val,
                        confidence=tok.confidence,
                        token_ids=[tok.token_id],
                        polygon=tok.polygon,
                        review_status=CandidateReviewStatus.PENDING,
                    )
                )
                seen_types.add(CandidateFieldType.AMOUNT)
                break

    # 2. RRN Extraction (12-digit reference number)
    # Check both tokens containing labels like 'RRN' or 'Ref' and tokens containing 12 digits
    rrn_found = False
    for i, tok in enumerate(tokens):
        raw = tok.text
        val = parse_rrn(raw)
        if val:
            # Token itself has the 12-digit RRN
            contrib_tokens = [tok]
            # If preceding token had label "Ref No" or "RRN", include it
            if i > 0 and any(kw in tokens[i - 1].text.upper() for kw in ("RRN", "REF", "UPI REF")):
                contrib_tokens.insert(0, tokens[i - 1])

            cand_id = f"cand_rrn_{artifact_id}_{len(candidates)+1}"
            raw_text = " ".join(t.text for t in contrib_tokens)
            agg_conf = sum(t.confidence for t in contrib_tokens) / len(contrib_tokens)
            enclosing_poly = compute_enclosing_polygon([t.polygon for t in contrib_tokens])

            candidates.append(
                FinancialFieldCandidate(
                    candidate_id=cand_id,
                    artifact_id=artifact_id,
                    run_id=run_id,
                    field_type=CandidateFieldType.RRN,
                    raw_text=raw_text,
                    normalized_value=val,
                    confidence=round(agg_conf, 4),
                    token_ids=[t.token_id for t in contrib_tokens],
                    polygon=enclosing_poly,
                    review_status=CandidateReviewStatus.PENDING,
                )
            )
            rrn_found = True
            break

    # If no 12-digit RRN found directly, check for OCR character confusion (e.g. 'I' instead of '1')
    if not rrn_found:
        for tok in tokens:
            # Check for 12-char alphanumeric with 'I', 'O', 'l'
            potential = re.search(r"\b([0-9IOl]{12})\b", tok.text)
            if potential:
                cand_id = f"cand_rrn_flagged_{artifact_id}_{len(candidates)+1}"
                candidates.append(
                    FinancialFieldCandidate(
                        candidate_id=cand_id,
                        artifact_id=artifact_id,
                        run_id=run_id,
                        field_type=CandidateFieldType.RRN,
                        raw_text=tok.text,
                        normalized_value=potential.group(1),
                        confidence=tok.confidence * 0.7,  # lower confidence due to OCR confusion
                        token_ids=[tok.token_id],
                        polygon=tok.polygon,
                        review_status=CandidateReviewStatus.PENDING,
                        review_notes="Flagged for investigator review: possible OCR character substitution in identifier.",
                    )
                )
                break

    # 3. Payee VPA Extraction
    for tok in tokens:
        vpa_val = parse_vpa(tok.text)
        if vpa_val:
            cand_id = f"cand_vpa_{artifact_id}_{len(candidates)+1}"
            candidates.append(
                FinancialFieldCandidate(
                    candidate_id=cand_id,
                    artifact_id=artifact_id,
                    run_id=run_id,
                    field_type=CandidateFieldType.PAYEE_VPA,
                    raw_text=tok.text,
                    normalized_value=vpa_val,
                    confidence=tok.confidence,
                    token_ids=[tok.token_id],
                    polygon=tok.polygon,
                    review_status=CandidateReviewStatus.PENDING,
                )
            )
            break

    # 4. Date and Time Extraction
    date_regex = re.compile(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b")
    time_regex = re.compile(r"\b(\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM))?)\b", re.IGNORECASE)

    for tok in tokens:
        raw = tok.text
        m_date = date_regex.search(raw)
        m_time = time_regex.search(raw)
        if m_date:
            cand_id = f"cand_date_{artifact_id}_{len(candidates)+1}"
            candidates.append(
                FinancialFieldCandidate(
                    candidate_id=cand_id,
                    artifact_id=artifact_id,
                    run_id=run_id,
                    field_type=CandidateFieldType.TRANSACTION_DATE,
                    raw_text=m_date.group(1),
                    normalized_value=m_date.group(1),
                    confidence=tok.confidence,
                    token_ids=[tok.token_id],
                    polygon=tok.polygon,
                    review_status=CandidateReviewStatus.PENDING,
                )
            )
        if m_time:
            cand_id = f"cand_time_{artifact_id}_{len(candidates)+1}"
            candidates.append(
                FinancialFieldCandidate(
                    candidate_id=cand_id,
                    artifact_id=artifact_id,
                    run_id=run_id,
                    field_type=CandidateFieldType.TRANSACTION_TIME,
                    raw_text=m_time.group(1),
                    normalized_value=m_time.group(1),
                    confidence=tok.confidence,
                    token_ids=[tok.token_id],
                    polygon=tok.polygon,
                    review_status=CandidateReviewStatus.PENDING,
                )
            )
        if m_date and m_time:
            break

    # 5. Status Text Extraction
    status_keywords = ["PAYMENT SUCCESSFUL", "SUCCESS", "COMPLETED", "FAILED", "PENDING"]
    for tok in tokens:
        raw_upper = tok.text.upper()
        matched_kw = next((kw for kw in status_keywords if kw in raw_upper), None)
        if matched_kw:
            cand_id = f"cand_status_{artifact_id}_{len(candidates)+1}"
            candidates.append(
                FinancialFieldCandidate(
                    candidate_id=cand_id,
                    artifact_id=artifact_id,
                    run_id=run_id,
                    field_type=CandidateFieldType.STATUS,
                    raw_text=tok.text,
                    normalized_value=matched_kw,
                    confidence=tok.confidence,
                    token_ids=[tok.token_id],
                    polygon=tok.polygon,
                    review_status=CandidateReviewStatus.PENDING,
                )
            )
            break

    return candidates
