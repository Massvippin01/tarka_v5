from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.domain.voice import (
    AmbientVoiceEvent,
    AmbientVoiceState,
    AmbientVoiceStateMachine,
    AmbientVoiceTransitionResult,
    VALID_AMBIENT_TRANSITIONS,
    VoiceSession,
    VoiceSessionStatus,
    VoiceTurnStatus,
    map_session_and_turn_to_ambient_state,
)
from app.main import app
from app.services.voice.voice_gateway import VoiceGateway


client = TestClient(app)
from app.services.auth_service import AuthService
token = AuthService.get_instance().create_jwt_token("INVESTIGATOR_DELHI")
client.headers.update({"Authorization": f"Bearer {token}"})


def test_01_canonical_14_ambient_states_exist():
    expected_states = {
        "READY",
        "LISTENING",
        "USER_SPEAKING",
        "TRANSCRIBING",
        "UNDERSTANDING",
        "EXECUTING",
        "SHOWING_RESULT",
        "SPEAKING",
        "INTERRUPTED",
        "WAITING_FOR_CLARIFICATION",
        "WAITING_FOR_CONFIRMATION",
        "OFFLINE",
        "MICROPHONE_DENIED",
        "ERROR",
    }
    actual_states = {s.value for s in AmbientVoiceState}
    assert actual_states == expected_states, f"Mismatch in canonical states: {actual_states ^ expected_states}"
    assert len(AmbientVoiceState) == 14


def test_02_canonical_lifecycle_progression():
    state = AmbientVoiceState.READY

    # 1. Local VAD triggers speech onset
    res = AmbientVoiceStateMachine.transition(state, AmbientVoiceEvent.SPEECH_ONSET)
    assert res.success is True
    assert res.next_state == AmbientVoiceState.USER_SPEAKING
    state = res.next_state

    # 2. Speech ends -> Transcribing
    res = AmbientVoiceStateMachine.transition(state, AmbientVoiceEvent.SPEECH_END)
    assert res.success is True
    assert res.next_state == AmbientVoiceState.TRANSCRIBING
    state = res.next_state

    # 3. Transcription completes -> Understanding
    res = AmbientVoiceStateMachine.transition(state, AmbientVoiceEvent.TRANSCRIPTION_COMPLETED)
    assert res.success is True
    assert res.next_state == AmbientVoiceState.UNDERSTANDING
    state = res.next_state

    # 4. Intent resolved -> Executing
    res = AmbientVoiceStateMachine.transition(state, AmbientVoiceEvent.INTENT_RESOLVED)
    assert res.success is True
    assert res.next_state == AmbientVoiceState.EXECUTING
    state = res.next_state

    # 5. Command completes -> Showing Result
    res = AmbientVoiceStateMachine.transition(state, AmbientVoiceEvent.COMMAND_COMPLETED)
    assert res.success is True
    assert res.next_state == AmbientVoiceState.SHOWING_RESULT
    state = res.next_state

    # 6. TTS output begins -> Speaking
    res = AmbientVoiceStateMachine.transition(state, AmbientVoiceEvent.TTS_STARTED)
    assert res.success is True
    assert res.next_state == AmbientVoiceState.SPEAKING
    state = res.next_state

    # 7. TTS output finishes -> Returns to READY
    res = AmbientVoiceStateMachine.transition(state, AmbientVoiceEvent.TTS_COMPLETED)
    assert res.success is True
    assert res.next_state == AmbientVoiceState.READY


def test_03_invalid_transitions_fail_closed():
    # An offline system cannot immediately speak or transcribe
    res = AmbientVoiceStateMachine.transition(AmbientVoiceState.OFFLINE, AmbientVoiceEvent.SPEECH_ONSET)
    assert res.success is False
    assert res.next_state == AmbientVoiceState.OFFLINE  # Does not mutate!
    assert res.rejection_reason is not None
    assert "Invalid transition" in res.rejection_reason
    assert res.record.is_valid is False

    # A transcribing state cannot directly jump to speaking without understanding/executing
    res2 = AmbientVoiceStateMachine.transition(AmbientVoiceState.TRANSCRIBING, AmbientVoiceEvent.TTS_STARTED)
    assert res2.success is False
    assert res2.next_state == AmbientVoiceState.TRANSCRIBING


