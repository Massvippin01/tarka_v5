import { formatInr } from "./formatters";

export interface AuditEventDto {
  event_id: string;
  case_id: string;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  payload_hash: string;
  timestamp: string | null;
  details?: Record<string, any>;
}

export interface HumanizedAuditEvent {
  id: string;
  caseId: string;
  actorName: string;
  title: string;
  description: string;
  category: "ENFORCEMENT" | "INTAKE" | "LIFECYCLE" | "GOVERNANCE" | "SYSTEM";
  categoryColor: string;
  timestampFormatted: string;
  timeAgo: string;
  payloadHash: string;
  diff?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
}

export function formatTimeAgo(isoString?: string | null): string {
  if (!isoString) return "Recently";
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function humanizeAuditEvent(evt: AuditEventDto): HumanizedAuditEvent {
  const action = evt.action || "AUDITED_ACTION";
  const details = evt.details || {};
  let title = action.replace(/_/g, " ");
  let description = "Investigative system mutation recorded with cryptographic integrity.";
  let category: HumanizedAuditEvent["category"] = "GOVERNANCE";
  let categoryColor = "#6366F1"; // Indigo

  const actorName = evt.actor_id.includes("Sharma")
    ? "Insp. R. K. Sharma (IO-409)"
    : evt.actor_id.includes("admin")
    ? "Admin Supervisor"
    : evt.actor_id;

  if (action === "FREEZE_DIRECTIVE_REQUESTED") {
    category = "ENFORCEMENT";
    categoryColor = "#EF4444"; // Red
    const amt = details.target_frozen_amount ? formatInr(details.target_frozen_amount) : "provisional amount";
    const bank = details.bank_name || "Commercial Bank";
    const acct = details.target_account ? `...${details.target_account.slice(-4)}` : "";
    title = `Issued Statutory §106/§107 BNSS Freeze Directive`;
    description = `${actorName} dispatched formal provisional lien directive to ${bank} for ${amt} on account ${acct}.`;
  } else if (action === "BANK_RESPONSE_RECORDED") {
    category = "ENFORCEMENT";
    categoryColor = "#10B981"; // Emerald
    const amt = details.frozen_amount ? formatInr(details.frozen_amount) : "funds";
    const ref = details.bank_ref_no || "Nodal Ack";
    title = `Commercial Bank Lien Confirmed`;
    description = `Bank acknowledged freeze directive: ${amt} securely frozen under Nodal Ref #${ref}.`;
  } else if (action === "ACTION_STATUS_CORRECTED") {
    category = "GOVERNANCE";
    categoryColor = "#F59E0B"; // Amber
    const reason = details.reason || "Administrative correction";
    title = `Action Directive Corrected`;
    description = `Action record updated with audited justification: "${reason}".`;
  } else if (action === "CASE_CREATED") {
    category = "LIFECYCLE";
    categoryColor = "#0284C7"; // Sky
    const fir = details.fir_number || evt.case_id;
    const victim = details.complainant_name ? `for ${details.complainant_name}` : "";
    title = `Investigative Case Registered`;
    description = `New FIR docket registered: ${fir} ${victim}. Initial intake vectors compiled.`;
  } else if (action === "CASE_STATUS_TRANSITION") {
    category = "LIFECYCLE";
    categoryColor = "#8B5CF6"; // Purple
    const fromStatus = details.previous_status || "UNKNOWN";
    const toStatus = details.new_status || "UPDATED";
    title = `Case Status Transitioned`;
    description = `Investigative workflow progressed from ${fromStatus} → ${toStatus}.`;
  } else if (action === "ARCHIVE" || action === "CASE_ARCHIVED") {
    category = "LIFECYCLE";
    categoryColor = "#64748B"; // Slate
    title = `Case Docket Archived`;
    description = `Case placed into read-only historical archive. Further operational mutations sealed.`;
  } else if (action === "RESTORE" || action === "CASE_RESTORED") {
    category = "LIFECYCLE";
    categoryColor = "#059669"; // Emerald
    title = `Case Restored to Active Duty`;
    description = `Archived case restored to active investigation status.`;
  } else if (action === "ARTIFACT_INGESTED" || action === "EVIDENCE_INGESTED") {
    category = "INTAKE";
    categoryColor = "#06B6D4"; // Cyan
    const name = details.filename || "Digital Exhibit";
    title = `Forensic Exhibit Ingested`;
    description = `File "${name}" ingested and validated against SHA-256 CAS root.`;
  } else if (action === "UPDATE_SYSTEM_SETTINGS") {
    category = "SYSTEM";
    categoryColor = "#D97706"; // Amber
    title = `Station Configuration Updated`;
    description = `System defaults, letterhead credentials, or scoring weights modified by Administrator.`;
  } else if (action === "RESET_CANONICAL_DEMO_DATA") {
    category = "SYSTEM";
    categoryColor = "#DC2626"; // Red
    title = `Canonical Demo Suite Reset`;
    description = `Test benchmark cases restored to pristine baseline state.`;
  }

  let formattedDate = "Recent";
  if (evt.timestamp) {
    try {
      const d = new Date(evt.timestamp);
      formattedDate = d.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      // Fallback
    }
  }

  return {
    id: evt.event_id,
    caseId: evt.case_id,
    actorName,
    title,
    description,
    category,
    categoryColor,
    timestampFormatted: formattedDate,
    timeAgo: formatTimeAgo(evt.timestamp),
    payloadHash: evt.payload_hash || "",
    diff: details.before || details.after ? { before: details.before, after: details.after } : undefined,
  };
}

