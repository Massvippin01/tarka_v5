"""
SentinelX Phase 9 — OpenTelemetry Tracing & Observability Setup.
Provides OpenTelemetry tracer provider initialization with fail-soft fallback.
"""

from __future__ import annotations

import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger("sentinelx.telemetry")


class TelemetryService:
    _instance: Optional[TelemetryService] = None

    def __init__(self):
        self.endpoint = settings.OTEL_EXPORTER_OTLP_ENDPOINT
        self.service_name = settings.OTEL_SERVICE_NAME
        self.tracer = None
        self._initialized = False

        self._init_telemetry()

    @classmethod
    def get_instance(cls) -> TelemetryService:
        if cls._instance is None:
            cls._instance = TelemetryService()
        return cls._instance

    def _init_telemetry(self):
        try:
            from opentelemetry import trace
            from opentelemetry.sdk.trace import TracerProvider
            from opentelemetry.sdk.resources import Resource

            resource = Resource.create({"service.name": self.service_name})
            provider = TracerProvider(resource=resource)
            trace.set_tracer_provider(provider)
            self.tracer = trace.get_tracer(self.service_name)
            self._initialized = True
            logger.info("OpenTelemetry initialized with service name '%s'", self.service_name)
        except Exception as err:
            logger.info("OpenTelemetry SDK fallback: %s", err)
            self._initialized = False

    def get_tracer(self):
        return self.tracer
