"""TARKA Universal Connector SDK — Central Registry.

Manages connector registrations, lifecycle transitions, periodic health checks, and message routing.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Dict, List, Optional
from tarka.connectors.base import BaseConnector, ConnectorHealth

logger = logging.getLogger("tarka.connectors.registry")


class ConnectorRegistry:
    """Singleton registry coordinating external feeds and adapters."""
    _instance: Optional[ConnectorRegistry] = None

    def __init__(self):
        self._connectors: Dict[str, BaseConnector] = {}

    @classmethod
    def get_instance(cls) -> ConnectorRegistry:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def register(self, connector: BaseConnector) -> None:
        """Registers a connector instance."""
        if connector.connector_id in self._connectors:
            logger.warning(f"Overwriting existing connector: {connector.connector_id}")
        self._connectors[connector.connector_id] = connector
        logger.info(f"Registered connector: {connector.connector_id} ({connector.connector_type})")

    def unregister(self, connector_id: str) -> Optional[BaseConnector]:
        return self._connectors.pop(connector_id, None)

    def get(self, connector_id: str) -> Optional[BaseConnector]:
        return self._connectors.get(connector_id)

    def list_connectors(self) -> List[str]:
        return list(self._connectors.keys())

    async def check_all_health(self) -> Dict[str, ConnectorHealth]:
        """Runs health checks concurrently across all registered connectors."""
        tasks = {cid: conn.health_check() for cid, conn in self._connectors.items()}
        results: Dict[str, ConnectorHealth] = {}
        if not tasks:
            return results

        completed = await asyncio.gather(*tasks.values(), return_exceptions=True)
        for cid, res in zip(tasks.keys(), completed):
            if isinstance(res, Exception):
                logger.error(f"Health check failed for {cid}: {res}")
            else:
                results[cid] = res
        return results

    async def shutdown_all(self) -> None:
        """Gracefully shuts down all active connectors."""
        for cid, conn in self._connectors.items():
            try:
                await conn.shutdown()
            except Exception as exc:
                logger.warning(f"Error shutting down connector {cid}: {exc}")
        self._connectors.clear()

