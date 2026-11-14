import React, { useState } from "react";
import {
  ChevronDown,
  CheckCircle2,
  Archive,
  RotateCcw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  ALLOWED_TRANSITIONS,
  STATUS_LABELS,
  type CaseLifecycleStatus,
} from "../../../types/caseLifecycle";
import { useTarkaGlobal, type CaseWorkspace } from "../../../context/TarkaGlobalContext";
import { queryClient } from "../../../queryClient";
import { useSettingsStore, hasPermission } from "../../../store/useSettingsStore";

interface CaseStatusControlProps {
  caseId: string;
  currentStatus: string;
  isArchived?: boolean;
}

export const CaseStatusControl: React.FC<CaseStatusControlProps> = ({
  caseId,
  currentStatus: rawStatus,
  isArchived: _isArchived,
}) => {
  const currentStatus = (rawStatus || "INVESTIGATING").toUpperCase();
  const normalizedStatus = currentStatus === "INVESTIGATION_ACTIVE" ? "INVESTIGATING" : currentStatus;
  const statusMeta = STATUS_LABELS[normalizedStatus] || STATUS_LABELS.INVESTIGATING;

  const [isOpen, setIsOpen] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closureReason, setClosureReason] = useState("Chargesheet filed before Special Cyber Court");
  const [recoveredAmount, setRecoveredAmount] = useState<number>(380000);
  const [reportGenerated, setReportGenerated] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setCaseWorkspaces } = useTarkaGlobal();

  const validNextStates = ALLOWED_TRANSITIONS[normalizedStatus] || [];

  const handleTransition = async (targetState: CaseLifecycleStatus) => {
    setIsOpen(false);
    if (targetState === "CLOSED") {
      setShowCloseModal(true);
      return;
    }

    if (targetState === "ARCHIVED") {
      const userRole = useSettingsStore.getState().profile.role;
      if (!hasPermission(userRole, "archive")) {
        toast.error("Permission Denied: Only a Supervisory Officer or Administrator can archive a case.");
        return;
      }
      const confirmArchive = window.confirm(
        `Are you sure you want to archive ${caseId}? It will become read-only until restored.`
      );
      if (!confirmArchive) return;
      await executeArchive();
      return;
    }

    await executeStatusChange(targetState);
  };

  const executeStatusChange = async (targetState: string, reason?: string, checklist?: any) => {
    setIsSubmitting(true);
    try {
      const resp = await fetch(`/api/v1/cases/${caseId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetState,
          reason: reason || `Transitioned to ${targetState}`,
          closure_checklist: checklist,
        }),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.detail || `HTTP ${resp.status}`);
      }

      // Update workspace state
      setCaseWorkspaces((prev: CaseWorkspace[]) =>
        prev.map((c: CaseWorkspace) => (c.caseId === caseId ? { ...c, status: targetState as any } : c))
      );

      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });

      toast.success(`Case status updated to ${STATUS_LABELS[targetState]?.label || targetState}`);
    } catch (err: any) {
      toast.error(`Status transition failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
      setShowCloseModal(false);
    }
  };

  const executeArchive = async () => {
    setIsSubmitting(true);
    try {
      const resp = await fetch(`/api/v1/cases/${caseId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      setCaseWorkspaces((prev: CaseWorkspace[]) =>
        prev.map((c: CaseWorkspace) => (c.caseId === caseId ? { ...c, status: "ARCHIVED" as any } : c))
      );
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      toast.success(`Case ${caseId} archived (read-only)`);
    } catch (err: any) {
      toast.error(`Archive failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeRestore = async () => {
    setIsSubmitting(true);
    try {
      const resp = await fetch(`/api/v1/cases/${caseId}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const restored = await resp.json();
      setCaseWorkspaces((prev: CaseWorkspace[]) =>
        prev.map((c: CaseWorkspace) => (c.caseId === caseId ? { ...c, status: restored.status } : c))
      );
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      toast.success(`Case ${caseId} restored to active status (${restored.status})`);
    } catch (err: any) {
      toast.error(`Restore failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* If archived, show restore button option alongside status badge */}
      {normalizedStatus === "ARCHIVED" ? (
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              fontWeight: 700,
              padding: "4px 9px",
              borderRadius: "6px",
              background: statusMeta.bg,
              color: statusMeta.text,
              border: `1px solid ${statusMeta.border}`,
            }}
          >
            <Archive size={12} />
            <span>Archived (Read-Only)</span>
          </span>
          <button
            type="button"
            onClick={executeRestore}
            disabled={isSubmitting}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              fontSize: "12px",
              fontWeight: 600,
              padding: "4px 9px",
              borderRadius: "6px",
              background: "#0284C7",
              color: "#FFFFFF",
              border: "none",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={11} />
            <span>Restore Case</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          data-testid="case-status-trigger"
          onClick={() => setIsOpen((prev) => !prev)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "12px",
            fontWeight: 700,
            padding: "4px 9px",
            borderRadius: "6px",
            background: statusMeta.bg,
            color: statusMeta.text,
            border: `1px solid ${statusMeta.border}`,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: statusMeta.text,
            }}
          />
          <span>{statusMeta.label}</span>
          <ChevronDown size={12} color={statusMeta.text} />
        </button>
      )}

      {/* Allowed Next States Dropdown Menu */}
      {isOpen && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 999 }}
            onClick={() => setIsOpen(false)}
          />
          <div
            data-testid="case-status-dropdown"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: "4px",
              zIndex: 1000,
              background: "var(--surface-1)",
              borderRadius: "8px",
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5), 0 0 0 1px var(--line)",
              minWidth: "180px",
              padding: "4px",
              border: "1px solid var(--line-2)",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--fg-3)",
                padding: "6px 8px",
                borderBottom: "1px solid var(--line)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Allowed Transitions
            </div>
            {validNextStates.length === 0 ? (
              <div style={{ padding: "8px", fontSize: "12px", color: "var(--fg-3)" }}>
                No valid next states
              </div>
            ) : (
              validNextStates.map((nextState) => {
                const meta = STATUS_LABELS[nextState] || STATUS_LABELS.INVESTIGATING;
                return (
                  <button
                    key={nextState}
                    type="button"
                    onClick={() => handleTransition(nextState)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 8px",
                      borderRadius: "5px",
                      border: "none",
                      background: "transparent",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--fg-1)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: meta.text,
                      }}
                    />
                    <span>{meta.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Case Closure Checklist Confirmation Modal */}
      {showCloseModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(15, 23, 42, 0.60)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setShowCloseModal(false)}
        >
          <div
            style={{
              width: "480px",
              background: "#FFFFFF",
              borderRadius: "10px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={18} color="#059669" />
                <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>
                  Case Closure Protocol ({caseId})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
              >
                <X size={16} color="#64748B" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                  Closure Reason *
                </label>
                <input
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  placeholder="e.g. Chargesheet filed before CMM Court"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    fontSize: "12px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                  Total Recovered Amount (₹)
                </label>
                <input
                  type="number"
                  value={recoveredAmount}
                  onChange={(e) => setRecoveredAmount(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    fontSize: "12px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                <input
                  type="checkbox"
                  id="report-chk"
                  checked={reportGenerated}
                  onChange={(e) => setReportGenerated(e.target.checked)}
                  style={{ cursor: "pointer", accentColor: "#059669" }}
                />
                <label htmlFor="report-chk" style={{ cursor: "pointer", color: "#1E293B" }}>
                  Investigation Report & Court Dossier generated and signed
                </label>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !closureReason.trim() || !reportGenerated}
                onClick={() =>
                  executeStatusChange("CLOSED", closureReason, {
                    recovered_amount_inr: recoveredAmount,
                    report_signed: reportGenerated,
                  })
                }
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#059669",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: isSubmitting || !closureReason.trim() ? "not-allowed" : "pointer",
                }}
              >
                {isSubmitting ? "Closing..." : "Confirm Closure"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
