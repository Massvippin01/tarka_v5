from __future__ import annotations

import pytest

from app.domain.command import Command, CommandSource, CommandStatus, UIActionType
from app.domain.intent import InvestigationIntent, InvestigationRequestClass
from app.domain.interaction import ActionRiskClass, InteractionContext
from app.domain.voice import Transcript, VoiceCommandCandidate
from app.services.command.command_bus import CommandBus
from app.services.interaction.intent_normalizer import IntentNormalizer
from app.services.voice.command_interpreter import VoiceCommandInterpreter


# ── 1. Canonical 8 Request Classes ──────────────────────────────────────────

def test_01_all_8_canonical_request_classes_exist():
    expected_classes = {
        "EXECUTABLE_INVESTIGATION_REQUEST",
        "INFORMATIONAL_REQUEST",
        "NAVIGATION_REQUEST",
        "CLARIFICATION_REQUIRED",
        "CONFIRMATION_REQUIRED",
        "UNAUTHORIZED_REQUEST",
        "UNSUPPORTED_REQUEST",
        "OUT_OF_SCOPE_REQUEST",
    }
    actual_classes = {c.value for c in InvestigationRequestClass}
    assert actual_classes == expected_classes, f"Mismatch in canonical request classes: {actual_classes ^ expected_classes}"
    assert len(InvestigationRequestClass) == 8


# ── 2. InvestigationIntent Expanded Contract & Dual Sync ────────────────────

def test_02_investigation_intent_expanded_contract_and_sync():
    intent = InvestigationIntent(
        intent_name=UIActionType.FILTER.value,
        request_class=InvestigationRequestClass.NAVIGATION_REQUEST,
        sub_intent="FILTER_VERIFIED",
        case_id="CASE-2026-001",
        targets=["P001", "V001"],
        entities=["P001"],
        evidence_refs=["EV-ANPR-001"],
        jurisdiction="Delhi NCR / Special Cell",
        time_range={"window": "24h"},
        location={"lat": 28.6139, "lon": 77.2090},
        filters={"epistemic_status": "VERIFIED"},
        grouping="CLUSTER",
        comparison={"entity_a": "P001", "entity_b": "P002"},
        requested_output="GRAPH_SELECTION",
        modality=CommandSource.VOICE,
        language="en-IN",
        confidence=0.99,
        raw_input="Only show verified relationships",
    )

    # Verification of backward-compatible dual synchronization
    assert intent.target_case == "CASE-2026-001"
    assert intent.target_entity == "P001"
    assert intent.target_evidence == "EV-ANPR-001"
    assert intent.temporal_constraints == {"window": "24h"}
    assert intent.spatial_constraints == {"lat": 28.6139, "lon": 77.2090}

    # Verify command conversion retains full analytical payload
    cmd = intent.to_command()
    assert cmd.source == CommandSource.VOICE
    assert cmd.arguments["request_class"] == "NAVIGATION_REQUEST"
    assert cmd.arguments["sub_intent"] == "FILTER_VERIFIED"
    assert cmd.arguments["entities"] == ["P001"]
    assert cmd.arguments["filters"] == {"epistemic_status": "VERIFIED"}


# ── 3. Unauthorized Requests ────────────────────────────────────────────────

def test_03_unauthorized_request_classification():
    normalizer = IntentNormalizer.get_instance()
    context = InteractionContext(case_id="CASE-2026-001")

    queries = [
        "Open restricted case 999",
        "Show dossier for classified case 999",
        "Access unauthorized case-999 records",
        "Inspect case 999 evidence",
    ]

    for q in queries:
        intent = normalizer.from_text_query(q, context=context)
        assert intent.request_class == InvestigationRequestClass.UNAUTHORIZED_REQUEST
        assert "UNAUTHORIZED" in intent.intent_name or intent.intent_name == "UNAUTHORIZED_REQUEST"
        assert intent.clarification_prompt is not None


