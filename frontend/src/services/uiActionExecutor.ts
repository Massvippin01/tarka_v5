import type { UIActionDescriptor } from "../types/command";

export interface UIActionsHandlerContext {
  selectCase: (caseId: string) => void;
  selectEntity: (entityId: string) => void;
  selectRelationship?: (relId: string) => void;
  selectEvidence: (evidenceId: string) => void;
  selectClaim?: (claimId: string | null) => void;
  openProofDrawer: (claimId: string | null) => void;
  setActiveWorkspaceView: (
    v: "graph" | "timeline" | "contradictions" | "gaps" | "delta"
  ) => void;
  setActiveNav: (nav: any) => void;
  setActiveLens?: (lens: any) => void;
  setActiveRightTab?: (tab: any) => void;
  setEntityFilters?: (types: string[]) => void;
  toggleCopilot?: (open?: boolean) => void;
}

/**
 * Frontend Action Executor.
 * Translates typed UIActionDescriptors into concrete React and DOM state updates.
 * The frontend NEVER needs to parse arbitrary natural language.
 */
export function executeUIActions(
  actions: UIActionDescriptor[],
  handlers: UIActionsHandlerContext
): void {
  if (!actions || actions.length === 0) return;

  for (const act of actions) {
    const args = act.arguments || {};
    console.log(`[UIActionExecutor] Executing ${act.action_type}:`, args);

    switch (act.action_type) {
      case "OPEN_CASE":
        if (args.case_id) {
          handlers.selectCase(args.case_id);
        }
        break;

      case "OPEN_GRAPH":
        handlers.setActiveNav("investigations");
        handlers.setActiveWorkspaceView("graph");
        if (handlers.setActiveLens) {
          handlers.setActiveLens("Network");
        }
        break;

      case "OPEN_TIMELINE":
        handlers.setActiveNav("timeline");
        handlers.setActiveWorkspaceView("timeline");
        break;

      case "OPEN_CONTRADICTIONS":
      case "SHOW_CONTRADICTION":
        handlers.setActiveNav("contradictions");
        handlers.setActiveWorkspaceView("contradictions");
        break;

      case "OPEN_GAPS":
      case "SHOW_GAP":
        handlers.setActiveNav("gaps");
        handlers.setActiveWorkspaceView("gaps");
        break;

      case "OPEN_PROOF":
      case "TRACE_PROVENANCE":
        if (args.claim_id) {
          handlers.openProofDrawer(args.claim_id);
        } else {
          handlers.openProofDrawer("CLM-2026-001");
        }
        break;

      case "OPEN_ENTITY":
      case "FOCUS":
        if (args.entity_id) {
          handlers.selectEntity(args.entity_id);
          handlers.setActiveNav("entities");
          if (handlers.setActiveRightTab) {
            handlers.setActiveRightTab("dossier");
          }
        }
        break;

      case "OPEN_EVIDENCE":
      case "SHOW_SOURCE":
        const evId = args.evidence_id || args.artifact_id;
        if (evId) {
          handlers.selectEvidence(evId);
          if (handlers.setActiveRightTab) {
            handlers.setActiveRightTab("evidence");
          }
        }
        break;

      case "SHOW_SUPPORT":
        if (args.claim_id) {
          if (handlers.selectClaim) handlers.selectClaim(args.claim_id);
          handlers.openProofDrawer(args.claim_id);
        }
        break;

      case "COMPARE":
        handlers.setActiveNav("timeline");
        handlers.setActiveWorkspaceView("timeline");
        if (args.entity_a) {
          handlers.selectEntity(args.entity_a);
        }
        break;

      case "SEARCH":
        handlers.setActiveNav("entities");
        break;

      case "FILTER":
        if (handlers.setEntityFilters && Array.isArray(args.values)) {
          handlers.setEntityFilters(args.values);
        }
        break;

      case "SELECT":
        if (args.target_type === "ENTITY" && args.target_id) {
          handlers.selectEntity(args.target_id);
        } else if (args.target_type === "EVIDENCE" && args.target_id) {
          handlers.selectEvidence(args.target_id);
        }
        break;

      // ── Phase 3: Governed Agent Actions ────────────────────────
      case "RUN_AGENT_TASK":
        console.log(
          `[UIActionExecutor] Agent task dispatched: ${args.agent_type}`,
          `Status: ${args.task_status || "unknown"}`,
          `Findings: ${args.findings_count || 0}`
        );
        // Open copilot to show agent results
        if (handlers.toggleCopilot) {
          handlers.toggleCopilot(true);
        }
        break;

      case "SHOW_AGENT_FINDINGS":
        console.log(
          `[UIActionExecutor] Showing ${args.findings_count || 0} agent findings`
        );
        if (handlers.toggleCopilot) {
          handlers.toggleCopilot(true);
        }
        break;

      default:
        console.warn(`[UIActionExecutor] Unhandled action type: ${act.action_type}`);
        break;
    }
  }
}
