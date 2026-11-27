"""TARKA Universal Connector SDK — Base Abstractions.

Provides the foundational classes for external financial, telecom, and law enforcement integrations:
- BaseConnector: Abstract lifecycle contract
- CircuitBreaker: 3-state fault tolerance mechanism
- TokenBucketRateLimiter: Ingress rate limiting
- DeadLetterQueue: Persistent storage for malformed or unprocessable payloads
"""

from __future__ import annotations

import abc
import asyncio
import datetime
import enum
import hashlib
import json
import logging
import os
import time
from pathlib import Path
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field

logger = logging.getLogger("tarka.connectors")


class ConnectorState(str, enum.Enum):
    """Lifecycle state machine for external connectors."""
    UNINITIALIZED = "UNINITIALIZED"
    INITIALIZING = "INITIALIZING"
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    CIRCUIT_OPEN = "CIRCUIT_OPEN"
    SHUTTING_DOWN = "SHUTTING_DOWN"
    TERMINATED = "TERMINATED"


class CircuitState(str, enum.Enum):
    CLOSED = "CLOSED"      # Normal operation: requests pass through
    OPEN = "OPEN"          # Failing fast: requests blocked
    HALF_OPEN = "HALF_OPEN"  # Probing: limited test request permitted


class CircuitBreakerOpenException(Exception):
    """Raised when an operation is attempted while the circuit breaker is OPEN."""
    pass


class NormalizedEntity(BaseModel):
    """Canonical normalized entity produced by external connector ingest adapters."""
    entity_type: str
    entity_id: str
    attributes: Dict[str, Any] = Field(default_factory=dict)
    provenance_connector: str = "SYSTEM"
    confidence: float = 1.0
    created_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())