# ── 4. Unsupported Requests ─────────────────────────────────────────────────

def test_04_unsupported_request_classification():
    normalizer = IntentNormalizer.get_instance()
    context = InteractionContext(case_id="CASE-2026-001")

    queries = [
        "Order me a pizza",
        "What is the weather outside?",
        "Play some background jazz music",
        "Book a flight to Mumbai",
    ]

    for q in queries:
        intent = normalizer.from_text_query(q, context=context)
        assert intent.request_class == InvestigationRequestClass.UNSUPPORTED_REQUEST
        assert intent.intent_name == "UNSUPPORTED_CAPABILITY"
        assert "unsupported" in intent.clarification_prompt.lower()


# ── 5. Out of Scope Requests ────────────────────────────────────────────────

def test_05_out_of_scope_request_classification():
    normalizer = IntentNormalizer.get_instance()
    context = InteractionContext(case_id="CASE-2026-001")

    queries = [
        "Tell me a joke",
        "What is your favorite movie?",
        "Change my password",
        "Are you conscious?",
    ]

    for q in queries:
        intent = normalizer.from_text_query(q, context=context)
        assert intent.request_class == InvestigationRequestClass.OUT_OF_SCOPE_REQUEST
        assert intent.intent_name == "OUT_OF_SCOPE_REQUEST"
        assert "outside" in intent.clarification_prompt.lower()


# ── 6. Confirmation Required (Statutory Coercive Powers) ─────────────────────

def test_06_confirmation_required_statutory_coercive():
    normalizer = IntentNormalizer.get_instance()
    context = InteractionContext(case_id="CASE-2026-001")

    queries = [
        "Freeze all bank accounts",
        "Issue search warrant for location",
        "Confiscate mobile devices",
        "Subpoena telecom provider",
        "Issue notice under section 94 BNSS",
    ]

    for q in queries:
        intent = normalizer.from_text_query(q, context=context)
        assert intent.request_class == InvestigationRequestClass.CONFIRMATION_REQUIRED
        assert intent.requires_confirmation is True
        assert intent.risk_class == ActionRiskClass.EXECUTE
        assert intent.statutory_power_code is not None


# ── 7. Clarification Required for Ambiguous Queries ─────────────────────────

def test_07_clarification_required_and_contextual_resolution():
    normalizer = IntentNormalizer.get_instance()

    # Without active selection: must ask for clarification
    context_empty = InteractionContext(case_id="CASE-2026-001", selected_entity_id=None)
    intent_ambiguous = normalizer.from_text_query("Show the connection", context=context_empty)
    assert intent_ambiguous.request_class == InvestigationRequestClass.CLARIFICATION_REQUIRED
    assert intent_ambiguous.ambiguity is True
    assert "Please select an entity" in intent_ambiguous.clarification_prompt

    # With active selection: resolves "this person" / "he" / "the connection"
    context_active = InteractionContext(case_id="CASE-2026-001", selected_entity_id="P001")
    intent_resolved = normalizer.from_text_query("Show me everything connected to this person", context=context_active)
    assert intent_resolved.request_class == InvestigationRequestClass.NAVIGATION_REQUEST
    assert intent_resolved.target_entity == "P001"
    assert "P001" in intent_resolved.entities


# ── 8. Natural Language Open-Ended Investigative Requests (A to X) ──────────

