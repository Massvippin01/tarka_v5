from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.adapters.families.cctns_adapter import CCTNSFIRAdapter
from app.adapters.families.cctv_anpr_adapter import CCTVANPRAdapter
from app.adapters.families.cdr_adapter import CDRTelecomAdapter
from app.adapters.families.cloud_adapter import CloudAuditAdapter
from app.adapters.families.computer_adapter import ComputerForensicAdapter
from app.adapters.families.document_adapter import ForensicDocumentAdapter
from app.adapters.families.efsl_adapter import EFSLReportAdapter
from app.adapters.families.financial_adapter import FinancialTransactionAdapter
from app.adapters.families.icjs_adapter import ICJSRecordAdapter
from app.adapters.families.mobile_adapter import MobileForensicAdapter
from app.adapters.families.network_adapter import NetworkPCAPAdapter
from app.adapters.source_adapter import SourceAdapter
from app.domain.canonical_evidence_ir import EvidenceSourceType

logger = logging.getLogger("sentinelx.adapters")


class SourceAdapterRegistry:
    """
    Central registry for all authorized investigative and forensic source adapters.
    Manages exactly the 11 planned adapter families.
    """

    _instance: Optional[SourceAdapterRegistry] = None

    def __init__(self):
        self._adapters: Dict[EvidenceSourceType, SourceAdapter] = {}
        self._initialize_default_adapters()

    @classmethod
    def get_instance(cls) -> SourceAdapterRegistry:
        if cls._instance is None:
            cls._instance = SourceAdapterRegistry()
        return cls._instance

    def _initialize_default_adapters(self):
        # Exactly 11 Planned Adapter Families
        defaults = [
            CCTNSFIRAdapter(),
            ICJSRecordAdapter(),
            EFSLReportAdapter(),
            CDRTelecomAdapter(),
            FinancialTransactionAdapter(),
            MobileForensicAdapter(),
            ComputerForensicAdapter(),
            CloudAuditAdapter(),
            CCTVANPRAdapter(),
            NetworkPCAPAdapter(),
            ForensicDocumentAdapter(),
        ]
        for adapter in defaults:
            self.register(adapter)

    def register(self, adapter: SourceAdapter):
        self._adapters[adapter.source_type] = adapter
        logger.info(f"Registered adapter '{adapter.adapter_id}' for source type '{adapter.source_type.value}'")

    def get(self, source_type: EvidenceSourceType) -> Optional[SourceAdapter]:
        return self._adapters.get(source_type)

    def identify_adapter(self, data: bytes, metadata: Dict[str, Any]) -> Optional[SourceAdapter]:
        # 1. Check explicit metadata match
        explicit_type = metadata.get("source_type")
        if isinstance(explicit_type, str):
            try:
                explicit_type = EvidenceSourceType(explicit_type)
            except ValueError:
                explicit_type = None

        if explicit_type and explicit_type in self._adapters:
            return self._adapters[explicit_type]

        # 2. Iterate through adapters to auto-identify
        for adapter in self._adapters.values():
            if adapter.identify(data, metadata):
                return adapter

        return None

    def list_adapters(self) -> List[Dict[str, Any]]:
        return [
            {
                "adapter_id": a.adapter_id,
                "version": a.adapter_version,
                "source_type": a.source_type.value,
                "capabilities": a.capabilities(),
                "health": a.health(),
            }
            for a in self._adapters.values()
        ]

    def count(self) -> int:
        return len(self._adapters)
