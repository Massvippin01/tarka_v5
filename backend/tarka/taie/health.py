"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
TAIE INTEGRATION FOUNDATION: INTEGRATION HEALTH REPORTER

Monitors connector latency, throughput, error rates, and manages
circuit-breaker state transitions.
"""

from __future__ import annotations

import statistics
import time
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CircuitState(str, Enum):
    CLOSED = "CLOSED"        # Normal operation
    OPEN = "OPEN"            # Fast fail; breaker tripped
    HALF_OPEN = "HALF_OPEN"  # Testing recovery


class HealthReport(BaseModel):
    institution_id: str
    status: str  # HEALTHY, DEGRADED, DOWN
    circuit_state: CircuitState
    uptime_seconds: float
    total_requests: int
    successful_requests: int
    failed_requests: int
    error_rate: float
    p50_latency_ms: float
    p95_latency_ms: float
    last_heartbeat_utc: str
    recent_errors: List[str] = Field(default_factory=list)


class IntegrationHealthReporter:
    """
    Manages operational telemetry and circuit breaker mechanics for an institutional adapter.
    """

    def __init__(
        self,
        institution_id: str,
        failure_threshold: int = 5,
        recovery_timeout_sec: float = 30.0
    ):
        self.institution_id = institution_id
        self.failure_threshold = failure_threshold
        self.recovery_timeout_sec = recovery_timeout_sec

        self.start_time = time.time()
        self.circuit_state = CircuitState.CLOSED
        self.consecutive_failures = 0
        self.last_state_change_time = time.time()

        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        self.latencies_ms: List[float] = []
        self.recent_errors: List[str] = []
        self.last_heartbeat = datetime.now(timezone.utc).isoformat()

    def can_execute(self) -> bool:
        """Determines if a request can be executed or if the circuit breaker trips."""
        now = time.time()
        if self.circuit_state == CircuitState.OPEN:
            if now - self.last_state_change_time >= self.recovery_timeout_sec:
                self.circuit_state = CircuitState.HALF_OPEN
                self.last_state_change_time = now
                return True
            return False
        return True

    def record_success(self, latency_ms: float) -> None:
        """Record successful invocation."""
        self.total_requests += 1
        self.successful_requests += 1
        self.consecutive_failures = 0
        self.latencies_ms.append(max(0.0, latency_ms))
        if len(self.latencies_ms) > 1000:
            self.latencies_ms = self.latencies_ms[-1000:]
        self.last_heartbeat = datetime.now(timezone.utc).isoformat()

        if self.circuit_state == CircuitState.HALF_OPEN:
            self.circuit_state = CircuitState.CLOSED
            self.last_state_change_time = time.time()

    def record_failure(self, error_message: str) -> None:
        """Record failed invocation and evaluate circuit transition."""
        self.total_requests += 1
        self.failed_requests += 1
        self.consecutive_failures += 1
        self.recent_errors.append(f"[{datetime.now(timezone.utc).isoformat()}] {error_message}")
        if len(self.recent_errors) > 20:
            self.recent_errors = self.recent_errors[-20:]
        self.last_heartbeat = datetime.now(timezone.utc).isoformat()

        if self.circuit_state in (CircuitState.CLOSED, CircuitState.HALF_OPEN):
            if self.consecutive_failures >= self.failure_threshold:
                self.circuit_state = CircuitState.OPEN
                self.last_state_change_time = time.time()

    def get_report(self) -> HealthReport:
        """Compile comprehensive health status report."""
        now = time.time()
        uptime = now - self.start_time
        err_rate = (self.failed_requests / self.total_requests) if self.total_requests > 0 else 0.0

        if not self.latencies_ms:
            p50 = 0.0
            p95 = 0.0
        else:
            sorted_lat = sorted(self.latencies_ms)
            n = len(sorted_lat)
            p50 = statistics.median(sorted_lat)
            p95_idx = min(int(n * 0.95), n - 1)
            p95 = sorted_lat[p95_idx]

        if self.circuit_state == CircuitState.OPEN:
            status = "DOWN"
        elif err_rate > 0.15 or self.circuit_state == CircuitState.HALF_OPEN:
            status = "DEGRADED"
        else:
            status = "HEALTHY"

        return HealthReport(
            institution_id=self.institution_id,
            status=status,
            circuit_state=self.circuit_state,
            uptime_seconds=uptime,
            total_requests=self.total_requests,
            successful_requests=self.successful_requests,
            failed_requests=self.failed_requests,
            error_rate=round(err_rate, 4),
            p50_latency_ms=round(p50, 2),
            p95_latency_ms=round(p95, 2),
            last_heartbeat_utc=self.last_heartbeat,
            recent_errors=list(self.recent_errors)
        )

    def reset(self) -> None:
        """Reset all metrics and reset circuit breaker to CLOSED."""
        self.circuit_state = CircuitState.CLOSED
        self.consecutive_failures = 0
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        self.latencies_ms.clear()
        self.recent_errors.clear()
        self.start_time = time.time()
        self.last_state_change_time = self.start_time