def test_08_natural_language_investigative_requests_resolution():
    normalizer = IntentNormalizer.get_instance()
    ctx = InteractionContext(case_id="CASE-2026-001", selected_entity_id="P001", selected_claim_id="CLM-2026-001")

    # A. "Show me everything connected to P001"
    it = normalizer.from_text_query("Show me everything connected to P001", context=ctx)
    assert it.sub_intent == "EXPAND_NETWORK"
    assert it.target_entity == "P001"

    # B. "Why is this person connected to this case?"
    it = normalizer.from_text_query("Why is this person connected to this case?", context=ctx)
    assert it.sub_intent == "EXPLAIN_CASE_CONNECTION"
    assert it.request_class == InvestigationRequestClass.INFORMATIONAL_REQUEST

    # C. "Find all vehicles associated with these entities"
    it = normalizer.from_text_query("Find all vehicles associated with these entities", context=ctx)
    assert it.sub_intent == "FIND_ASSOCIATED_ENTITIES"
    assert it.filters.get("target_type") == "VEHICLE"

    # D. "Compare the movements between these two subjects"
    it = normalizer.from_text_query("Compare the movements between P001 and P002", context=ctx)
    assert it.sub_intent == "COMPARE_MOVEMENTS"
    assert it.comparison.get("entity_a") == "P001"
    assert it.comparison.get("entity_b") == "P002"

    # E. "What changed since yesterday?"
    it = normalizer.from_text_query("What changed since yesterday?", context=ctx)
    assert it.sub_intent == "INVESTIGATION_DELTA"
    assert it.request_class == InvestigationRequestClass.INFORMATIONAL_REQUEST

    # F. "Show me the strongest unexplained connection"
    it = normalizer.from_text_query("Show me the strongest unexplained connection", context=ctx)
    assert it.sub_intent == "STRONGEST_UNEXPLAINED_CONNECTION"

    # G. "Trace this relationship back to the source evidence"
    it = normalizer.from_text_query("Trace this relationship back to the source evidence", context=ctx)
    assert it.sub_intent == "TRACE_TO_SOURCE_EVIDENCE"
    assert it.intent_name == UIActionType.TRACE_PROVENANCE.value

    # H. "Which evidence supports this relationship?"
    it = normalizer.from_text_query("Which evidence supports this relationship?", context=ctx)
    assert it.sub_intent == "SUPPORTING_EVIDENCE"
    assert it.intent_name == UIActionType.SHOW_SUPPORT.value

    # I. "Which claims are contradicted?"
    it = normalizer.from_text_query("Which claims are contradicted?", context=ctx)
    assert it.sub_intent == "CONTRADICTED_CLAIMS"
    assert it.intent_name == UIActionType.OPEN_CONTRADICTIONS.value

    # J. "Show me the missing evidence"
    it = normalizer.from_text_query("Show me the missing evidence", context=ctx)
    assert it.sub_intent == "MISSING_EVIDENCE_GAPS"
    assert it.intent_name == UIActionType.OPEN_GAPS.value

    # K. "Open the timeline around 11:42 PM"
    it = normalizer.from_text_query("Open the timeline around 11:42 PM", context=ctx)
    assert it.sub_intent == "TIMELINE_AT_TIME"
    assert it.time_range.get("target_time") == "11:42 PM"

    # L. "Zoom into this cluster"
    it = normalizer.from_text_query("Zoom into this cluster", context=ctx)
    assert it.sub_intent == "ZOOM_CLUSTER"

    # M. "Hide unrelated entities"
    it = normalizer.from_text_query("Hide unrelated entities", context=ctx)
    assert it.sub_intent == "HIDE_UNRELATED"
    assert it.intent_name == UIActionType.FILTER.value

    # N. "Only show verified relationships"
    it = normalizer.from_text_query("Only show verified relationships", context=ctx)
    assert it.sub_intent == "FILTER_VERIFIED"
    assert it.filters.get("epistemic_status") == "VERIFIED"

    # O. "Show inferred relationships separately"
    it = normalizer.from_text_query("Show inferred relationships separately", context=ctx)
    assert it.sub_intent == "SHOW_INFERRED_SEPARATELY"

    # P. "Group these entities"
    it = normalizer.from_text_query("Group these entities", context=ctx)
    assert it.sub_intent == "GROUP_ENTITIES"
    assert it.grouping == "CLUSTER"

    # Q. "Find common locations" / "Find common phone numbers" / "Find common vehicles"
    it_loc = normalizer.from_text_query("Find common locations", context=ctx)
    assert it_loc.sub_intent == "COMMON_LOCATIONS"
    it_ph = normalizer.from_text_query("Find common phone numbers", context=ctx)
    assert it_ph.sub_intent == "COMMON_PHONE_NUMBERS"

    # R. "Show me the shortest relationship path"
    it = normalizer.from_text_query("Show me the shortest relationship path between P001 and P002", context=ctx)
    assert it.sub_intent == "SHORTEST_PATH"

    # S. "Summarize this cluster"
    it = normalizer.from_text_query("Summarize this cluster", context=ctx)
    assert it.sub_intent == "CLUSTER_SUMMARY"

    # T. "Generate a forensic report"
    it = normalizer.from_text_query("Generate a forensic report", context=ctx)
    assert it.sub_intent == "GENERATE_FORENSIC_REPORT"

    # U. "Read this report"
    it = normalizer.from_text_query("Read this report", context=ctx)
    assert it.sub_intent == "READ_REPORT"

    # V. "Go back" / "Undo that"
    it = normalizer.from_text_query("Undo that and return to the previous investigation state", context=ctx)
    assert it.sub_intent == "RETURN_PREVIOUS"
    assert it.intent_name == UIActionType.GO_BACK.value


