from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Dict, List

from app.adapters.base_adapter import BaseSourceAdapter, CanonicalRecord
from app.domain.case import Case
from app.domain.communication import ANPRObservation, CallRecord
from app.domain.financial import BankAccount, Transaction, UPIAccount
from app.domain.person import Person
from app.domain.phone import Phone
from app.domain.vehicle import Vehicle
from app.repositories.unified_store import UnifiedStore
from app.services.entity_resolution_engine import EntityResolutionEngine, EntityResolutionMatch

logger = logging.getLogger("sentinelx.ingestion")


@dataclass(slots=True)
class IngestionQualityReport:
    batch_id: str
    total_records: int = 0
    valid_records: int = 0
    er_candidates_found: int = 0
    duplicate_records: int = 0
    orphan_records: int = 0
    completeness_score: float = 1.0
    provenance_coverage: float = 1.0
    er_candidates: List[EntityResolutionMatch] = field(default_factory=list)
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))


class IngestionPipeline:
    def __init__(self, store: UnifiedStore = None, er_engine: EntityResolutionEngine = None):
        self.store = store or UnifiedStore.get_instance()
        self.er_engine = er_engine or EntityResolutionEngine(self.store)

    def ingest_records(self, adapter: BaseSourceAdapter, limit: int = 100) -> IngestionQualityReport:
        records = adapter.fetch_records(limit=limit)
        report = IngestionQualityReport(batch_id=f"batch-{adapter.source_system.value}-{limit}")
        report.total_records = len(records)

        for record in records:
            try:
                self.process_record(record, report)
                report.valid_records += 1
            except Exception as exc:
                logger.error(f"Failed to ingest record {record.record_id}: {exc}")

        return report

    def process_record(self, record: CanonicalRecord, report: IngestionQualityReport):
        p = record.payload
        src = record.source_system.value

        if record.entity_type == "CASE":
            case = Case(
                case_number=p.get("fir_number", ""),
                fir_number=p.get("fir_number", ""),
                title=p.get("crime_type", "Criminal Investigation"),
                description=p.get("description", ""),
                police_station=p.get("police_station", ""),
                source=src,
                source_record_id=record.source_record_id,
                evidence_reference=record.evidence_reference,
            )
            self.store.save_case(case)

        elif record.entity_type == "VEHICLE":
            v = Vehicle(
                registration_number=p.get("reg_no", ""),
                vin=p.get("chassis", ""),
                manufacturer=p.get("maker_model", "").split()[0],
                model=p.get("maker_model", ""),
                color=p.get("color", "Black"),
                source=src,
                source_record_id=record.source_record_id,
                evidence_reference=record.evidence_reference,
            )
            self.store.save_vehicle(v)

        elif record.entity_type == "CALL_RECORD":
            cdr = CallRecord(
                caller_number=p.get("caller", ""),
                receiver_number=p.get("receiver", ""),
                duration_seconds=p.get("duration", 0),
                cell_tower_id=p.get("cell_tower", ""),
                source=src,
                source_record_id=record.source_record_id,
                evidence_reference=record.evidence_reference,
            )
            self.store.save_call_record(cdr)

        elif record.entity_type == "ANPR_OBSERVATION":
            anpr = ANPRObservation(
                plate_number=p.get("plate", ""),
                camera_id=p.get("camera_id", ""),
                camera_location=p.get("location", ""),
                lat=p.get("lat", 0.0),
                lng=p.get("lng", 0.0),
                source=src,
                source_record_id=record.source_record_id,
                evidence_reference=record.evidence_reference,
            )
            self.store.anpr_observations.append(anpr)

        elif record.entity_type == "TRANSACTION":
            txn = Transaction(
                txn_id=p.get("txn_id", ""),
                source_account=p.get("from_account", ""),
                target_account=p.get("to_account", ""),
                amount=p.get("amount", 0.0),
                reference_number=p.get("ref_no", ""),
                source=src,
                source_record_id=record.source_record_id,
                evidence_reference=record.evidence_reference,
            )
            self.store.save_transaction(txn)
