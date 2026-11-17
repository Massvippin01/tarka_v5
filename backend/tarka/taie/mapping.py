"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
TAIE INTEGRATION FOUNDATION: CANONICAL SCHEMA MAPPING ENGINE

Normalizes heterogeneous source payloads (REST, Batch CSV/JSON, Legacy CBS)
into Canonical v1 contracts (CanonicalTransaction, CanonicalEntity).
Preserves unrecognised fields, exact raw timestamps, and flags ambiguities.
"""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field

from tarka.contracts.canonical_v1 import (
    CanonicalEntity,
    CanonicalTransaction,
    EntityType,
    ReconciliationStatus,
    ReviewState,
    TimeInterval,
    TransactionType,
    TransactionValidationState,
)


class MappingResult(BaseModel):
    """Encapsulates output of schema mapping operation."""
    canonical_transactions: List[CanonicalTransaction] = Field(default_factory=list)
    canonical_entities: List[CanonicalEntity] = Field(default_factory=list)
    quarantined_records: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    raw_payload_hash: str
    total_processed: int
    success_count: int
    quarantine_count: int
    mapping_profile: str


class CanonicalSchemaMappingEngine:
    """
    Engine for transforming diverse institutional data structures into Canonical v1 contracts.
    """

    SUPPORTED_DATE_FORMATS = [
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S",
        "%d-%m-%Y %H:%M:%S",
        "%d/%m/%Y %H:%M:%S",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%Y-%m-%d",
    ]

    @staticmethod
    def normalize_timestamp(raw_ts_str: Any) -> Tuple[str, float]:
        """
        Parses a diverse timestamp string into ISO 8601 UTC.
        Returns (iso_utc_string, uncertainty_seconds).
        """
        if not raw_ts_str:
            now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            return now_utc, 3600.0  # High uncertainty if missing

        raw_str = str(raw_ts_str).strip()

        # Check numeric epoch (seconds or ms)
        if raw_str.isdigit():
            val = int(raw_str)
            if val > 1e11:  # ms
                dt = datetime.fromtimestamp(val / 1000.0, tz=timezone.utc)
            else:
                dt = datetime.fromtimestamp(val, tz=timezone.utc)
            return dt.strftime("%Y-%m-%dT%H:%M:%SZ"), 1.0

        for fmt in CanonicalSchemaMappingEngine.SUPPORTED_DATE_FORMATS:
            try:
                dt = datetime.strptime(raw_str, fmt)
                if dt.tzinfo is None:
                    # Treat naive as UTC or Indian IST depending on context; default to UTC
                    dt = dt.replace(tzinfo=timezone.utc)
                else:
                    dt = dt.astimezone(timezone.utc)
                uncertainty = 1.0 if ("%H" in fmt) else 86400.0  # Day-only has 24h uncertainty
                return dt.strftime("%Y-%m-%dT%H:%M:%SZ"), uncertainty
            except ValueError:
                continue

        # Fallback to regex ISO-like match
        try:
            dt = datetime.fromisoformat(raw_str.replace("Z", "+00:00"))
            return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), 1.0
        except Exception:
            # Return current time with high uncertainty flag
            now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            return now_utc, 86400.0

    @classmethod
    def map_transaction_payload(
        cls,
        raw_items: List[Dict[str, Any]],
        case_id: str,
        source_evidence_id: str,
        mapping_profile: str = "AUTO"
    ) -> MappingResult:
        """
        Transform a list of raw transaction items into CanonicalTransaction records.
        Preserves unrecognized fields in .metadata and quarantines invalid records.
        """
        raw_hash = hashlib.sha256(json.dumps(raw_items, sort_keys=True, default=str).encode("utf-8")).hexdigest()

        canonical_txns: List[CanonicalTransaction] = []
        quarantined: List[Dict[str, Any]] = []
        warnings: List[str] = []

        known_canonical_keys = {
            "transaction_id", "case_id", "source_evidence_id", "origin_entity_id",
            "destination_entity_id", "origin_account_identifier", "destination_account_identifier",
            "amount", "currency", "original_timestamp_raw", "normalised_timestamp_utc",
            "timestamp_uncertainty_sec", "transaction_type", "is_reversal",
            "reversal_of_transaction_id", "validation_state", "reconciliation_status",
            "analytical_annotations", "schema_version", "metadata"
        }

        for idx, item in enumerate(raw_items):
            try:
                # 1. Extract Transaction ID
                txn_id = (
                    item.get("transaction_id") or
                    item.get("transactionId") or
                    item.get("TXN_REF_NO") or
                    item.get("txn_ref") or
                    item.get("reference_number") or
                    item.get("UTR") or
                    f"TXN_GEN_{case_id}_{idx}_{hashlib.md5(str(item).encode()).hexdigest()[:8]}"
                )

                # 2. Extract Accounts
                src_acc = (
                    item.get("origin_account_identifier") or
                    item.get("sourceAccount") or
                    item.get("SRC_ACC_NO") or
                    item.get("remitter_account") or
                    item.get("sender_vpa") or
                    item.get("debit_account")
                )

                dest_acc = (
                    item.get("destination_account_identifier") or
                    item.get("targetAccount") or
                    item.get("DEST_ACC_NO") or
                    item.get("beneficiary_account") or
                    item.get("payee_vpa") or
                    item.get("credit_account")
                )

                if not src_acc or not dest_acc:
                    quarantined.append({
                        "raw_item": item,
                        "reason": f"Missing origin or destination account identifier (src={src_acc}, dest={dest_acc})",
                        "index": idx
                    })
                    warnings.append(f"Record {idx} quarantined: missing account identifiers.")
                    continue

                # 3. Extract Amount
                raw_amt = (
                    item.get("amount") or
                    item.get("TXN_AMT") or
                    item.get("transaction_amount") or
                    item.get("txn_amount")
                )
                if raw_amt is None:
                    quarantined.append({
                        "raw_item": item,
                        "reason": "Missing transaction amount",
                        "index": idx
                    })
                    warnings.append(f"Record {idx} quarantined: missing amount.")
                    continue

                try:
                    cleaned_amt = float(str(raw_amt).replace(",", "").replace("₹", "").strip())
                    if cleaned_amt < 0:
                        raise ValueError("Negative amount")
                except ValueError as ve:
                    quarantined.append({
                        "raw_item": item,
                        "reason": f"Invalid amount representation '{raw_amt}': {ve}",
                        "index": idx
                    })
                    warnings.append(f"Record {idx} quarantined: invalid amount '{raw_amt}'.")
                    continue

                # 4. Extract Timestamp
                raw_ts = (
                    item.get("original_timestamp_raw") or
                    item.get("timestampUtc") or
                    item.get("timestamp") or
                    item.get("VAL_DT") or
                    item.get("TXN_DATE") or
                    item.get("transaction_time") or
                    item.get("time") or
                    datetime.now(timezone.utc).isoformat()
                )
                norm_ts, uncertainty = cls.normalize_timestamp(raw_ts)

                # 5. Extract Currency & Type
                currency = item.get("currency", "INR")
                raw_type = str(
                    item.get("transaction_type") or
                    item.get("type") or
                    item.get("TXN_TYPE") or
                    "UPI_P2P"
                ).upper()

                # Map type to Enum
                txn_type_val = TransactionType.UPI_P2P
                for candidate in TransactionType:
                    if candidate.value == raw_type or candidate.name == raw_type:
                        txn_type_val = candidate
                        break

                # 6. Check for reversal flags
                is_rev = bool(
                    item.get("is_reversal") or
                    item.get("DR_CR_IND") == "CR_REV" or
                    "REVERSAL" in str(item.get("description", "")).upper()
                )
                rev_id = item.get("reversal_of_transaction_id") or item.get("ORIG_TXN_REF")

                # 7. Collect Unrecognized Fields to preserve in metadata
                extra_fields = {}
                for k, v in item.items():
                    if k not in known_canonical_keys:
                        extra_fields[k] = v

                # Construct CanonicalTransaction
                canonical_txn = CanonicalTransaction(
                    transaction_id=str(txn_id),
                    case_id=case_id,
                    source_evidence_id=source_evidence_id,
                    origin_entity_id=item.get("origin_entity_id"),
                    destination_entity_id=item.get("destination_entity_id"),
                    origin_account_identifier=str(src_acc),
                    destination_account_identifier=str(dest_acc),
                    amount=cleaned_amt,
                    currency=currency,
                    original_timestamp_raw=str(raw_ts),
                    normalised_timestamp_utc=norm_ts,
                    timestamp_uncertainty_sec=uncertainty,
                    transaction_type=txn_type_val,
                    is_reversal=is_rev,
                    reversal_of_transaction_id=rev_id,
                    validation_state=TransactionValidationState.VALID,
                    reconciliation_status=ReconciliationStatus.UNRECONCILED,
                    analytical_annotations=item.get("analytical_annotations", {}),
                    schema_version="v1.0.0",
                    metadata=extra_fields
                )
                canonical_txns.append(canonical_txn)

            except Exception as e:
                quarantined.append({
                    "raw_item": item,
                    "reason": f"Unexpected mapping failure: {str(e)}",
                    "index": idx
                })
                warnings.append(f"Record {idx} failed mapping: {str(e)}")

        return MappingResult(
            canonical_transactions=canonical_txns,
            canonical_entities=[],
            quarantined_records=quarantined,
            warnings=warnings,
            raw_payload_hash=raw_hash,
            total_processed=len(raw_items),
            success_count=len(canonical_txns),
            quarantine_count=len(quarantined),
            mapping_profile=mapping_profile
        )

