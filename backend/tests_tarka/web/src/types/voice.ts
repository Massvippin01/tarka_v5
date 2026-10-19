/**
 * Realtime Voice + WebRTC Control Plane Types for SentinelX Frontend.
 * Binds directly to backend VoiceGateway and canonical CommandBus.
 * SUBPHASE A1: Canonical Ambient Voice State Machine (14 States).
 */

export type AmbientVoiceState =
  | "READY"
  | "LISTENING"
  | "USER_SPEAKING"
  | "TRANSCRIBING"
  | "UNDERSTANDING"
  | "EXECUTING"
  | "SHOWING_RESULT"
  | "SPEAKING"
  | "INTERRUPTED"
  | "WAITING_FOR_CLARIFICATION"
  | "WAITING_FOR_CONFIRMATION"
  | "OFFLINE"
  | "MICROPHONE_DENIED"
  | "ERROR";

/**
 * Backward compatibility alias: VoiceUIState matches AmbientVoiceState.
 */
export type VoiceUIState = AmbientVoiceState;

export type AmbientVoiceEvent =
  | "VOICE_ACTIVATED"
  | "MIC_PERMISSION_GRANTED"
  | "MIC_PERMISSION_DENIED"
  | "SPEECH_ONSET"
  | "SPEECH_END"
  | "TRANSCRIPTION_STARTED"
  | "TRANSCRIPTION_COMPLETED"
  | "UNDERSTANDING_STARTED"
  | "INTENT_RESOLVED"
  | "CLARIFICATION_REQUIRED"
  | "CONFIRMATION_REQUIRED"
  | "CONFIRMATION_ACCEPTED"
  | "CONFIRMATION_REJECTED"
  | "COMMAND_STARTED"
  | "COMMAND_COMPLETED"
  | "COMMAND_FAILED"
  | "RESULT_AVAILABLE"
  | "TTS_STARTED"
  | "TTS_COMPLETED"
  | "USER_INTERRUPTED"
  | "OFFLINE_DETECTED"
  | "ONLINE_RESTORED"
  | "RECONNECT_STARTED"
  | "RECONNECT_COMPLETED"
  | "ERROR_OCCURRED"
  | "RESET";

export interface AmbientVoiceTransitionRecord {
  transition_id: string;
  current_state: AmbientVoiceState;
  event: AmbientVoiceEvent;
  next_state: AmbientVoiceState;
  is_valid: boolean;
  session_id?: string;
  turn_id?: string;
  correlation_id: string;
  case_id?: string;
  rejection_reason?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AmbientVoiceTransitionResult {
  success: boolean;
  current_state: AmbientVoiceState;
  event: AmbientVoiceEvent;
  next_state: AmbientVoiceState;
  rejection_reason?: string;
  record: AmbientVoiceTransitionRecord;
}

export interface VoiceSessionInfo {
  session_id: string;
  transport_url: string;
  access_token: string;
  room_name: string;
  participant_identity: string;
  operating_context_id: string;
  expires_in_seconds?: number;
  ambient_state?: AmbientVoiceState;
}

export interface VoiceResponsePayload {
  response_id: string;
  session_id: string;
  turn_id: string;
  response_type:
    | "SUCCESS"
    | "REJECTION"
    | "AMBIGUITY"
    | "FAILURE"
    | "POLICY_DENIAL"
    | "EVIDENCE_LIMITATION"
    | "AGENT_FINDING"
    | "CONFIRMATION_REQUIRED";
  spoken_text: string;
  display_text: string;
  command_execution_result?: any;
  agent_finding?: any;
  structured_reference?: Record<string, any>;
  created_at: string;
}

export interface VoiceInterruptionResult {
  status: string;
  interruption_id: string;
  session_id: string;
  turn_id: string;
}
