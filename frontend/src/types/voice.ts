/**
 * Realtime Voice + WebRTC Control Plane Types for SentinelX Frontend.
 * Binds directly to backend VoiceGateway and canonical CommandBus.
 */

export type VoiceUIState =
  | "MIC_OFF"
  | "CONNECTING"
  | "LISTENING"
  | "PROCESSING"
  | "SPEAKING"
  | "INTERRUPTED"
  | "RECONNECTING"
  | "DEGRADED"
  | "ERROR";

export interface VoiceSessionInfo {
  session_id: string;
  transport_url: string;
  access_token: string;
  room_name: string;
  participant_identity: string;
  operating_context_id: string;
  expires_in_seconds?: number;
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
