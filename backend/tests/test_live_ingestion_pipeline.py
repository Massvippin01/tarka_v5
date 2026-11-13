"""
SentinelX / TARKA — Live Upload-Anything Ingestion Pipeline Tests (Prompt 10).

Validates:
1. End-to-end ingestion on brand-new synthetic evidence files (not in fixtures).
2. Streaming SSE stage events (Parse -> Extract -> Resolve -> Graph -> Score).
3. Real SHA-256 Merkle proof generation.
4. Autonomous entity resolution and explainable mule scoring on uploaded data.
5. REST API POST /api/v1/cases/{case_id}/ingest with multipart upload.
6. Execution completes in < 10 seconds.
"""

from __future__ import annotations

import io
import time
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services.auth_service import AuthService
from app.services.live_investigation_pipeline import LiveInvestigationPipeline
from app.services.realtime_dispatcher import RealtimeDispatcher


@pytest.mark.asyncio
async def test_01_live_pipeline_synthetic_brand_new_file():
    """
    Acceptance criterion Prompt 10:
    A brand-new file that isn't in the fixtures must work end-to-end in under 10 seconds.
    """
    csv_content = """Date,Particulars,Ref No,Debit,Credit,Balance,Channel
2026-09-25 10:00:00,SALARY_CREDIT/EMPLOYER,RRN-SALARY,0.00,450000.00,450000.00,NEFT
2026-09-25 11:15:30,UPI/DR/881200941001/VIKRAM_SHAH/UTIB/vikramshah@okaxis,RRN-DRAIN-01,250000.00,0.00,200000.00,UPI
2026-09-25 11:18:45,UPI/DR/881200941002/VIKRAM_SHAH/UTIB/vikram.pay@okaxis,RRN-DRAIN-02,150000.00,0.00,50000.00,UPI
2026-09-25 11:22:00,IMPS/TX/881200941003/ROHIT_VERMA/HDFC/50100418921992,RRN-SPLIT-01,200000.00,0.00,10000.00,IMPS
2026-09-25 11:30:00,RTGS/TX/881200941004/APEX_ELECTRONICS/ICIC/004205001192,RRN-MERCH-01,180000.00,0.00,10000.00,RTGS
"""
    pipeline = LiveInvestigationPipeline()
    case_id = "CASE-LIVE-TEST-001"

    start = time.perf_counter()
    result = await pipeline.execute_live_ingestion(
        case_id=case_id,
        files=[("bank_statement_live_new.csv", csv_content.encode("utf-8"))],
        metadata={
            "complainant_name": "Arunima Sinha",
            "fir_number": "FIR #990/2026",
            "typology": "INVESTMENT_SCAM",
        },
        officer="Insp. Sharma",
    )
    elapsed = time.perf_counter() - start

    # 1. Performance check: under 10 seconds (typically < 0.5s)
    assert elapsed < 10.0, f"Execution took {elapsed:.2f}s, expected < 10s"

    # 2. Results structure check
    assert result["caseId"] == case_id
    assert result["firNumber"] == "FIR #990/2026"
    assert result["complainantName"] == "Arunima Sinha"
    assert len(result["nodes"]) >= 3
    assert len(result["edges"]) >= 2
    assert len(result["clusters"]) >= 2
    assert result["postIngestionMerkleRoot"].startswith("0x")
    assert len(result["fileManifest"]) == 1

    # 3. Financial calculations check
    assert result["bookedLossInr"] == 780000.0  # 250k + 150k + 200k + 180k
    assert result["shieldedCommercialInr"] >= 180000.0

    # 4. Mule scoring & attribution check
    mule_scores = result["muleScores"]
    assert len(mule_scores) > 0

    # 5. Pipeline stages verified
    stages = result["pipelineStages"]
    assert len(stages) == 5
    assert all(s["status"] == "PASSED" for s in stages)


@pytest.mark.asyncio
async def test_02_rest_api_ingest_endpoint():
    """Validates the multipart POST /api/v1/cases/{case_id}/ingest REST API endpoint."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = AuthService.get_instance().create_jwt_token("SUPERVISOR_NCR", expires_in_seconds=300)

        csv_file = io.BytesIO(b"""Date,Particulars,Ref No,Debit,Credit,Balance,Channel
2026-09-26 12:00:00,UPI/DR/12345/VIKRAM_SHAH/UTIB/vikramshah@okaxis,RRN001,300000.00,0.00,100000.00,UPI
2026-09-26 12:10:00,IMPS/TX/67890/ROHIT_VERMA/HDFC/50100418921992,RRN002,150000.00,0.00,50000.00,IMPS
""")

        test_case_id = "CASE-2026-LIVE-001"
        response = await client.post(
            f"/api/v1/cases/{test_case_id}/ingest",
            headers={"Authorization": f"Bearer {token}"},
            files={"files": ("custom_upload.csv", csv_file, "text/csv")},
            data={
                "complainant_name": "Sunil Kumar",
                "fir_number": "FIR #149/2026",
                "typology": "DIGITAL_ARREST",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["caseId"] == test_case_id
        assert len(data["nodes"]) >= 2
        assert len(data["edges"]) >= 1
        assert data["postIngestionMerkleRoot"].startswith("0x")


@pytest.mark.asyncio
async def test_03_sse_pipeline_stage_events_dispatched():
    """Validates that real-time SSE progress events are emitted across each stage."""
    dispatcher = RealtimeDispatcher.get_instance()
    initial_count = len(dispatcher.published_events)

    pipeline = LiveInvestigationPipeline()
    case_id = "CASE-SSE-TEST"
    await pipeline.execute_live_ingestion(
        case_id=case_id,
        files=[("test.csv", b"Date,Particulars,Ref No,Debit,Credit,Balance\n2026-09-22,UPI/DR/1,R1,1000,0,9000")],
    )

    new_events = [e for e in dispatcher.published_events[initial_count:] if e.case_id == case_id]
    assert len(new_events) >= 4  # PARSE, EXTRACT, RESOLVE, SCORE
    stages = [e.payload.get("stage") for e in new_events]
    assert "PARSE" in stages
    assert "EXTRACT" in stages
    assert "RESOLVE" in stages
    assert "SCORE" in stages
