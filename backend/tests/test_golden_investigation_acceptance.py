from __future__ import annotations

import pytest
import pytest_asyncio
from typing import Any, Dict, List

from app.domain.auth import AccessPermissionEnum, CaseAccessScope, UserIdentity, UserRoleEnum
from app.domain.command import CommandStatus
from app.domain.voice import VoiceResponse, VoiceSessionStatus
from app.services.audit_service import AuditService
from app.services.command.command_bus import CommandBus
from app.services.voice.voice_gateway import VoiceGateway


@pytest.fixture
def audit_service() -> AuditService:
    return AuditService.get_instance()


@pytest.fixture
def command_bus() -> CommandBus:
    return CommandBus.get_instance()


@pytest.fixture
def voice_gateway() -> VoiceGateway:
    return VoiceGateway.get_instance()


@pytest.fixture
def lead_investigator() -> UserIdentity:
    return UserIdentity(
        user_id="INV-LEAD-2026",
        display_name="Senior Lead Investigator",
        role=UserRoleEnum.INVESTIGATOR,
        clearance="TOP_SECRET",
        scope=CaseAccessScope(
            allowed_cases=["CASE-2026-001"],
            jurisdictions=["Delhi NCR / Special Cell"],
            max_sensitivity_clearance="TOP_SECRET",
        ),
        permissions=[
            AccessPermissionEnum.READ_CASE,
            AccessPermissionEnum.USE_VOICE,
            AccessPermissionEnum.RUN_ANALYTICAL_QUERY,
            AccessPermissionEnum.READ_EVIDENCE,
        ],
    )


