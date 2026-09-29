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
  | "SHOW_GAP"
  | "RUN_AGENT_TASK"
  | "SHOW_AGENT_FINDINGS";

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

// ── Governed Agent Control Plane Types (Phase 3) ─────────────────────

export type AgentType =
  | "EVIDENCE_ANALYST"
  | "ENTITY_ANALYST"
  | "TIMELINE_ANALYST"
  | "CONTRADICTION_ANALYST"
  | "GAP_ANALYST";

export type FindingType =
  | "CONTRADICTION_DETECTED"
  | "EVIDENCE_GAP_IDENTIFIED"
  | "ENTITY_LINKAGE_PROPOSED"
  | "TIMELINE_ANOMALY"
  | "EVIDENCE_CORRELATION"
  | "PATTERN_DETECTED"
  | "CORROBORATION"
  | "PROVENANCE_ISSUE";

export type EpistemicStatus = "FACT" | "INFERENCE" | "HYPOTHESIS" | "DECISION";

export interface AgentFinding {
  finding_id: string;
  finding_type: FindingType;
  title: string;
  description: string;
  confidence: number;
  epistemic_status: EpistemicStatus;
  agent_type: AgentType;
  evidence_ids: string[];
  supporting_fact_ids?: string[];
  requires_human_review: boolean;
  recommended_action?: string | null;
  reasoning_summary?: string;
}

export interface AgentTaskResult {
  task_id: string;
  agent_type: AgentType;
  case_id: string;
  status: string;
  findings_count: number;
  findings: AgentFinding[];
  error?: string | null;
}
