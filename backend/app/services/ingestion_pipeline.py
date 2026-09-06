from __future__ import annotations

import hashlib
import logging
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from app.adapters.synthetic_adapters import BaseSourceAdapter
from app.repositories.unified_store import UnifiedStore

logger = logging.getLogger("sentinelx.ingestion")


class IngestionPipeline:
    def __init__(self):
        self.store = UnifiedStore.get_instance()
        self.seen_idempotency_keys: set[str] = set()
        self.dead_letter_queue: List[Dict[str, Any]] = []

    def compute_idempotency_key(self, source_system: str, source_record_id: str) -> str:
        raw = f"{source_system}:{source_record_id}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def ingest_records(self, adapter: BaseSourceAdapter, limit: int = 100) -> Dict[str, Any]:
        records = adapter.fetch_records(limit=limit)
        src_name = adapter.source_system.value if hasattr(adapter, "source_system") and hasattr(adapter.source_system, "value") else str(adapter.source_system)
        return self.ingest_canonical_records(src_name, records)

    def ingest_canonical_records(self, src_name: str, records: List[Any]) -> Dict[str, Any]:
        start_time = datetime.now(UTC)

        metrics = {
            "source_id": src_name,
            "source_type": f"{src_name} — SYNTHETIC ADAPTER",
            "schema_version": "v2.0",
            "records_fetched": len(records),
            "accepted": 0,
            "rejected": 0,
            "duplicate": 0,
            "transformed": 0,
            "linked": 0,
            "errors": [],
            "ingestion_started": start_time.isoformat(),
        }

        for rec in records:
            payload = rec.payload if hasattr(rec, "payload") else rec
            source_rec_id = str(getattr(rec, "source_record_id", payload.get("fir_id") or payload.get("record_id") or ""))
            if not source_rec_id:
                metrics["rejected"] += 1
                self.dead_letter_queue.append({
                    "adapter": src_name,
                    "reason": "Missing source_record_id",
                    "payload": payload,
                    "timestamp": datetime.now(UTC).isoformat(),
                })
                continue

            idempotency_key = self.compute_idempotency_key(src_name, source_rec_id)
            if idempotency_key in self.seen_idempotency_keys:
                metrics["duplicate"] += 1
                continue

            self.seen_idempotency_keys.add(idempotency_key)
            metrics["accepted"] += 1
            metrics["transformed"] += 1

            try:
                self.store.register_node(
                    source_rec_id,
                    getattr(rec, "entity_type", "Record"),
                    payload,
                )
                metrics["linked"] += 1
            except Exception as e:
                metrics["rejected"] += 1
                metrics["errors"].append(str(e))
                self.dead_letter_queue.append({
                    "adapter": src_name,
                    "reason": str(e),
                    "payload": payload,
                    "timestamp": datetime.now(UTC).isoformat(),
                })

        metrics["ingestion_completed"] = datetime.now(UTC).isoformat()
        metrics["dead_letter_queue_size"] = len(self.dead_letter_queue)
        metrics["status"] = "SYNTHETIC ADAPTER — COMPLETED"
        return metrics
