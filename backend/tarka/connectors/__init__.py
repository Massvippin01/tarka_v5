"""TARKA Universal Connector SDK.

Exposes external data source adapters, resilience primitives, and lifecycle registries.
"""

from tarka.connectors.base import (
    BaseConnector,
    CircuitBreaker,
    CircuitState,
    ConnectorHealth,
    ConnectorState,
    DeadLetterQueue,
    TokenBucketRateLimiter,
)
from tarka.connectors.bank_iso20022 import BankISO20022Connector
from tarka.connectors.telecom_sftp import TelecomSFTPConnector
from tarka.connectors.ncrp_webhook import NCRPWebhookConnector
from tarka.connectors.registry import ConnectorRegistry

__all__ = [
    "BaseConnector",
    "CircuitBreaker",
    "CircuitState",
    "ConnectorHealth",
    "ConnectorState",
    "DeadLetterQueue",
    "TokenBucketRateLimiter",
    "BankISO20022Connector",
    "TelecomSFTPConnector",
    "NCRPWebhookConnector",
    "ConnectorRegistry",
]
