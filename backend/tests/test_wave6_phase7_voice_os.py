from __future__ import annotations

import pytest
import pytest_asyncio
from uuid import uuid4

from app.domain.auth import AccessPermissionEnum, CaseAccessScope, UserIdentity, UserRoleEnum
from app.domain.command import CommandStatus
from app.domain.interaction import InteractionContext
from app.domain.voice import Transcript, VoiceSessionStatus, VoiceTurnStatus
from app.services.voice.voice_gateway import VoiceGateway
from app.services.voice.response_planner import VoiceResponsePlanner
from app.services.voice.command_interpreter import VoiceCommandInterpreter


@pytest.fixture
def test_investigator() -> UserIdentity:
    return UserIdentity(
        user_id="INV-2026-TEST",
        display_name="Lead Investigator",
        role=UserRoleEnum.INVESTIGATOR,
        scope=CaseAccessScope(
            allowed_cases=["CASE-2026-001", "C102"],
            jurisdictions=["Delhi NCR / Special Cell"],
            max_sensitivity_clearance="TOP_SECRET",
        ),
        permissions=[AccessPermissionEnum.READ_CASE, AccessPermissionEnum.USE_VOICE],
    )


@pytest.fixture
def restricted_user() -> UserIdentity:
    return UserIdentity(
        user_id="USER-RESTRICTED",
        display_name="Restricted Analyst",
        role=UserRoleEnum.ANALYST,
        scope=CaseAccessScope(
            allowed_cases=["C999"],
            jurisdictions=["External"],
            max_sensitivity_clearance="UNCLASSIFIED",
        ),
        permissions=[],
    )


@pytest.fixture
def voice_gateway() -> VoiceGateway:
    return VoiceGateway.get_instance()


# ────────────────────────────────────────────────────────────────────
# 1. CANONICAL INTRO VERIFICATION
# ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_canonical_intro_english(voice_gateway: VoiceGateway, test_investigator: UserIdentity):
    session, _ = await voice_gateway.create_voice_session(
        user=test_investigator,
        language="en-IN",
    )
    intro = await voice_gateway.get_canonical_intro(session.session_id, language="en-IN")

    assert intro.response_type == "SUCCESS"
    assert "Welcome to SentinelX. I'm your investigation assistant. Tell me what you'd like to investigate." in intro.spoken_text
    assert "What would you like to investigate?" in intro.display_text
    # Invariant: Never produce artificial thinking narration
    assert "thinking" not in intro.spoken_text.lower()
    assert "let me check" not in intro.spoken_text.lower()


@pytest.mark.asyncio
async def test_canonical_intro_tamil(voice_gateway: VoiceGateway, test_investigator: UserIdentity):
    session, _ = await voice_gateway.create_voice_session(
        user=test_investigator,
        language="ta-IN",
    )
    intro = await voice_gateway.get_canonical_intro(session.session_id, language="ta-IN")

    assert intro.response_type == "SUCCESS"
    assert "சென்டினல்-எக்ஸ்-க்கு வரவேற்கிறோம்" in intro.spoken_text


