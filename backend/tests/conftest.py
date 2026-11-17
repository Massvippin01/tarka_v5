"""
Pytest configuration and test isolation fixtures for SentinelX / TARKA backend.
"""
from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path
import pytest

from app.core.config import settings


@pytest.fixture(autouse=True)
def configure_test_environment(monkeypatch):
    """
    Ensures test isolation:
    1. Turns ENABLE_DEMO_AUTH off so all auth boundary and RBAC tests pass regardless of local .env.
    2. Disables SQL query echo log spam.
    3. Sets OTEL_SERVICE_NAME to 'sentinelx-core-api'.
    """
    monkeypatch.setattr(settings, "ENABLE_DEMO_AUTH", False)
    monkeypatch.setattr(settings, "DEBUG_SQL", False)
    monkeypatch.setattr(settings, "OTEL_SERVICE_NAME", "sentinelx-core-api")


@pytest.fixture(autouse=True)
def isolate_forensics_cases_store(monkeypatch):
    """
    Isolates file-based case stores to a temporary directory during pytest runs
    so tests do not pollute data/cases/ with temporary cases (e.g. e2e_p0d_*).
    """
    temp_dir = tempfile.mkdtemp(prefix="tarka_test_cases_")
    temp_path = Path(temp_dir)

    try:
        from tarka.core.evidence_dna import CaseStore
        from tarka.api import server
        import app.adapters.tarka_forensics_adapter as tarka_adapter

        test_store = CaseStore(base_dir=temp_path)

        # Pre-seed upi_payment_discrepancy if fixtures exist
        fixtures_dir = Path("data/fixtures/fraud_dataset")
        if fixtures_dir.exists():
            from tarka.core.models import TrustTier
            test_store.create_case(
                case_id="upi_payment_discrepancy",
                title="UPI Payment Discrepancy",
                description="Test isolated case",
                investigator="Forensic Officer",
            )
            tier_map = {
                "bank_statement.csv": TrustTier.T1,
                "cdr_records.csv": TrustTier.T1,
                "whatsapp_chat.txt": TrustTier.T3,
                "screenshot_claim.json": TrustTier.T3,
                "unverified_claim.json": TrustTier.T3,
            }
            for fname, tier in tier_map.items():
                fpath = fixtures_dir / fname
                if fpath.exists():
                    with open(fpath, "rb") as fp:
                        test_store.register_artifact(
                            case_id="upi_payment_discrepancy",
                            filename=fname,
                            file_bytes=fp.read(),
                            source_tier=tier,
                            intake_officer="Forensic Officer",
                            intake_notes=f"Test evidence: {fname}",
                        )

        monkeypatch.setattr(server, "case_store", test_store)
        monkeypatch.setattr(server, "CASES_DIR", temp_path)
        monkeypatch.setattr(tarka_adapter.adapter, "store", test_store)
    except Exception:
        pass

    yield

    shutil.rmtree(temp_dir, ignore_errors=True)
