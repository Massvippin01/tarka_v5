"""Global pytest fixtures for TARKA test suite."""

import pytest
from pathlib import Path
from tarka.core.models import (
    Fact,
    FactKind,
    TrustTier,
    AuthType,
    TimeWindow,
    GeographicRegion,
)


@pytest.fixture
def sample_fact_t1() -> Fact:
    """Returns a valid T1 Telco CDR fact fixture."""
    return Fact(
        id="FACT_CDR_001",
        source_file="airtel_cdr_2026_10_01.csv",
        sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        line_ref="row:42",
        kind=FactKind.CDR_CALL,
        time_window=TimeWindow(
            start_epoch=1760000000.0,
            end_epoch=1760000060.0,
            reported_epoch=1760000000.0,
        ),
        region=GeographicRegion(
            latitude=12.9716,
            longitude=77.5946,
            radius_meters=500.0,
        ),
        tier=TrustTier.T1,
        device_id="IMEI_864209041234567",
        clock_id="clk_airtel_ntp",
        entity_refs=["ENTITY_SUSPECT_A"],
        auth_type=AuthType.PASSIVE,
        raw_payload={"calling_num": "+919876543210", "duration_sec": 45},
    )


@pytest.fixture
def sample_fact_upi() -> Fact:
    """Returns a valid T1 UPI transaction fact fixture."""
    return Fact(
        id="FACT_UPI_001",
        source_file="sbi_stmt_2026_10.csv",
        sha256="ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        line_ref="txn:UPI/6274910283",
        kind=FactKind.UPI_PAYMENT,
        time_window=TimeWindow(
            start_epoch=1760001800.0,
            end_epoch=1760001805.0,
            reported_epoch=1760001800.0,
        ),
        region=GeographicRegion(
            latitude=12.9352,
            longitude=77.6245,
            radius_meters=50.0,
        ),
        tier=TrustTier.T1,
        device_id="VPA_suspect@oksbi",
        clock_id="clk_npci_core",
        entity_refs=["ENTITY_SUSPECT_A"],
        auth_type=AuthType.ACTIVE,
        raw_payload={"amount_inr": 450.0, "payee": "merchant_koramangala"},
    )