# ────────────────────────────────────────────────────────────────────
# 2. VOICE GOLDEN PATH (10 STEPS SEQUENTIALLY)
# ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_voice_golden_path_complete_sequence(voice_gateway: VoiceGateway, test_investigator: UserIdentity):
    """
    Verify complete 10-step Voice Golden Path:
    1. "Continue the investigation."
    2. "What needs my attention?"
    3. "Show me the contradiction."
    4. "Why does it matter?"
    5. "Show me the evidence."
    6. "Show me the timeline."
    7. "What are we missing?"
    8. "Show P001."
    9. "Go back."
    10. "Summarize what I reviewed."
    """
    session, _ = await voice_gateway.create_voice_session(
        user=test_investigator,
        case_id="CASE-2026-001",
        language="en-IN",
    )
    sess_id = session.session_id

    # Step 1: "Continue the investigation."
    r1 = await voice_gateway.process_voice_turn(sess_id, transcript_text="Continue the investigation.", user=test_investigator)
    assert r1.response_type == "SUCCESS"
    assert "Continuing investigation for CASE-2026-001" in r1.spoken_text

    # Step 2: "What needs my attention?"
    r2 = await voice_gateway.process_voice_turn(sess_id, transcript_text="What needs my attention?", user=test_investigator)
    assert r2.response_type == "SUCCESS"
    assert "Attention required" in r2.spoken_text or "1 critical alibi contradiction" in r2.spoken_text

    # Step 3: "Show me the contradiction."
    r3 = await voice_gateway.process_voice_turn(sess_id, transcript_text="Show me the contradiction.", user=test_investigator)
    assert r3.response_type == "SUCCESS"
    assert "Contradiction Center" in r3.spoken_text or "conflict" in r3.spoken_text

    # Step 4: "Why does it matter?"
    r4 = await voice_gateway.process_voice_turn(sess_id, transcript_text="Why does it matter?", user=test_investigator)
    assert r4.response_type == "SUCCESS"
    assert "contradiction matters because" in r4.spoken_text or "refuting the subject's Mumbai alibi" in r4.spoken_text

    # Step 5: "Show me the evidence."
    r5 = await voice_gateway.process_voice_turn(sess_id, transcript_text="Show me the evidence.", user=test_investigator)
    assert r5.response_type == "SUCCESS"
    assert "EV-ANPR-001" in r5.spoken_text or "artifact" in r5.spoken_text

    # Step 6: "Show me the timeline."
    r6 = await voice_gateway.process_voice_turn(sess_id, transcript_text="Show me the timeline.", user=test_investigator)
    assert r6.response_type == "SUCCESS"
    assert "Timeline" in r6.spoken_text

    # Step 7: "What are we missing?"
    r7 = await voice_gateway.process_voice_turn(sess_id, transcript_text="What are we missing?", user=test_investigator)
    assert r7.response_type == "SUCCESS"
    assert "Evidence Gap Center" in r7.spoken_text or "missing items" in r7.spoken_text

    # Step 8: "Show P001."
    r8 = await voice_gateway.process_voice_turn(sess_id, transcript_text="Show P001.", user=test_investigator)
    assert r8.response_type == "SUCCESS"
    assert "P001" in r8.spoken_text

    # Step 9: "Go back."
    r9 = await voice_gateway.process_voice_turn(sess_id, transcript_text="Go back.", user=test_investigator)
    assert r9.response_type == "SUCCESS"
    assert "Command Surface" in r9.spoken_text or "Level 0" in r9.spoken_text

    # Step 10: "Summarize what I reviewed."
    r10 = await voice_gateway.process_voice_turn(sess_id, transcript_text="Summarize what I reviewed.", user=test_investigator)
    assert r10.response_type == "SUCCESS"
    assert "Summary: Case 2026-001" in r10.spoken_text

    # Anti-Chatbot Invariant across all 10 responses
    all_responses = [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10]
    for idx, resp in enumerate(all_responses, start=1):
        spoken_lower = resp.spoken_text.lower()
        assert "hmm" not in spoken_lower, f"Step {idx} contained conversational filler"
        assert "thinking..." not in spoken_lower, f"Step {idx} contained artificial thinking narration"
        assert "let me think" not in spoken_lower, f"Step {idx} contained chatbot phrasing"
        assert "as an ai" not in spoken_lower, f"Step {idx} broke operational persona"


# ────────────────────────────────────────────────────────────────────
# 3. BARGE-IN INTERRUPTION
# ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_barge_in_interruption(voice_gateway: VoiceGateway, test_investigator: UserIdentity):
    session, _ = await voice_gateway.create_voice_session(user=test_investigator)
    sess_id = session.session_id

    # Simulate speaking
    voice_gateway.session_manager.update_session_status(sess_id, VoiceSessionStatus.SPEAKING)

    # Trigger interruption
    res = await voice_gateway.handle_interruption(sess_id)
    assert res["status"] == "INTERRUPTED"
    assert "interruption_id" in res


# ────────────────────────────────────────────────────────────────────
# 4. FAILURE MODES WITH DETERMINISTIC FALLBACK
# ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_failure_mode_ambiguous_intent(voice_gateway: VoiceGateway, test_investigator: UserIdentity):
    session, _ = await voice_gateway.create_voice_session(user=test_investigator)
    resp = await voice_gateway.process_voice_turn(
        session.session_id,
        transcript_text="do something",
        user=test_investigator,
    )
    assert resp.response_type == "AMBIGUITY"
    assert "clarify" in resp.spoken_text.lower() or "ambiguous" in resp.spoken_text.lower()


@pytest.mark.asyncio
async def test_failure_mode_stale_or_invalid_session(voice_gateway: VoiceGateway, test_investigator: UserIdentity):
    # Pass a non-existent session
    resp = await voice_gateway.process_voice_turn(
        session_id="VS-NONEXISTENT-9999",
        transcript_text="Show contradictions",
        user=test_investigator,
    )
    assert resp.response_type == "FAILURE"
    assert "not found" in resp.spoken_text.lower()


@pytest.mark.asyncio
async def test_failure_mode_unauthorized_action(voice_gateway: VoiceGateway, restricted_user: UserIdentity):
    session, _ = await voice_gateway.create_voice_session(
        user=restricted_user,
        jurisdiction="UnauthorizedZone",
    )
    # Attempt an authorized action with restricted credentials
    resp = await voice_gateway.process_voice_turn(
        session_id=session.session_id,
        transcript_text="execute authorized action under Section 94 BNSS",
        user=restricted_user,
    )
    # Must fail closed via policy denial or confirmation challenge
    assert resp.response_type in ("POLICY_DENIAL", "CONFIRMATION_REQUIRED", "FAILURE")
