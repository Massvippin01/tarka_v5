# SentinelX — Ambient Voice State Machine (Subphase A1)
**Document ID**: `docs/architecture/AMBIENT_VOICE_STATE_MACHINE.md`  
**Status**: CANONICAL ARCHITECTURAL SPECIFICATION & STATE CONTRACT  
**Authority**: Principal Product Architect & Staff Systems Engineers  
**Baseline Verification**: 422/422 Tests Passed | Frontend Production Build Clean

---

## 1. Executive Overview

SentinelX ambient voice is an operational, context-aware interaction substrate designed to feel like an experienced forensic intelligence aide rather than a decorative chatbot.

The investigator interacts naturally across spoken language, mouse navigation, and keystrokes without switching modes or memorizing artificial command vocabularies.

### 1.1 Non-Negotiable Core Invariants
1. **AI Proposes → Evidence Verifies → Human Decides**: The human investigator remains the sovereign authority. Machine learning surfaces leads and topological correlations; evidence grounds all assertions; humans confirm consequential actions.
2. **CommandBus Canonical Execution Boundary**: Voice remains a modality. Voice requests are parsed into `InvestigationIntent` and dispatched via `CommandBus`. Voice never bypasses authorization, case scope, or audit logging.
3. **No Direct Mutation**: Voice state transitions never directly alter evidence records, provenance, SHA-256 digests, case boundaries, or epistemic standing.
4. **Consent & Privacy Protocol**:
   - `PERMISSION GRANTED` $\rightarrow$ `READY` (idle, local VAD active, **ZERO AUDIO sent to backend or network**).
   - Audio transmission begins only after local speech onset detection (`SPEECH_ONSET` $\rightarrow$ `USER_SPEAKING`).
   - `PERMISSION DENIED` $\rightarrow$ `MICROPHONE_DENIED` (visible status, recovery instructions, automatic keyboard/text prompt focus).
   - Voice has a deterministic off / standby state (`RESET` / `stopMicrophoneCapture`).

---

## 2. State Model Hierarchy

SentinelX defines explicit boundaries across three distinct operational layers to avoid competing state machines:

| State Layer | Responsibility | Authority | Values |
|---|---|---|---|
| **`VoiceSessionStatus`** | WebRTC / transport session lifecycle | Backend `VoiceGateway` / `VoiceSessionManager` | `CREATED`, `CONNECTING`, `CONNECTED`, `LISTENING`, `PROCESSING`, `SPEAKING`, `INTERRUPTED`, `RECONNECTING`, `DEGRADED`, `CLOSING`, `CLOSED`, `FAILED` |
| **`VoiceTurnStatus`** | Lifecycle of an individual conversational turn | Backend `VoiceSession.turns` | `CREATED`, `LISTENING`, `TRANSCRIBING`, `INTERPRETING`, `EXECUTING`, `SPEAKING`, `INTERRUPTED`, `COMPLETED`, `CANCELLED`, `FAILED` |
| **`AmbientVoiceState`** | User-facing ambient interaction state | Frontend UI & Authoritative Backend Mirror | `READY`, `LISTENING`, `USER_SPEAKING`, `TRANSCRIBING`, `UNDERSTANDING`, `EXECUTING`, `SHOWING_RESULT`, `SPEAKING`, `INTERRUPTED`, `WAITING_FOR_CLARIFICATION`, `WAITING_FOR_CONFIRMATION`, `OFFLINE`, `MICROPHONE_DENIED`, `ERROR` |

---

## 3. Canonical 14 Ambient Voice States

```
                +-------------------------------------------------------------+
                |                                                             |
                v                                                             |
            [ READY ] <----------------------------------------+              |
             |     ^                                           |              |
 SPEECH_ONSET|     | TTS_COMPLETED                             |              |
             v     |                                           |              |
     [ USER_SPEAKING ]                                         |              |
             |                                                 |              |
   SPEECH_END|                                                 |              |
             v                                                 |              |
      [ TRANSCRIBING ]                                         |              |
             |                                                 |              |
TRANSCRIPTION|                                                 |              |
    COMPLETED|                                                 |              |
             v                                                 |              |
     [ UNDERSTANDING ] ---- CLARIFICATION_REQUIRED ---> [ WAITING_FOR_CLARIFICATION ]
             |    |                                            | (SPEECH_ONSET)
             |    +------- CONFIRMATION_REQUIRED -----> [ WAITING_FOR_CONFIRMATION ]
             |                                                 | (CONFIRMATION_ACCEPTED)
   COMMAND_  |                                                 |
    STARTED  v                                                 |
       [ EXECUTING ] <-----------------------------------------+
             |
    COMMAND_ |
   COMPLETED v
    [ SHOWING_RESULT ]
             |
 TTS_STARTED |
             v
        [ SPEAKING ] ------- SPEECH_ONSET (Barge-In) ----> [ INTERRUPTED ]
             |                                                    |
             +------------------ TTS_COMPLETED -------------------+
```

