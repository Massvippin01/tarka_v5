"""
SentinelX Wave 6 — Experience Refinement Subphase E0:
Investigation Intent + Interaction Fabric Foundation Test Suite.

Verifies:
1. UI action can become InvestigationIntent.
2. Voice semantic intent can become InvestigationIntent.
3. Agent task can become InvestigationIntent.
4. Equivalent intentions converge to equivalent canonical semantics.
5. Invalid intent is rejected.
6. Unauthorized intent cannot bypass policy.
7. Case scope is preserved.
8. Risk classification is preserved.
9. Ambiguous intent remains ambiguous rather than being silently guessed.
10. Existing CommandBus behavior remains compatible.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.domain.agent import AgentType
from app.domain.command import (
    Command,
    CommandSource,
    CommandStatus,
    UIActionType,
)
from app.domain.intent import (
    InvestigationDetailLevel,
    InvestigationIntent,
)
from app.domain.interaction import ActionRiskClass, InteractionContext
from app.domain.voice import Transcript, VoiceCommandCandidate
from app.main import app
from app.services.auth_service import AuthService
from app.services.agents.agent_supervisor import AgentSupervisor
from app.services.command.command_bus import CommandBus
from app.services.interaction.intent_normalizer import IntentNormalizer
from app.services.voice.command_interpreter import VoiceCommandInterpreter


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_service():
    return AuthService.get_instance()


@pytest.fixture
def command_bus():
    bus = CommandBus.get_instance()
    bus.cancelled_commands.clear()
    return bus


@pytest.fixture
def normalizer():
    return IntentNormalizer.get_instance()


@pytest.fixture
def voice_interpreter():
    return VoiceCommandInterpreter(command_bus=CommandBus.get_instance())


@pytest.fixture
def supervisor():
    return AgentSupervisor.get_instance()


# ── TEST 1: UI ACTION CAN BECOME INVESTIGATIONINTENT ──────────────────────────

def test_1_ui_action_can_become_investigation_intent(normalizer):
    """Verify direct UI action converts to a valid, canonical InvestigationIntent."""
    ctx = InteractionContext(case_id="CASE-2026-001", selected_entity_id="P001")
    intent = normalizer.from_ui_action(
        action_type=UIActionType.OPEN_GRAPH,
        arguments={"case_id": "CASE-2026-001", "entity_id": "P001"},
        context=ctx,
    )

    assert isinstance(intent, InvestigationIntent)
    assert intent.intent_name == "OPEN_GRAPH"
    assert intent.target_case == "CASE-2026-001"
    assert intent.target_entity == "P001"
    assert intent.modality == CommandSource.UI
    assert intent.risk_class == ActionRiskClass.READ
    assert intent.confidence == 1.0
    assert intent.ambiguity is False
    assert intent.parameters["case_id"] == "CASE-2026-001"


# ── TEST 2: VOICE CAN BECOME INVESTIGATIONINTENT ──────────────────────────────

def test_2_voice_semantic_intent_can_become_investigation_intent(voice_interpreter, normalizer):
    """Verify voice transcript / candidate converts to a canonical InvestigationIntent."""
    ctx = InteractionContext(case_id="CASE-2026-001")
    transcript = Transcript(
        text="Open graph",
        confidence=0.98,
        language="en-IN",
    )

    candidate = voice_interpreter.interpret_transcript(transcript, ctx)
    assert candidate.intent == "OPEN_GRAPH"

    # Convert candidate to InvestigationIntent
    intent = normalizer.from_voice_candidate(candidate, ctx)

    assert isinstance(intent, InvestigationIntent)
    assert intent.intent_name == "OPEN_GRAPH"
    assert intent.target_case == "CASE-2026-001"
    assert intent.modality == CommandSource.VOICE
    assert intent.confidence == 0.98
    assert intent.language == "en-IN"
    assert intent.ambiguity is False
    assert intent.raw_input == "Open graph"


# ── TEST 3: AGENT TASK CAN BECOME INVESTIGATIONINTENT ─────────────────────────

def test_3_agent_task_can_become_investigation_intent(supervisor, normalizer):
    """Verify an agent task can be represented as an InvestigationIntent."""
    task = supervisor.create_task(
        agent_type=AgentType.CONTRADICTION_ANALYST,
        case_id="CASE-2026-001",
        objective="Analyze kinematic contradictions in ANPR and CDR data",
    )

    intent = supervisor.to_investigation_intent(task)

    assert isinstance(intent, InvestigationIntent)
    assert intent.intent_name == "RUN_AGENT_TASK"
    assert intent.target_case == "CASE-2026-001"
    assert intent.modality == CommandSource.AGENT
    assert intent.risk_class == ActionRiskClass.ANALYZE
    assert intent.parameters["agent_type"] == "CONTRADICTION_ANALYST"
    assert "kinematic contradictions" in intent.parameters["objective"]
    assert intent.ambiguity is False


# ── TEST 4: EQUIVALENT INTENTIONS CONVERGE ────────────────────────────────────

def test_4_equivalent_intentions_converge(normalizer, voice_interpreter):
    """
    Demonstrate that equivalent intentions expressed across VOICE, UI, TEXT, and KEYBOARD
    converge to equivalent canonical semantics.
    """
    ctx = InteractionContext(case_id="CASE-2026-001")

    # 1. UI Click
    ui_intent = normalizer.from_ui_action(
        action_type=UIActionType.OPEN_CONTRADICTIONS,
        arguments={"case_id": "CASE-2026-001"},
        context=ctx,
    )

    # 2. Text / Chat query
    text_intent = normalizer.from_text_query(
        query="Show contradictions for CASE-2026-001",
        context=ctx,
    )

    # 3. Voice query
    transcript = Transcript(text="Show contradictions", confidence=0.96)
    cand = voice_interpreter.interpret_transcript(transcript, ctx)
    voice_intent = normalizer.from_voice_candidate(cand, ctx)

    # 4. Keyboard shortcut
    kbd_intent = normalizer.from_keyboard_action(
        shortcut="ctrl+c",
        context=ctx,
    )

    # Verify semantic equivalence across all 4 modalities
    assert ui_intent.intent_name == "OPEN_CONTRADICTIONS"
    assert text_intent.intent_name == "OPEN_CONTRADICTIONS"
    assert voice_intent.intent_name == "OPEN_CONTRADICTIONS"
    assert kbd_intent.intent_name == "OPEN_CONTRADICTIONS"

    assert IntentNormalizer.are_equivalent(ui_intent, text_intent) is True
    assert IntentNormalizer.are_equivalent(ui_intent, voice_intent) is True
    assert IntentNormalizer.are_equivalent(ui_intent, kbd_intent) is True
    assert IntentNormalizer.are_equivalent(voice_intent, text_intent) is True


# ── TEST 5: INVALID INTENT REJECTION ──────────────────────────────────────────

def test_5_invalid_intent_rejected(normalizer):
    """Verify invalid or unparseable intents are rejected or marked ambiguous."""
    ctx = InteractionContext(case_id="CASE-2026-001")

    # Empty query
    intent = normalizer.from_text_query("", context=ctx)
    assert intent.ambiguity is True
    assert intent.intent_name == "UNKNOWN"
    assert "Empty text query" in intent.ambiguity_reason

    # Unrecognized keyboard shortcut
    kbd_intent = normalizer.from_keyboard_action("ctrl+alt+shift+xyz", context=ctx)
    assert kbd_intent.ambiguity is True
    assert "Unrecognized keyboard shortcut" in kbd_intent.ambiguity_reason

    # Pydantic validation: confidence must be between 0.0 and 1.0
    with pytest.raises(Exception):
        InvestigationIntent(
            intent_name="OPEN_GRAPH",
            confidence=1.5,  # Invalid
        )


# ── TEST 6: UNAUTHORIZED INTENT CANNOT BYPASS POLICY ─────────────────────────

@pytest.mark.asyncio
async def test_6_unauthorized_intent_cannot_bypass_policy(command_bus, auth_service, normalizer):
    """Verify unauthorized intent fails closed at CommandBus policy boundary."""
    user = auth_service.users.get("INVESTIGATOR_DELHI")
    assert user is not None

    # Investigator attempts to access case outside authorized scope
    unauthorized_case = "CASE-999-CLASSIFIED"
    intent = normalizer.from_ui_action(
        action_type=UIActionType.OPEN_GRAPH,
        arguments={"case_id": unauthorized_case},
        context=InteractionContext(user_id=user.user_id, case_id=unauthorized_case),
    )

    cmd = intent.to_command()
    res = await command_bus.dispatch(cmd, user=user)

    assert res.status == CommandStatus.UNAUTHORIZED
    assert "POLICY_DENIAL" in res.message


# ── TEST 7: CASE SCOPE IS PRESERVED ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_7_case_scope_preserved(command_bus, normalizer):
    """Verify that the target_case is preserved from intent into Command and execution result."""
    target_case = "CASE-2026-001"
    ctx = InteractionContext(case_id=target_case)

    intent = normalizer.from_text_query("open timeline for CASE-2026-001", context=ctx)
    assert intent.target_case == target_case

    cmd = intent.to_command(ctx)
    assert cmd.arguments.get("case_id") == target_case

    res = await command_bus.dispatch(cmd)
    assert res.status == CommandStatus.SUCCESS
    assert len(res.ui_actions) == 1
    assert res.ui_actions[0].action_type == UIActionType.OPEN_TIMELINE
    assert res.ui_actions[0].arguments.get("case_id") == target_case


# ── TEST 8: RISK CLASSIFICATION IS PRESERVED ──────────────────────────────────

def test_8_risk_classification_preserved(normalizer, supervisor):
    """Verify ActionRiskClass is strictly preserved across normalizations."""
    # READ action
    read_intent = normalizer.from_ui_action(UIActionType.OPEN_GRAPH)
    assert read_intent.risk_class == ActionRiskClass.READ

    # ANALYZE action (Agent task)
    agent_intent = normalizer.from_agent_task(
        agent_type=AgentType.EVIDENCE_ANALYST,
        objective="Correlate CDR timestamps",
        case_id="CASE-2026-001",
    )
    assert agent_intent.risk_class == ActionRiskClass.ANALYZE

    # Custom EXECUTE action
    exec_intent = normalizer.from_ui_action(
        action_type="FREEZE_FINANCIAL_ASSETS",
        arguments={"case_id": "CASE-2026-001"},
    )
    # Even if unknown string, default read, but if explicitly set:
    exec_intent.risk_class = ActionRiskClass.EXECUTE
    cmd = exec_intent.to_command()
    assert cmd.risk_class == ActionRiskClass.EXECUTE


# ── TEST 9: AMBIGUOUS INTENT NOT SILENTLY GUESSED ─────────────────────────────

@pytest.mark.asyncio
async def test_9_ambiguous_intent_not_silently_guessed(command_bus, normalizer):
    """
    CRITICAL SAFETY REQUIREMENT:
    Ambiguous intent must remain ambiguous and fail safely with clarification prompt
    rather than guessing an entity or evidence to inspect.
    """
    # Investigator says "open it" with no active entity or evidence selected
    empty_ctx = InteractionContext(case_id="CASE-2026-001", selected_entity_id=None, selected_evidence_id=None)

    intent = normalizer.from_text_query("open it", context=empty_ctx)
    assert intent.ambiguity is True
    assert intent.clarification_prompt is not None
    assert "Please select an entity" in intent.clarification_prompt

    # Submitting ambiguous intent to CommandBus must return FAILED with clarification message
    cmd = intent.to_command(empty_ctx)
    res = await command_bus.dispatch(cmd)

    assert res.status == CommandStatus.FAILED
    assert "AMBIGUOUS_INTENT" in res.message
    assert "clarify" in res.message.lower() or "ambiguous" in res.message.lower()


# ── TEST 10: EXISTING COMMANDBUS BEHAVIOR REMAINS COMPATIBLE ──────────────────

@pytest.mark.asyncio
async def test_10_existing_command_bus_behavior_compatible(command_bus):
    """
    Verify existing CommandBus contract and behavior continues to work
    for raw Command instances without regression.
    """
    cmd = Command(
        source=CommandSource.UI,
        intent="OPEN_GRAPH",
        context=InteractionContext(case_id="CASE-2026-001"),
        requested_actions=["OPEN_GRAPH"],
    )

    res = await command_bus.dispatch(cmd)
    assert res.status == CommandStatus.SUCCESS
    assert len(res.ui_actions) == 1
    assert res.ui_actions[0].action_type == UIActionType.OPEN_GRAPH
    assert res.status == CommandStatus.SUCCESS


# ── TEST 11: REST API DISPATCH WITH INVESTIGATIONINTENT ───────────────────────

def test_11_rest_api_dispatch_with_investigation_intent(client, auth_service, normalizer):
    """Verify REST API /api/v1/command/dispatch accepts optional pre-normalized InvestigationIntent."""
    token = auth_service.create_jwt_token("INVESTIGATOR_DELHI")
    headers = {"Authorization": f"Bearer {token}"}

    intent = normalizer.from_ui_action(
        action_type=UIActionType.OPEN_GAPS,
        arguments={"case_id": "CASE-2026-001"},
    )

    payload = {
        "source": "UI",
        "intent": "OPEN_GAPS",
        "case_id": "CASE-2026-001",
        "investigation_intent": intent.model_dump(),
    }

    resp = client.post("/api/v1/command/dispatch", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "SUCCESS"
    assert len(data["ui_actions"]) == 1
    assert data["ui_actions"][0]["action_type"] == "OPEN_GAPS"