class CircuitBreaker:
    """3-state Circuit Breaker preventing cascading failures to remote endpoints."""

    def __init__(
        self,
        name: str = "DEFAULT-BREAKER",
        failure_threshold: int = 5,
        recovery_time_seconds: float = 30.0,
        cooldown_seconds: Optional[float] = None,
        success_threshold: int = 1,
        half_open_probes: Optional[int] = None,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_time_seconds = cooldown_seconds if cooldown_seconds is not None else recovery_time_seconds
        self.success_threshold = half_open_probes if half_open_probes is not None else success_threshold
        self.half_open_probes = self.success_threshold

        self.state = CircuitState.CLOSED
        self.consecutive_failures = 0
        self.consecutive_successes = 0
        self.last_state_change = time.time()
        self._lock = asyncio.Lock()

    async def can_execute(self) -> bool:
        """Determines whether a call can proceed based on circuit state."""
        async with self._lock:
            now = time.time()
            if self.state == CircuitState.OPEN:
                if now - self.last_state_change >= self.recovery_time_seconds:
                    logger.info("CircuitBreaker transitioning OPEN -> HALF_OPEN (probing remote service)")
                    self.state = CircuitState.HALF_OPEN
                    self.last_state_change = now
                    return True
                return False
            return True

    async def record_success(self) -> None:
        """Records a successful remote invocation."""
        async with self._lock:
            self.consecutive_failures = 0
            if self.state == CircuitState.HALF_OPEN:
                self.consecutive_successes += 1
                if self.consecutive_successes >= self.success_threshold:
                    logger.info("CircuitBreaker probe succeeded; transitioning HALF_OPEN -> CLOSED")
                    self.state = CircuitState.CLOSED
                    self.consecutive_successes = 0
                    self.last_state_change = time.time()

    async def record_failure(self, exception: Optional[Exception] = None) -> None:
        """Records a remote failure and opens the circuit if threshold exceeded."""
        async with self._lock:
            self.consecutive_failures += 1
            self.consecutive_successes = 0
            if self.consecutive_failures >= self.failure_threshold:
                if self.state != CircuitState.OPEN:
                    logger.warning(
                        f"CircuitBreaker [{self.name}] threshold exceeded ({self.consecutive_failures} failures); "
                        f"transitioning {self.state.value} -> OPEN (error: {exception})"
                    )
                    self.state = CircuitState.OPEN
                    self.last_state_change = time.time()
                    self.last_state_change = time.time()


class TokenBucketRateLimiter:
    """Token bucket rate limiter bounding calls per second and burst capacity."""

    def __init__(
        self,
        rate: float = 10.0,
        capacity: float = 20.0,
        rate_per_second: Optional[float] = None,
        burst_capacity: Optional[float] = None,
    ):
        self.rate = rate_per_second if rate_per_second is not None else rate
        self.capacity = burst_capacity if burst_capacity is not None else capacity
        self.tokens = self.capacity
        self.last_refill = time.time()
        self._lock = asyncio.Lock()

    async def acquire(self, tokens_needed: float = 1.0) -> bool:
        async with self._lock:
            now = time.time()
            elapsed = now - self.last_refill
            self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
            self.last_refill = now

            if self.tokens >= tokens_needed:
                self.tokens -= tokens_needed
                return True
            return False


class DeadLetterRecord(BaseModel):
    """Persistent dead-letter record for unprocessable external data."""
    dlq_id: str
    connector_id: str
    timestamp_utc: str
    error_reason: str
    raw_payload_base64: str
    sha256_hash: str = Field(default="")
    retry_count: int = 0


class DeadLetterQueue:
    """On-disk append-only dead-letter queue."""

    def __init__(self, storage_dir: Optional[Any] = None):
        self.dir = Path(storage_dir or os.environ.get("TARKA_DLQ_DIR", "data/dlq"))
        self.dir.mkdir(parents=True, exist_ok=True)

    async def commit(self, connector_id: str, raw_payload: str, error_reason: str) -> DeadLetterRecord:
        import base64
        payload_bytes = raw_payload.encode("utf-8") if isinstance(raw_payload, str) else raw_payload
        sha256 = hashlib.sha256(payload_bytes).hexdigest()
        dlq_id = f"DLQ-{connector_id}-{int(time.time()*1000)}-{sha256[:8]}"
        record = DeadLetterRecord(
            dlq_id=dlq_id,
            connector_id=connector_id,
            timestamp_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            error_reason=error_reason,
            raw_payload_base64=base64.b64encode(payload_bytes).decode("ascii"),
            sha256_hash=sha256,
        )
        file_path = self.dir / f"{dlq_id}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(record.model_dump_json(indent=2))
        logger.warning(f"Committed unprocessable payload to DLQ: {file_path}")
        return record

    def enqueue(self, connector_id: str, payload_bytes: bytes, reason: str) -> str:
        import base64
        dlq_id = f"DLQ_{int(time.time())}_{hashlib.sha256(payload_bytes).hexdigest()[:8]}"
        record = DeadLetterRecord(
            dlq_id=dlq_id,
            connector_id=connector_id,
            timestamp_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            error_reason=reason,
            raw_payload_base64=base64.b64encode(payload_bytes).decode("ascii"),
            sha256_hash=hashlib.sha256(payload_bytes).hexdigest(),
        )
        file_path = self.dir / f"{dlq_id}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(record.model_dump_json(indent=2))
        logger.warning(f"Committed unprocessable payload to DLQ: {file_path}")
        return dlq_id


class ConnectorHealth(BaseModel):
    connector_id: str
    state: ConnectorState
    circuit_state: CircuitState
    last_check_timestamp: str
    details: Dict[str, Any] = Field(default_factory=dict)


class BaseConnector(abc.ABC):
    """Standard abstract contract for all TARKA external integration connectors."""

    def __init__(
        self,
        connector_id: str,
        connector_type: str,
        rate_limit_rps: float = 10.0,
        failure_threshold: int = 5,
    ):
        self.connector_id = connector_id
        self.connector_type = connector_type
        self.state = ConnectorState.UNINITIALIZED
        self.circuit_breaker = CircuitBreaker(failure_threshold=failure_threshold)
        self.rate_limiter = TokenBucketRateLimiter(rate=rate_limit_rps)
        self.dlq = DeadLetterQueue()
        self.config: Dict[str, Any] = {}

    async def initialize(self, config: Dict[str, Any]) -> None:
        """Configures the connector and establishes baseline connectivity."""
        self.state = ConnectorState.INITIALIZING
        self.config = config
        try:
            await self._on_initialize(config)
            self.state = ConnectorState.HEALTHY
            logger.info(f"Connector '{self.connector_id}' successfully initialized.")
        except Exception as exc:
            self.state = ConnectorState.DEGRADED
            logger.error(f"Failed to initialize connector '{self.connector_id}': {exc}")
            raise

    @abc.abstractmethod
    async def _on_initialize(self, config: Dict[str, Any]) -> None:
        pass

    @abc.abstractmethod
    async def health_check(self) -> ConnectorHealth:
        pass

    @abc.abstractmethod
    async def fetch_records(self, query: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
        pass

    @abc.abstractmethod
    def normalize_record(self, raw_record: Dict[str, Any]) -> Dict[str, Any]:
        """Normalizes external raw schema to Canonical Fraud Schema dictionary."""
        pass

    async def shutdown(self) -> None:
        self.state = ConnectorState.SHUTTING_DOWN
        await self._on_shutdown()
        self.state = ConnectorState.TERMINATED
        logger.info(f"Connector '{self.connector_id}' terminated.")

    async def _on_shutdown(self) -> None:
        pass