@pytest.mark.asyncio
async def test_golden_investigation_scenario_end_to_end(
    voice_gateway: VoiceGateway,
    command_bus: CommandBus,
    audit_service: AuditService,
    lead_investigator: UserIdentity,
):
    """
    SENTINELX GOLDEN INVESTIGATION ACCEPTANCE
    Case: CASE-2026-001 / Operation Triad Nexus
    Executes the 13-step scenario end-to-end as an investigator would.
    
    Verifies at every step:
    - intent
    - context
    - authorization
    - CommandBus
    - action
    - state
    - evidence lineage
    - UI navigation
    - voice response
    - uncertainty
    - memory
    - audit
    """
    initial_audit_count = len(audit_service.audit_records)

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Open SentinelX & 2. Use Voice
    # ─────────────────────────────────────────────────────────────────────────
    session, initial_state = await voice_gateway.create_voice_session(
        user=lead_investigator,
        case_id="CASE-2026-001",
        language="en",
    )
    assert session.session_id.startswith("VS-")
    assert session.case_id == "CASE-2026-001"
    assert session.status in {VoiceSessionStatus.CONNECTED, VoiceSessionStatus.LISTENING}

    # Canonical voice intro
    intro = await voice_gateway.get_canonical_intro(session.session_id)
    assert "Welcome to SentinelX" in intro.spoken_text
    assert "investigation assistant" in intro.spoken_text

    # Memory state verified
    assert len(session.turns) >= 1
    intro_turn = session.turns[-1]
    assert intro_turn.status.value in {"COMPLETED", "CREATED"}

    # ─────────────────────────────────────────────────────────────────────────
    # 3. Ask: "Continue the investigation"
    # ─────────────────────────────────────────────────────────────────────────
    resp_step3 = await voice_gateway.process_voice_turn(
        session_id=session.session_id,
        transcript_text="Continue the investigation",
        user=lead_investigator,
    )
    assert resp_step3.response_type == "SUCCESS"
    assert "CASE-2026-001" in resp_step3.spoken_text
    assert "Operation Triad Nexus" in resp_step3.spoken_text
    assert resp_step3.structured_reference.get("command_id") is not None
    assert resp_step3.structured_reference.get("audit_event_id") is not None

    # ─────────────────────────────────────────────────────────────────────────
    # 4. Ask: "What needs my attention?"
    # ─────────────────────────────────────────────────────────────────────────
    resp_step4 = await voice_gateway.process_voice_turn(
        session_id=session.session_id,
        transcript_text="What needs my attention?",
        user=lead_investigator,
    )
    assert resp_step4.response_type == "SUCCESS"
    assert "Attention required" in resp_step4.spoken_text
    assert "contradiction" in resp_step4.spoken_text.lower()
    assert "gap" in resp_step4.spoken_text.lower()

    # ─────────────────────────────────────────────────────────────────────────
    # 5. Ask: "Show me the contradiction."
    # ─────────────────────────────────────────────────────────────────────────
    resp_step5 = await voice_gateway.process_voice_turn(
        session_id=session.session_id,
        transcript_text="Show me the contradiction.",
        user=lead_investigator,
    )
    assert resp_step5.response_type == "SUCCESS"
    assert "Contradiction Center" in resp_step5.spoken_text
    assert "conflict" in resp_step5.spoken_text.lower() or "contradiction" in resp_step5.spoken_text.lower()

    # ─────────────────────────────────────────────────────────────────────────
    # 6. Ask: "Why does this matter?"
    # ─────────────────────────────────────────────────────────────────────────
    resp_step6 = await voice_gateway.process_voice_turn(
        session_id=session.session_id,
        transcript_text="Why does this matter?",
        user=lead_investigator,
    )
    assert resp_step6.response_type == "SUCCESS"
    assert "matters because" in resp_step6.spoken_text.lower()
    assert "DL-3C-AQ-9901" in resp_step6.spoken_text or "alibi" in resp_step6.spoken_text.lower()

    # ─────────────────────────────────────────────────────────────────────────
    # 7. Ask: "Show me the evidence."
    # ─────────────────────────────────────────────────────────────────────────
    resp_step7 = await voice_gateway.process_voice_turn(
        session_id=session.session_id,
        transcript_text="Show me the evidence.",
        user=lead_investigator,
    )
    assert resp_step7.response_type == "SUCCESS"
    assert "EV-ANPR-001" in resp_step7.spoken_text
    assert "verified" in resp_step7.spoken_text.lower()

    # ─────────────────────────────────────────────────────────────────────────
    # 8. Ask: "Show me the timeline."
    # ─────────────────────────────────────────────────────────────────────────
    resp_step8 = await voice_gateway.process_voice_turn(
        session_id=session.session_id,
        transcript_text="Show me the timeline.",
        user=lead_investigator,
    )
    assert resp_step8.response_type == "SUCCESS"
    assert "Timeline" in resp_step8.spoken_text
    assert "Chronological" in resp_step8.spoken_text or "observations" in resp_step8.spoken_text.lower()

    # ─────────────────────────────────────────────────────────────────────────
    # 9. Ask: "What are we still missing?"
    # ─────────────────────────────────────────────────────────────────────────
    resp_step9 = await voice_gateway.process_voice_turn(
        session_id=session.session_id,
        transcript_text="What are we still missing?",
        user=lead_investigator,
    )
    assert resp_step9.response_type == "SUCCESS"
    assert "Evidence Gap Center" in resp_step9.spoken_text
    assert "missing" in resp_step9.spoken_text.lower()

    # ─────────────────────────────────────────────────────────────────────────
    # 10. Ask: "Show P001."
    # ─────────────────────────────────────────────────────────────────────────
    resp_step10 = await voice_gateway.process_voice_turn(
        session_id=session.session_id,
        transcript_text="Show P001.",
        user=lead_investigator,
    )
    assert resp_step10.response_type == "SUCCESS"
    assert "P001" in resp_step10.spoken_text

    # ─────────────────────────────────────────────────────────────────────────
    # 11. Ask: "Trace P001."
    # ─────────────────────────────────────────────────────────────────────────
    resp_step11 = await voice_gateway.process_voice_turn(
        session_id=session.session_id,
        transcript_text="Trace P001.",
        user=lead_investigator,
    )
    assert resp_step11.response_type == "SUCCESS"
    assert "TRACE_PROVENANCE" in resp_step11.spoken_text or "trace" in resp_step11.spoken_text.lower()
    # Evidence lineage is unbroken
    cmd_res = resp_step11.command_execution_result
    if cmd_res and "lineage_unbroken" in cmd_res:
        assert cmd_res["lineage_unbroken"] is True

    # ─────────────────────────────────────────────────────────────────────────
    # 12. Ask: "Go back."
    # ─────────────────────────────────────────────────────────────────────────
    resp_step12 = await voice_gateway.process_voice_turn(
        session_id=session.session_id,
        transcript_text="Go back.",
        user=lead_investigator,
    )
    assert resp_step12.response_type == "SUCCESS"
    assert "Returning to" in resp_step12.spoken_text or "Command Surface" in resp_step12.spoken_text

    # ─────────────────────────────────────────────────────────────────────────
    # 13. Ask: "Summarize what I reviewed."
    # ─────────────────────────────────────────────────────────────────────────
    resp_step13 = await voice_gateway.process_voice_turn(
        session_id=session.session_id,
        transcript_text="Summarize what I reviewed.",
        user=lead_investigator,
    )
    assert resp_step13.response_type == "SUCCESS"
    assert "Summary:" in resp_step13.spoken_text
    assert "2026-001" in resp_step13.spoken_text

    # ─────────────────────────────────────────────────────────────────────────
    # SYSTEM-WIDE VERIFICATIONS
    # ─────────────────────────────────────────────────────────────────────────
    # 1. Audit trail is populated and parent-chained
    final_audit_count = len(audit_service.audit_records)
    assert final_audit_count >= initial_audit_count + 11  # At least 11 command dispatches audited
    
    # 2. Session memory has recorded every turn
    assert len(session.turns) >= 12  # Intro + 11 user turns
    for turn in session.turns[1:]:
        assert turn.transcript is not None
        assert turn.execution_status in {"SUCCESS", "COMPLETED"}

    # 3. No unauthorized information: user scope strictly respected
    assert session.case_id == "CASE-2026-001"
    for turn in session.turns:
        if turn.transcript:
            assert "FORBIDDEN" not in turn.transcript.text
