export type InteractionMode = "KEYBOARD" | "POINTER" | "VOICE" | "UI_DIRECT";

export type MicPermissionState = "GRANTED" | "PROMPT" | "DENIED" | "UNSUPPORTED" | "NOT_REQUESTED";

export type OnboardingIntentCode =
  | "START_INVESTIGATION"
  | "OPEN_CASE"
  | "SEARCH_ENTITY"
  | "REVIEW_EVIDENCE"
  | "CONTINUE_INVESTIGATION"
  | "OTHER";

export interface OnboardingActionOption {
  intent_code: OnboardingIntentCode;
  title: string;
  description: string;
  suggested_action: string;
  requires_input: boolean;
  input_placeholder?: string;
  target_route: string;
  available_targets?: Array<{
    case_id: string;
    title: string;
    description: string;
    jurisdiction?: string;
  }>;
}

export interface ClientEnvironmentReport {
  client_session_id?: string;
  has_audio_input: boolean;
  mic_permission: MicPermissionState;
  browser_family: string;
  preferred_language: string;
  is_mobile_viewport: boolean;
}

export interface OnboardingState {
  is_first_open: boolean;
  greeting_title: string;
  greeting_prompt: string;
  action_options: OnboardingActionOption[];
  default_case_scope?: string;
  recommended_intent: OnboardingIntentCode;
}

export interface OperatingContext {
  session_id: string;
  is_authenticated: boolean;
  investigator_id: string;
  display_name: string;
  badge_number: string;
  role: string;
  clearance: string;
  permissions: string[];
  allowed_cases: Array<{
    case_id: string;
    title: string;
    description: string;
    jurisdiction?: string;
  }>;
  jurisdiction_scope: string[];
  voice_capability: {
    supported: boolean;
    transport: string;
    stt: string;
    languages: string[];
  };
  microphone_state: MicPermissionState;
  supported_interaction_modes: InteractionMode[];
  current_case_id: string | null;
  current_route: string;
  is_first_open: boolean;
  established_at: string;
}

export interface ContextNegotiateResponse {
  context: OperatingContext;
  onboarding: OnboardingState;
}