### State Definitions
1. **`READY`**: Microphone permission granted. AudioContext is monitoring local energy for speech onset via Web Audio VAD. **Zero audio frames are streamed to the backend**.
2. **`LISTENING`**: Explicit turn listening or push-to-talk active; waiting for user vocalization.
3. **`USER_SPEAKING`**: Local VAD detected human speech exceeding energy and duration thresholds. Audio frame capture and STT streaming are active.
4. **`TRANSCRIBING`**: User speech concluded. Real-time STT converting phonemes into normalized textual transcript.
5. **`UNDERSTANDING`**: Transcript submitted to semantic normalizer, extracting `InvestigationIntent`, entity targets, statutory references, and context.
6. **`EXECUTING`**: Intent verified against `PolicyGateway` and dispatched to `CommandBus` for governed forensic action execution.
7. **`SHOWING_RESULT`**: Command execution complete. Workspace visual lenses (network graph, timeline, evidence drawer) update deterministically.
8. **`SPEAKING`**: Synthesized audio response playing to investigator via streaming TTS.
9. **`INTERRUPTED`**: Investigator vocalized during TTS output. System halts speech synthesis instantly without canceling committed database operations.
10. **`WAITING_FOR_CLARIFICATION`**: Material ambiguity detected in entity reference. System requests specific target from investigator.
11. **`WAITING_FOR_CONFIRMATION`**: Consequential or high-risk action identified. Requires affirmative sovereign confirmation.
12. **`OFFLINE`**: Network connectivity lost. Local cache operational; audio streaming halted.
13. **`MICROPHONE_DENIED`**: Browser blocked microphone permission. Keyboard/text prompt auto-focused with clear retry guidance.
14. **`ERROR`**: Operational failure or rejected command. Error diagnosed and structured recovery path presented.

---

## 4. Deterministic Transition Matrix

| Current State | Event | Next State | Action / Invariant |
|---|---|---|---|
| `READY` | `SPEECH_ONSET` | `USER_SPEAKING` | Begin bounded turn capture |
| `READY` | `VOICE_ACTIVATED` | `LISTENING` | Manual click/hotkey activation |
| `READY` | `MIC_PERMISSION_DENIED`| `MICROPHONE_DENIED` | Reveal keyboard fallback input |
| `READY` | `OFFLINE_DETECTED` | `OFFLINE` | Pause network queries |
| `USER_SPEAKING` | `SPEECH_END` | `TRANSCRIBING` | End audio stream; finalize STT |
| `TRANSCRIBING` | `TRANSCRIPTION_COMPLETED` | `UNDERSTANDING` | Route text to `InvestigationIntent` |
| `UNDERSTANDING` | `INTENT_RESOLVED` | `EXECUTING` | Submit canonical command to `CommandBus` |
| `UNDERSTANDING` | `CLARIFICATION_REQUIRED` | `WAITING_FOR_CLARIFICATION` | Prompt investigator for target |
| `UNDERSTANDING` | `CONFIRMATION_REQUIRED` | `WAITING_FOR_CONFIRMATION` | Present confirmation challenge modal |
| `EXECUTING` | `COMMAND_COMPLETED` | `SHOWING_RESULT` | Synchronize UI lenses to result |
| `SHOWING_RESULT`| `TTS_STARTED` | `SPEAKING` | Begin streaming audio playback |
| `SHOWING_RESULT`| `TTS_COMPLETED` | `READY` | Text-only or silent conclusion |
| `SPEAKING` | `SPEECH_ONSET` | `INTERRUPTED` | **Barge-In**: cancel TTS immediately |
| `SPEAKING` | `TTS_COMPLETED` | `READY` | Return to ambient standby |
| `INTERRUPTED` | `RESET` | `READY` | Ready for next investigator command |
| `INTERRUPTED` | `SPEECH_ONSET` | `USER_SPEAKING` | Direct chained follow-up turn |
| `OFFLINE` | `ONLINE_RESTORED` | `READY` | Re-establish ambient standby |
| `MICROPHONE_DENIED` | `MIC_PERMISSION_GRANTED` | `READY` | Re-enable local VAD |
| `*` | `RESET` | `READY` | Universal clean recovery |

*Note: Any transition not listed above is rejected and fails closed. Current state is preserved; structured rejection diagnostic is emitted.*

---

## 5. Local Voice Activity Detection (VAD)

To ensure privacy, low CPU utilization, and zero unauthorized network traffic, VAD runs entirely client-side using the Web Audio API (`AudioContext` + `AnalyserNode`):

```typescript
export const VAD_CONFIG = {
  SPEECH_ONSET_THRESHOLD_DB: 18,   // Amplitude threshold (0-255 scale) for speech onset
  SPEECH_ONSET_FRAMES: 2,         // Number of consecutive frames above threshold
  SPEECH_END_SILENCE_MS: 850,     // Silence duration before concluding speech turn
  MIN_SPEECH_DURATION_MS: 200,    // Minimum duration to filter keyboard clicks / coughs
  NOISE_FLOOR_DB: 8,              // Baseline ambient noise floor
  BARGE_IN_THRESHOLD_DB: 22,      // Elevated threshold to trigger barge-in during active TTS
};
```

---

## 6. Multi-Channel Accessible Visual System

In accordance with the SentinelX design system rules, **color is never the sole semantic encoding**. Every state combines:
1. **Distinct Icon** (SVG glyph representing the operational state).
2. **Text Label** in uppercase monospace (`SENTINEL READY`, `USER SPEAKING`, `INVESTIGATING`).
3. **Operational Subtitle** explaining current system activity.
4. **Motion / Visual Feedback** (multi-bar animated waveform during user speech, pulsing status indicator, or high-contrast border).
5. **Theme Support**: Tested and legible across Dark Theme (`#081018`), Light Theme, High Contrast, and Reduced Motion.

---

## 7. Audit & Observability

Every state machine transition emits an `AmbientVoiceTransitionRecord`:
- `transition_id`: Globally unique identifier (`AVTR-xxxxxxxx`)
- `current_state` & `next_state`
- `event`
- `is_valid`: Boolean flag
- `session_id`, `turn_id`, `correlation_id`, `case_id`
- `rejection_reason` (if rejected)
- `timestamp`: UTC ISO 8601
- `metadata`: VAD energy, user ID, clearance

Raw audio is never persisted in logs or database records.
