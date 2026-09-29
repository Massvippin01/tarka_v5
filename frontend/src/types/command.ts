/**
 * Canonical Command Control Plane Types for SentinelX Frontend.
 * All modalities (Voice, Chat, UI clicks, Keyboard, Automation, Agent) converge into this contract.
 */

export type CommandSource =
  | "VOICE"
  | "CHAT"
  | "UI"
  | "KEYBOARD"
  | "AUTOMATION"
  | "AGENT";

export type UIActionType =
  | "OPEN_CASE"
  | "OPEN_ENTITY"
  | "OPEN_EVIDENCE"
  | "OPEN_GRAPH"
  | "OPEN_TIMELINE"
  | "OPEN_CONTRADICTIONS"
  | "OPEN_GAPS"
  | "OPEN_PROOF"
  | "SEARCH"
  | "FILTER"
  | "FOCUS"
  | "EXPAND"
  | "COLLAPSE"
  | "SELECT"
  | "COMPARE"
  | "TRACE_PROVENANCE"
  | "SHOW_SOURCE"
  | "SHOW_SUPPORT"
  | "SHOW_CONTRADICTION"
  | "SHOW_GAP";

export interface UIActionDescriptor {
  action_id: string;
  action_type: UIActionType;
  arguments: Record<string, any>;
  risk_class?: "READ" | "ANALYZE" | "PREPARE" | "EXECUTE";
  expected_ui_effect?: string;
  audit_event?: string;
  timestamp?: string;
}

export type CommandStatus =
  | "SUCCESS"
  | "FAILED"
  | "WAITING_CONFIRMATION"
  | "CANCELLED"
  | "UNAUTHORIZED";

export interface CommandExecutionResult {
  command_id: string;
  correlation_id: string;
  status: CommandStatus;
  ui_actions: UIActionDescriptor[];
  investigation_state_delta?: Record<string, any> | null;
  output_data?: Record<string, any> | null;
  message: string;
  audit_event_id?: string | null;
  requires_confirmation?: boolean;
  confirmation_challenge?: any | null;
  executed_at: string;
}

export interface DispatchCommandRequest {
  source: CommandSource;
  intent: string;
  case_id?: string;
  selected_entity_id?: string | null;
  selected_claim_id?: string | null;
  arguments?: Record<string, any>;
  requested_actions?: string[];
  risk_class?: "READ" | "ANALYZE" | "PREPARE" | "EXECUTE";
  confirmation_token?: string | null;
  correlation_id?: string;
}