def test_04_microphone_consent_flow():
    # If permission denied -> MICROPHONE_DENIED
    res_denied = AmbientVoiceStateMachine.transition(AmbientVoiceState.READY, AmbientVoiceEvent.MIC_PERMISSION_DENIED)
    assert res_denied.success is True
    assert res_denied.next_state == AmbientVoiceState.MICROPHONE_DENIED

    # Once permission granted on retry -> READY
    res_granted = AmbientVoiceStateMachine.transition(AmbientVoiceState.MICROPHONE_DENIED, AmbientVoiceEvent.MIC_PERMISSION_GRANTED)
    assert res_granted.success is True
    assert res_granted.next_state == AmbientVoiceState.READY


def test_05_barge_in_interruption_during_speech():
    # Assistant is speaking -> Investigator speaks (barge-in speech onset)
    res_barge = AmbientVoiceStateMachine.transition(AmbientVoiceState.SPEAKING, AmbientVoiceEvent.SPEECH_ONSET)
    assert res_barge.success is True
    assert res_barge.next_state == AmbientVoiceState.INTERRUPTED

    # Following interruption, system resets or accepts new turn
    res_reset = AmbientVoiceStateMachine.transition(AmbientVoiceState.INTERRUPTED, AmbientVoiceEvent.RESET)
    assert res_reset.success is True
    assert res_reset.next_state == AmbientVoiceState.READY


def test_06_ambiguous_intent_clarification_cycle():
    # From UNDERSTANDING, ambiguous query requires clarification
    res_clarify = AmbientVoiceStateMachine.transition(AmbientVoiceState.UNDERSTANDING, AmbientVoiceEvent.CLARIFICATION_REQUIRED)
    assert res_clarify.success is True
    assert res_clarify.next_state == AmbientVoiceState.WAITING_FOR_CLARIFICATION

    # User speaks clarifying target (e.g., 'P001') -> USER_SPEAKING
    res_speech = AmbientVoiceStateMachine.transition(AmbientVoiceState.WAITING_FOR_CLARIFICATION, AmbientVoiceEvent.SPEECH_ONSET)
    assert res_speech.success is True
    assert res_speech.next_state == AmbientVoiceState.USER_SPEAKING


def test_07_high_risk_confirmation_cycle():
    # High risk action requires confirmation
    res_conf = AmbientVoiceStateMachine.transition(AmbientVoiceState.UNDERSTANDING, AmbientVoiceEvent.CONFIRMATION_REQUIRED)
    assert res_conf.success is True
    assert res_conf.next_state == AmbientVoiceState.WAITING_FOR_CONFIRMATION

    # Confirmation rejected -> returns cleanly to READY
    res_rej = AmbientVoiceStateMachine.transition(AmbientVoiceState.WAITING_FOR_CONFIRMATION, AmbientVoiceEvent.CONFIRMATION_REJECTED)
    assert res_rej.success is True
    assert res_rej.next_state == AmbientVoiceState.READY

    # Confirmation accepted -> proceeds to EXECUTING
    res_conf2 = AmbientVoiceStateMachine.transition(AmbientVoiceState.UNDERSTANDING, AmbientVoiceEvent.CONFIRMATION_REQUIRED)
    res_acc = AmbientVoiceStateMachine.transition(res_conf2.next_state, AmbientVoiceEvent.CONFIRMATION_ACCEPTED)
    assert res_acc.success is True
    assert res_acc.next_state == AmbientVoiceState.EXECUTING


def test_08_offline_detection_and_restoration():
    res_off = AmbientVoiceStateMachine.transition(AmbientVoiceState.READY, AmbientVoiceEvent.OFFLINE_DETECTED)
    assert res_off.success is True
    assert res_off.next_state == AmbientVoiceState.OFFLINE

    res_on = AmbientVoiceStateMachine.transition(AmbientVoiceState.OFFLINE, AmbientVoiceEvent.ONLINE_RESTORED)
    assert res_on.success is True
    assert res_on.next_state == AmbientVoiceState.READY


