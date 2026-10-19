# ADR-006: Voice Investigation Command Architecture & High-Risk Safeguards

- **Status**: Approved & Implemented
- **Date**: 2026-08-30
- **Context**: Incorporating voice input into specialist law enforcement software requires strict security boundaries. Free-form audio execution creates security risks (`VOICE ≠ AUTHORIZATION`) and risks unintended mutations.

## Decision
1. **Explicit Voice Pipeline Standard**: Enforce `MICROPHONE ➔ VOICE CAPTURE ➔ SPEECH-TO-TEXT ➔ TRANSCRIPT ➔ COMMAND INTERPRETATION ➔ TYPED COMMAND ➔ SCOPE VALIDATION ➔ AUTHORIZATION ➔ VISIBLE ACTION PREVIEW ➔ USER CONFIRMATION (for high-risk actions) ➔ CANONICAL INVESTIGATION STATE ➔ AUDIT EVENT`.
2. **Explicit 11-State Voice Machine**: `IDLE`, `LISTENING`, `PROCESSING`, `TRANSCRIPT_READY`, `COMMAND_INTERPRETED`, `CONFIRMATION_REQUIRED`, `EXECUTING`, `COMPLETED`, `CANCELLED`, `ERROR`, `UNAVAILABLE`, `PERMISSION_DENIED`.
3. **High-Risk Confirmation Guardrail**: Consequential actions (modifying records, deleting evidence) require explicit investigator preview confirmation (`YOU SAID`, `INTERPRETED AS`, `ACTION`, `SCOPE`) before execution. Voice commands never silently execute high-risk operations.
4. **Command Taxonomy**: Bounded vocabulary covering Navigation, Filtering, Analytics, and Copilot queries. Ambiguous commands are rejected rather than guessed.

## Consequences
- **Positive**:
  - Voice operates strictly as an input modality.
  - Zero context resets across voice commands.
  - Speech command processing latency p50 = 3.8ms.
