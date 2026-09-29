from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.domain.command import (
    Command,
    CommandExecutionResult,
    CommandSource,
    CommandStatus,
    UIActionDescriptor,
    UIActionType,
)
from app.domain.interaction import ActionRiskClass, InteractionContext
from app.main import app
from app.services.auth_service import AuthService
from app.services.command.action_executor import ActionExecutor
from app.services.command.command_bus import CommandBus
from app.services.command.ui_action_registry import UIActionRegistry


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
def action_registry():
    return UIActionRegistry.get_instance()


def test_ui_action_registry_contains_minimum_20_actions(action_registry):
    """Verify UIActionRegistry registers at least the 20 required canonical actions."""
    actions = action_registry.list_actions()
    action_types = {a["action_type"] for a in actions}

    expected_minimum = [
        "OPEN_CASE",
        "OPEN_ENTITY",
        "OPEN_EVIDENCE",
        "OPEN_GRAPH",
        "OPEN_TIMELINE",
        "OPEN_CONTRADICTIONS",
        "OPEN_GAPS",
        "OPEN_PROOF",
        "SEARCH",
        "FILTER",
        "FOCUS",
        "EXPAND",
        "COLLAPSE",
        "SELECT",
        "COMPARE",
        "TRACE_PROVENANCE",
        "SHOW_SOURCE",
        "SHOW_SUPPORT",
        "SHOW_CONTRADICTION",
        "SHOW_GAP",
    ]

    for exp in expected_minimum:
        assert exp in action_types, f"Action {exp} missing from UIActionRegistry."


def test_ui_action_validation_fails_on_missing_required_arguments(action_registry):
    """Verify action validation fails closed when required parameters are omitted."""
    ctx = InteractionContext(case_id="CASE-2026-001")

    # OPEN_ENTITY requires entity_id
    defn = action_registry.get(UIActionType.OPEN_ENTITY)
    assert defn is not None

    with pytest.raises(ValueError, match="missing required argument: 'entity_id'"):
        defn.validate({}, ctx)


@pytest.mark.asyncio
async def test_command_bus_direct_action_execution(command_bus):
    """Test dispatching a command with explicit requested UI action."""
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
    assert res.command_id == cmd.command_id
    assert res.correlation_id == cmd.correlation_id


@pytest.mark.asyncio
async def test_command_bus_policy_authorization_rejection(command_bus, auth_service):
    """Verify CommandBus fails closed when attempting to operate on an unauthorized case."""
    user = auth_service.users.get("INVESTIGATOR_DELHI")
    assert user is not None

    cmd = Command(
        source=CommandSource.CHAT,
        intent="OPEN_GRAPH",
        context=InteractionContext(user_id=user.user_id, case_id="CASE-999-UNAUTHORIZED"),
        arguments={"case_id": "CASE-999-UNAUTHORIZED"},
    )

    res = await command_bus.dispatch(cmd, user=user)
    assert res.status == CommandStatus.UNAUTHORIZED
    assert "POLICY_DENIAL" in res.message


@pytest.mark.asyncio
async def test_command_cancellation(command_bus):
    """Verify CommandBus honors cancellation tokens before/during execution."""
    cmd = Command(
        source=CommandSource.AUTOMATION,
        intent="OPEN_GRAPH",
        context=InteractionContext(case_id="CASE-2026-001"),
        requested_actions=["OPEN_GRAPH"],
    )

    command_bus.cancel_command(cmd.command_id)
    res = await command_bus.dispatch(cmd)
    assert res.status == CommandStatus.CANCELLED
    assert "cancelled" in res.message.lower()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "natural_query,expected_action",
    [
        ("Open the graph.", UIActionType.OPEN_GRAPH),
        ("Show contradictions.", UIActionType.OPEN_CONTRADICTIONS),
        ("Show evidence.", UIActionType.OPEN_EVIDENCE),
        ("Open the timeline.", UIActionType.OPEN_TIMELINE),
        ("Search for this entity.", UIActionType.SEARCH),
        ("Focus on this person.", UIActionType.FOCUS),
        ("Show supporting evidence.", UIActionType.SHOW_SUPPORT),
        ("Show the evidence gap.", UIActionType.OPEN_GAPS),
        ("Trace provenance.", UIActionType.OPEN_PROOF),
    ],
)
async def test_golden_command_deterministic_mappings(command_bus, natural_query, expected_action):
    """
    GOLDEN COMMAND TESTS:
    Verify exact natural language investigative requests map to canonical typed UI actions.
    """
    cmd = Command(
        source=CommandSource.VOICE,
        intent=natural_query,
        context=InteractionContext(
            case_id="CASE-2026-001",
            selected_entity_id="P001",
            selected_claim_id="CLM-2026-001",
        ),
    )

    res = await command_bus.dispatch(cmd)
    assert res.status == CommandStatus.SUCCESS
    assert len(res.ui_actions) >= 1
    matched_action = any(act.action_type == expected_action for act in res.ui_actions)
    assert matched_action, f"Query '{natural_query}' did not produce expected action {expected_action} (got {[a.action_type for a in res.ui_actions]})"


@pytest.mark.asyncio
async def test_modality_convergence_produces_identical_action(command_bus):
    """
    MODALITY CONVERGENCE:
    Demonstrate that VOICE, CHAT, UI, KEYBOARD, and AGENT modalities
    converge into the exact same canonical UI action descriptor.
    """
    sources = [
        CommandSource.VOICE,
        CommandSource.CHAT,
        CommandSource.UI,
        CommandSource.KEYBOARD,
        CommandSource.AGENT,
    ]

    action_descriptors: list[UIActionDescriptor] = []

    for src in sources:
        cmd = Command(
            source=src,
            intent="Show contradictions.",
            context=InteractionContext(case_id="CASE-2026-001"),
        )
        res = await command_bus.dispatch(cmd)
        assert res.status == CommandStatus.SUCCESS
        assert len(res.ui_actions) == 1
        action_descriptors.append(res.ui_actions[0])

    # Verify all produced the identical action type and target case
    for desc in action_descriptors:
        assert desc.action_type == UIActionType.OPEN_CONTRADICTIONS
        assert desc.arguments.get("case_id") == "CASE-2026-001"


def test_command_api_dispatch_endpoint(client, auth_service):
    """Test REST API endpoint /api/v1/command/dispatch with JWT authentication."""
    token = auth_service.create_jwt_token("INVESTIGATOR_DELHI")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "source": "CHAT",
        "intent": "Open the graph.",
        "case_id": "CASE-2026-001",
    }

    resp = client.post("/api/v1/command/dispatch", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "SUCCESS"
    assert len(data["ui_actions"]) >= 1
    assert data["ui_actions"][0]["action_type"] == "OPEN_GRAPH"
    assert data["audit_event_id"].startswith("AUD-")


def test_command_api_cancel_endpoint(client, auth_service):
    """Test REST API endpoint /api/v1/command/cancel."""
    token = auth_service.create_jwt_token("INVESTIGATOR_DELHI")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post("/api/v1/command/cancel", json={"command_id": "CMD-TEST-CANCEL-001"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["cancelled"] is True


def test_command_api_list_actions_endpoint(client):
    """Test REST API endpoint /api/v1/command/actions."""
    resp = client.get("/api/v1/command/actions")
    assert resp.status_code == 200
    actions = resp.json()["actions"]
    assert len(actions) >= 20
