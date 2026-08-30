from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime

from .base import UniversalEntity
from .enums import EntityType


@dataclass(slots=True)
class BankAccount(UniversalEntity):
    entity_type: EntityType = EntityType.BANK_ACCOUNT

    account_number: str = ""
    bank_name: str = ""
    ifsc: str = ""
    branch_name: str = ""
    account_type: str = "SAVINGS"  # SAVINGS, CURRENT, OVERDRAFT
    owner_id: str | None = None
    balance: float = 0.0
    status: str = "ACTIVE"


@dataclass(slots=True)
class UPIAccount(UniversalEntity):
    entity_type: EntityType = EntityType.UPI_ACCOUNT

    vpa: str = ""  # e.g., user@okicici
    linked_account_number: str = ""
    owner_id: str | None = None
    provider: str = ""  # PhonePe, GPay, Paytm, BHIM


@dataclass(slots=True)
class Transaction(UniversalEntity):
    entity_type: EntityType = EntityType.TRANSACTION

    txn_id: str = ""
    source_account: str = ""
    target_account: str = ""
    amount: float = 0.0
    currency: str = "INR"
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))
    txn_type: str = "UPI"  # NEFT, RTGS, IMPS, UPI, CASH
    status: str = "COMPLETED"
    reference_number: str = ""
    flagged: bool = False
    flag_reason: str = ""