# ── 9. VoiceCommandInterpreter Integration ──────────────────────────────────

def test_09_voice_command_interpreter_to_investigation_intent():
    interpreter = VoiceCommandInterpreter()
    ctx = InteractionContext(case_id="CASE-2026-001", selected_entity_id="P001")

    transcript = Transcript(
        transcript_id="TR-VOICE-001",
        text="Why is this person connected to this case?",
        confidence=0.97,
        language="en-IN",
    )

    candidate = interpreter.interpret_transcript(transcript, ctx)
    assert candidate.request_class == "INFORMATIONAL_REQUEST"
    assert candidate.sub_intent == "EXPLAIN_CASE_CONNECTION"
    assert "P001" in candidate.entities

    # Verify conversion to canonical Command and dispatch readiness
    cmd = interpreter.create_command(candidate, ctx)
    assert cmd.source == CommandSource.VOICE
    assert cmd.investigation_intent is not None
    assert cmd.investigation_intent.request_class == InvestigationRequestClass.INFORMATIONAL_REQUEST


# ── 10. CommandBus Fail-Closed Enforcement for Request Classes ──────────────

@pytest.mark.asyncio
async def test_10_command_bus_enforcement_of_request_classes():
    bus = CommandBus.get_instance()
    ctx = InteractionContext(case_id="CASE-2026-001")

    # A. Unauthorized request -> UNAUTHORIZED
    cmd_unauth = Command(
        source=CommandSource.CHAT,
        intent="Open restricted case 999",
        context=ctx,
    )
    res_unauth = await bus.dispatch(cmd_unauth)
    assert res_unauth.status == CommandStatus.UNAUTHORIZED
    assert "UNAUTHORIZED_REQUEST" in res_unauth.message

    # B. Unsupported request -> FAILED with UNSUPPORTED_REQUEST
    cmd_unsupp = Command(
        source=CommandSource.CHAT,
        intent="Order me a pizza",
        context=ctx,
    )
    res_unsupp = await bus.dispatch(cmd_unsupp)
    assert res_unsupp.status == CommandStatus.FAILED
    assert "UNSUPPORTED_REQUEST" in res_unsupp.message

    # C. Out of scope request -> FAILED with OUT_OF_SCOPE_REQUEST
    cmd_oos = Command(
        source=CommandSource.CHAT,
        intent="Tell me a joke",
        context=ctx,
    )
    res_oos = await bus.dispatch(cmd_oos)
    assert res_oos.status == CommandStatus.FAILED
    assert "OUT_OF_SCOPE_REQUEST" in res_oos.message

    # D. Clarification required -> FAILED with CLARIFICATION_REQUIRED prompt
    cmd_clarify = Command(
        source=CommandSource.CHAT,
        intent="Show the connection",
        context=InteractionContext(case_id="CASE-2026-001", selected_entity_id=None),
    )
    res_clarify = await bus.dispatch(cmd_clarify)
    assert res_clarify.status == CommandStatus.FAILED
    assert "CLARIFICATION_REQUIRED" in res_clarify.message

    # E. Confirmation required -> WAITING_CONFIRMATION
    cmd_confirm = Command(
        source=CommandSource.CHAT,
        intent="Freeze all bank accounts",
        context=ctx,
    )
    res_confirm = await bus.dispatch(cmd_confirm)
    assert res_confirm.status == CommandStatus.WAITING_CONFIRMATION
    assert res_confirm.requires_confirmation is True
    assert res_confirm.confirmation_challenge is not None


