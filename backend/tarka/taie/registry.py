"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
TAIE INTEGRATION FOUNDATION: CONNECTOR REGISTRY

Central dynamic registration, capability lookup, and lifecycle manager
for institutional adapters.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional

from tarka.taie.manifest import InstitutionCapabilityManifest
from tarka.taie.sdk import BaseInstitutionalAdapter

logger = logging.getLogger(__name__)


class ConnectorRegistry:
    """
    Registry and lifecycle controller for all institutional adapters.
    Provides capability-based routing and status management.
    """

    def __init__(self):
        self._adapters: Dict[str, BaseInstitutionalAdapter] = {}
        self._active_states: Dict[str, bool] = {}

    def register(self, adapter: BaseInstitutionalAdapter, is_active: bool = True) -> None:
        """Register an adapter instance and set its initial operational state."""
        inst_id = adapter.institution_id
        if not inst_id:
            raise ValueError("Adapter must specify a valid institution_id in its manifest.")
        self._adapters[inst_id] = adapter
        self._active_states[inst_id] = is_active
        logger.info(f"Registered institutional adapter for '{inst_id}' (active={is_active}).")

    def unregister(self, institution_id: str) -> Optional[BaseInstitutionalAdapter]:
        """Remove an adapter from the registry."""
        self._active_states.pop(institution_id, None)
        return self._adapters.pop(institution_id, None)

    def get(self, institution_id: str) -> Optional[BaseInstitutionalAdapter]:
        """Retrieve an adapter by its institution_id."""
        return self._adapters.get(institution_id)

    def activate(self, institution_id: str) -> None:
        """Mark an adapter as active for ingestion."""
        if institution_id not in self._adapters:
            raise KeyError(f"Adapter '{institution_id}' is not registered.")
        self._active_states[institution_id] = True

    def deactivate(self, institution_id: str) -> None:
        """Deactivate an adapter, preventing new ingestions."""
        if institution_id not in self._adapters:
            raise KeyError(f"Adapter '{institution_id}' is not registered.")
        self._active_states[institution_id] = False

    def is_active(self, institution_id: str) -> bool:
        """Check if an adapter is currently active."""
        return self._active_states.get(institution_id, False)

    def get_manifest(self, institution_id: str) -> Optional[InstitutionCapabilityManifest]:
        """Retrieve the capability manifest for a given institution."""
        adapter = self.get(institution_id)
        return adapter.manifest if adapter else None

    def list_adapters(
        self,
        protocol: Optional[str] = None,
        schema: Optional[str] = None,
        active_only: bool = True
    ) -> List[BaseInstitutionalAdapter]:
        """Filter registered adapters by protocol, schema, and active status."""
        matched = []
        for inst_id, adapter in self._adapters.items():
            if active_only and not self._active_states.get(inst_id, False):
                continue
            if protocol and not adapter.manifest.is_protocol_supported(protocol):
                continue
            if schema and not adapter.manifest.is_schema_supported(schema):
                continue
            matched.append(adapter)
        return matched

    def clear(self) -> None:
        """Clear all registered adapters."""
        self._adapters.clear()
        self._active_states.clear()


# Global default instance
default_connector_registry = ConnectorRegistry()

