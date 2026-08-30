from __future__ import annotations

import random
from typing import Any, Dict, List
from uuid import uuid4

from app.adapters.base_adapter import BaseSourceAdapter, CanonicalRecord
from app.domain.enums import SourceSystem


class CCTNSAdapter(BaseSourceAdapter):
    def __init__(self):
        super().__init__(SourceSystem.CCTNS)

    def normalize_record(self, raw_record: Dict[str, Any]) -> CanonicalRecord:
        return CanonicalRecord(
            source_system=self.source_system,
            source_record_id=raw_record.get("fir_id", str(uuid4())),
            entity_type="CASE",
            payload=raw_record,
            evidence_reference=f"CCTNS FIR #{raw_record.get('fir_number', 'N/A')}",
            confidence=1.0,
        )

    def fetch_records(self, limit: int = 10) -> List[CanonicalRecord]:
        records = []
        for i in range(limit):
            fir_num = f"FIR-2026-{1000 + i}"
            raw = {
                "fir_id": f"cctns-{uuid4()}",
                "fir_number": fir_num,
                "police_station": "Cyber Crime PS North",
                "crime_type": "Cyber Fraud & Identity Theft",
                "complainant": "Rajesh Sharma",
                "accused_name": "Unknown Hacker",
                "description": f"Fraudulent transaction reported under FIR {fir_num}",
            }
            records.append(self.normalize_record(raw))
        return records


class NCRPAdapter(BaseSourceAdapter):
    def __init__(self):
        super().__init__(SourceSystem.NCRP)

    def normalize_record(self, raw_record: Dict[str, Any]) -> CanonicalRecord:
        return CanonicalRecord(
            source_system=self.source_system,
            source_record_id=raw_record.get("complaint_id", str(uuid4())),
            entity_type="CYBER_COMPLAINT",
            payload=raw_record,
            evidence_reference=f"NCRP Portal Incident #{raw_record.get('portal_ref', 'N/A')}",
            confidence=0.95,
        )

    def fetch_records(self, limit: int = 10) -> List[CanonicalRecord]:
        records = []
        for i in range(limit):
            raw = {
                "complaint_id": f"ncrp-{uuid4()}",
                "portal_ref": f"NCRP-2026-99{i}",
                "fraud_type": "UPI Mule Fraud",
                "reported_upi": f"suspect{i}@okicici",
                "amount": round(random.uniform(5000, 250000), 2),
                "victim_phone": f"+91-98765{i:05d}",
            }
            records.append(self.normalize_record(raw))
        return records


class VAHANAdapter(BaseSourceAdapter):
    def __init__(self):
        super().__init__(SourceSystem.VAHAN)

    def normalize_record(self, raw_record: Dict[str, Any]) -> CanonicalRecord:
        return CanonicalRecord(
            source_system=self.source_system,
            source_record_id=raw_record.get("reg_no", str(uuid4())),
            entity_type="VEHICLE",
            payload=raw_record,
            evidence_reference=f"VAHAN Reg Record {raw_record.get('reg_no', 'N/A')}",
            confidence=1.0,
        )

    def fetch_records(self, limit: int = 10) -> List[CanonicalRecord]:
        records = []
        for i in range(limit):
            reg = f"DL-01-AB-{1000 + i}"
            raw = {
                "reg_no": reg,
                "chassis": f"CHASSIS-2026-{uuid4().hex[:8].upper()}",
                "owner": f"Vehicle Owner {i}",
                "maker_model": "Hyundai Creta",
                "color": "Black",
            }
            records.append(self.normalize_record(raw))
        return records


class CDRAdapter(BaseSourceAdapter):
    def __init__(self):
        super().__init__(SourceSystem.CDR)

    def normalize_record(self, raw_record: Dict[str, Any]) -> CanonicalRecord:
        return CanonicalRecord(
            source_system=self.source_system,
            source_record_id=raw_record.get("cdr_id", str(uuid4())),
            entity_type="CALL_RECORD",
            payload=raw_record,
            evidence_reference=f"Telecom Operator Log {raw_record.get('cdr_id', 'N/A')}",
            confidence=1.0,
        )

    def fetch_records(self, limit: int = 10) -> List[CanonicalRecord]:
        records = []
        for i in range(limit):
            raw = {
                "cdr_id": f"cdr-{uuid4()}",
                "caller": f"+91-99990{i:05d}",
                "receiver": f"+91-98880{i:05d}",
                "duration": random.randint(15, 600),
                "cell_tower": f"TOWER-DEL-NORTH-{i}",
            }
            records.append(self.normalize_record(raw))
        return records


class ANPRAdapter(BaseSourceAdapter):
    def __init__(self):
        super().__init__(SourceSystem.ANPR)

    def normalize_record(self, raw_record: Dict[str, Any]) -> CanonicalRecord:
        return CanonicalRecord(
            source_system=self.source_system,
            source_record_id=raw_record.get("anpr_id", str(uuid4())),
            entity_type="ANPR_OBSERVATION",
            payload=raw_record,
            evidence_reference=f"ANPR Toll Cam {raw_record.get('camera_id', 'N/A')}",
            confidence=0.98,
        )

    def fetch_records(self, limit: int = 10) -> List[CanonicalRecord]:
        records = []
        for i in range(limit):
            raw = {
                "anpr_id": f"anpr-{uuid4()}",
                "plate": f"DL-01-AB-{1000 + i}",
                "camera_id": "CAM-TOLL-04",
                "location": "DND Flyway Plaza",
                "lat": 28.57,
                "lng": 77.29,
            }
            records.append(self.normalize_record(raw))
        return records


class FinancialAdapter(BaseSourceAdapter):
    def __init__(self):
        super().__init__(SourceSystem.FINANCIAL)

    def normalize_record(self, raw_record: Dict[str, Any]) -> CanonicalRecord:
        return CanonicalRecord(
            source_system=self.source_system,
            source_record_id=raw_record.get("txn_id", str(uuid4())),
            entity_type="TRANSACTION",
            payload=raw_record,
            evidence_reference=f"Bank Ledger Ref #{raw_record.get('ref_no', 'N/A')}",
            confidence=1.0,
        )

    def fetch_records(self, limit: int = 10) -> List[CanonicalRecord]:
        records = []
        for i in range(limit):
            raw = {
                "txn_id": f"txn-{uuid4()}",
                "ref_no": f"UPI2026{random.randint(100000, 999999)}",
                "from_account": f"ACC-{1000 + i}",
                "to_account": f"ACC-{2000 + i}",
                "amount": float(random.randint(1000, 500000)),
            }
            records.append(self.normalize_record(raw))
        return records