# ── 11. CommandBus End-to-End Action Dispatch & Auditing ────────────────────

@pytest.mark.asyncio
async def test_11_command_bus_end_to_end_action_dispatch_and_audit():
    bus = CommandBus.get_instance()
    ctx = InteractionContext(case_id="CASE-2026-001", selected_entity_id="P001")

    # 1. Filter verified relationships
    cmd_filter = Command(
        source=CommandSource.VOICE,
        intent="Only show verified relationships",
        context=ctx,
    )
    res_filter = await bus.dispatch(cmd_filter)
    assert res_filter.status == CommandStatus.SUCCESS
    assert len(res_filter.ui_actions) == 1
    assert res_filter.ui_actions[0].action_type == UIActionType.FILTER
    assert res_filter.ui_actions[0].arguments["values"] == ["VERIFIED"]

    # 2. Compare subjects
    cmd_compare = Command(
        source=CommandSource.CHAT,
        intent="Compare the movements between P001 and P002",
        context=ctx,
    )
    res_compare = await bus.dispatch(cmd_compare)
    assert res_compare.status == CommandStatus.SUCCESS
    assert len(res_compare.ui_actions) == 1
    assert res_compare.ui_actions[0].action_type == UIActionType.COMPARE
    assert res_compare.ui_actions[0].arguments["entity_a"] == "P001"
    assert res_compare.ui_actions[0].arguments["entity_b"] == "P002"


# ── 12. Intent Equivalence & Multilingual Backward Compatibility ────────────

def test_12_intent_equivalence_and_multilingual_backwards_compat():
    normalizer = IntentNormalizer.get_instance()
    ctx = InteractionContext(case_id="CASE-2026-001", selected_entity_id="P001")

    # Equivalence: Chat vs Voice for the same intent
    intent_chat = normalizer.from_text_query("Only show verified relationships", context=ctx)
    cand_voice = VoiceCommandCandidate(
        transcript_id="TR-1",
        intent=UIActionType.FILTER.value,
        transcript_text="Only show verified relationships",
    )
    intent_voice = normalizer.from_voice_candidate(cand_voice, context=ctx)

    assert IntentNormalizer.are_equivalent(intent_chat, intent_voice) is True

    # Differing request class or sub_intent must NOT be equivalent
    intent_other = normalizer.from_text_query("Show me everything connected to P001", context=ctx)
    assert IntentNormalizer.are_equivalent(intent_chat, intent_other) is False

    # Backwards compatibility: Existing legacy English & Tamil commands remain functional
    intent_graph = normalizer.from_text_query("open graph", context=ctx)
    assert intent_graph.intent_name == UIActionType.OPEN_GRAPH.value

    intent_tamil = normalizer.from_text_query("adhoda proof kaattu", context=InteractionContext(case_id="CASE-2026-001", selected_claim_id="CLM-001"))
    assert intent_tamil.intent_name == "OPEN_PROOF"