def test_09_voice_session_ambient_integration():
    session = VoiceSession(
        investigator_id="INV-2026-99",
        case_id="CASE-2026-001",
        operating_context_id="CTX-TEST",
    )
    assert session.ambient_state == AmbientVoiceState.READY

    # Trigger transition on session
    res = session.transition_ambient(AmbientVoiceEvent.SPEECH_ONSET, metadata={"vad_energy": 24.5})
    assert res.success is True
    assert session.ambient_state == AmbientVoiceState.USER_SPEAKING
    assert len(session.ambient_transitions) == 1
    assert session.ambient_transitions[0].event == AmbientVoiceEvent.SPEECH_ONSET


def test_10_layer_boundary_mapping_function():
    # Verify exact relationship between VoiceSessionStatus, VoiceTurnStatus, and AmbientVoiceState
    s_ready = map_session_and_turn_to_ambient_state(VoiceSessionStatus.CONNECTED, None)
    assert s_ready == AmbientVoiceState.READY

    s_speaking = map_session_and_turn_to_ambient_state(VoiceSessionStatus.SPEAKING, VoiceTurnStatus.SPEAKING)
    assert s_speaking == AmbientVoiceState.SPEAKING

    s_exec = map_session_and_turn_to_ambient_state(VoiceSessionStatus.PROCESSING, VoiceTurnStatus.EXECUTING)
    assert s_exec == AmbientVoiceState.EXECUTING

    s_clarify = map_session_and_turn_to_ambient_state(VoiceSessionStatus.CONNECTED, None, is_clarifying=True)
    assert s_clarify == AmbientVoiceState.WAITING_FOR_CLARIFICATION

    s_denied = map_session_and_turn_to_ambient_state(VoiceSessionStatus.CONNECTED, None, mic_denied=True)
    assert s_denied == AmbientVoiceState.MICROPHONE_DENIED

    s_off = map_session_and_turn_to_ambient_state(VoiceSessionStatus.CONNECTED, None, is_offline=True)
    assert s_off == AmbientVoiceState.OFFLINE


def test_11_rest_api_ambient_endpoints():
    # 1. Status query
    resp = client.get("/api/v1/voice/ambient/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ambient_state"] == "READY"
    assert "SPEECH_ONSET" in data["allowed_events"]

    # 2. Valid transition execution
    t_resp = client.post("/api/v1/voice/ambient/transition", json={"event": "SPEECH_ONSET"})
    assert t_resp.status_code == 200
    t_data = t_resp.json()
    assert t_data["success"] is True
    assert t_data["current_state"] == "READY"
    assert t_data["next_state"] == "USER_SPEAKING"

    # 3. Invalid transition fails closed via REST
    bad_resp = client.post(
        "/api/v1/voice/ambient/transition",
        json={"event": "CONFIRMATION_ACCEPTED"},  # Cannot accept confirmation from READY!
    )
    assert bad_resp.status_code == 200
    b_data = bad_resp.json()
    assert b_data["success"] is False
    assert b_data["next_state"] == "READY"  # Preserved
    assert "Invalid transition" in b_data["rejection_reason"]


def test_12_non_mutation_invariant():
    # Ambient state transitions must NEVER directly mutate evidence or case boundaries
    from app.repositories.unified_store import UnifiedStore
    store = UnifiedStore.get_instance()
    initial_store_nodes_count = len(store.nodes)

    # Perform multiple ambient state transitions
    AmbientVoiceStateMachine.transition(AmbientVoiceState.READY, AmbientVoiceEvent.SPEECH_ONSET)
    AmbientVoiceStateMachine.transition(AmbientVoiceState.USER_SPEAKING, AmbientVoiceEvent.SPEECH_END)
    AmbientVoiceStateMachine.transition(AmbientVoiceState.TRANSCRIBING, AmbientVoiceEvent.TRANSCRIPTION_COMPLETED)

    # Invariant: Evidence and graph nodes count must remain completely unaltered by voice state transitions
    assert len(store.nodes) == initial_store_nodes_count
