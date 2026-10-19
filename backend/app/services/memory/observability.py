"""
SentinelX Memory Subsystem Observability & Telemetry.

Tracks metrics and OpenTelemetry spans across the Four-Tier Governed Memory lifecycle:
- memory.write
- memory.read
- memory.query
- memory.invalidate
- memory.supersede
- memory.rehydrate
- memory.snapshot
- memory.restore

Strict invariant: Never log raw sensitive memory payloads or case evidence.
"""
from __future__ import annotations

import logging
import time
from typing import Any, Dict, Optional

logger = logging.getLogger("sentinelx.memory.observability")


class MemoryMetrics:
    """In-memory telemetry counters and latency profiles for memory operations."""
    
    def __init__(self) -> None:
        self.write_count = 0
        self.read_count = 0
        self.query_count = 0
        self.invalidation_count = 0
        self.supersede_count = 0
        self.rehydrate_count = 0
        self.snapshot_count = 0
        self.restore_count = 0
        
        # Security & governance denials
        self.authorization_denial_count = 0
        self.scope_denial_count = 0
        self.provenance_rejection_count = 0
        self.conflict_count = 0
        self.cross_case_denial_count = 0
        self.promotion_count = 0
        
        # Latency trackers (in ms)
        self.latencies_ms: Dict[str, list[float]] = {
            "write": [],
            "read": [],
            "query": [],
            "rehydrate": [],
            "snapshot": [],
            "restore": [],
            "invalidate": [],
            "supersede": [],
            "reconfirm": [],
        }

    def record_latency(self, operation: str, duration_ms: float) -> None:
        if operation in self.latencies_ms:
            # Keep rolling window of last 100 observations
            if len(self.latencies_ms[operation]) >= 100:
                self.latencies_ms[operation].pop(0)
            self.latencies_ms[operation].append(duration_ms)

    def get_summary(self) -> Dict[str, Any]:
        avg_latencies = {}
        for op, vals in self.latencies_ms.items():
            avg_latencies[f"avg_{op}_latency_ms"] = round(sum(vals) / len(vals), 2) if vals else 0.0

        return {
            "write_count": self.write_count,
            "read_count": self.read_count,
            "query_count": self.query_count,
            "invalidation_count": self.invalidation_count,
            "supersede_count": self.supersede_count,
            "rehydrate_count": self.rehydrate_count,
            "snapshot_count": self.snapshot_count,
            "restore_count": self.restore_count,
            "authorization_denial_count": self.authorization_denial_count,
            "scope_denial_count": self.scope_denial_count,
            "provenance_rejection_count": self.provenance_rejection_count,
            "conflict_count": self.conflict_count,
            "cross_case_denial_count": self.cross_case_denial_count,
            "promotion_count": self.promotion_count,
            **avg_latencies,
        }


# Global telemetry singleton
metrics = MemoryMetrics()


class MemorySpan:
    """Lightweight context manager for memory operation telemetry."""
    
    def __init__(self, operation_name: str, attributes: Optional[Dict[str, Any]] = None):
        self.operation_name = operation_name
        self.attributes = attributes or {}
        self.start_time: float = 0.0

    def __enter__(self) -> MemorySpan:
        self.start_time = time.perf_counter()
        logger.debug(
            "memory.span.start op=%s %s",
            self.operation_name,
            " ".join(f"{k}={v}" for k, v in self.attributes.items() if k not in ("payload", "content"))
        )
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        duration_ms = (time.perf_counter() - self.start_time) * 1000.0
        metrics.record_latency(self.operation_name, duration_ms)
        if exc_type is not None:
            logger.warning(
                "memory.span.error op=%s duration_ms=%.2f err=%s",
                self.operation_name,
                duration_ms,
                str(exc_val)
            )
        else:
            logger.debug(
                "memory.span.finish op=%s duration_ms=%.2f",
                self.operation_name,
                duration_ms
            )
