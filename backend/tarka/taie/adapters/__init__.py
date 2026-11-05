"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
TAIE INTEGRATION FOUNDATION: ADAPTERS PACKAGE
"""

from tarka.taie.adapters.mock_bank_rest import MockBankRestAdapter
from tarka.taie.adapters.mock_bank_batch import MockBankBatchAdapter
from tarka.taie.adapters.mock_legacy_cbs import MockLegacyCBSAdapter

__all__ = [
    "MockBankRestAdapter",
    "MockBankBatchAdapter",
    "MockLegacyCBSAdapter",
]

