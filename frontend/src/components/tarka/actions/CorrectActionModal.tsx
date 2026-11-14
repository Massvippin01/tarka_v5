import React, { useState } from "react";
import { X, ShieldAlert, Check } from "lucide-react";
import { toast } from "sonner";
import type { CaseActionRecord, CaseActionStatus } from "../../../types/actions";
import { formatInr } from "../../../utils/formatters";

interface CorrectActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: CaseActionRecord | null;
  caseId: string;
  onSuccess: () => void;
}

export const CorrectActionModal: React.FC<CorrectActionModalProps> = ({
  isOpen,
  onClose,
  action,
  caseId,
  onSuccess,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<CaseActionStatus>(action?.status || "FROZEN");
  const [customFrozenAmount, setCustomFrozenAmount] = useState<string>(
    action?.frozenAmount ? String(action.frozenAmount) : String(action?.targetAmount || 0)
  );
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !action) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Forensic audit justification is mandatory for action correction.");
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedAmount = parseFloat(customFrozenAmount) || 0;
      const res = await fetch(`/api/v1/cases/${caseId}/actions/${action.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          status: selectedStatus,
          frozen_amount: selectedStatus === "FROZEN" || selectedStatus === "PARTIAL" ? parsedAmount : 0,
          reason: reason.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to update action status");
      }

      toast.success(`Action status corrected to ${selectedStatus} (audited).`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to correct action status");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "480px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          border: "1px solid #E2E8F0",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#F8FAFC",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#FEF3C7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#D97706",
              }}
            >
              <ShieldAlert size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                Correct / Undo Action Status
              </h3>
              <p style={{ margin: 0, fontSize: "11px", color: "#64748B" }}>
                {action.bank} · {action.accountHolder} ({action.accountMasked})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#64748B",
              padding: "4px",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
          {/* Target Amount Reference */}
          <div
            style={{
              padding: "10px 14px",
              background: "#F1F5F9",
              borderRadius: "8px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12px",
            }}
          >
            <span style={{ color: "#475569" }}>Target Mandated Lien:</span>
            <span style={{ fontWeight: 700, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
              {formatInr(action.targetAmount)}
            </span>
          </div>

          {/* New Status Selection */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
              Corrected Status
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {(["FROZEN", "PARTIAL", "REQUESTED", "RELEASED", "REJECTED"] as CaseActionStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setSelectedStatus(st);
                    if (st === "FROZEN") setCustomFrozenAmount(String(action.targetAmount));
                    if (st === "RELEASED" || st === "REJECTED" || st === "NOT_REQUESTED") setCustomFrozenAmount("0");
                  }}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: selectedStatus === st ? "2px solid #0284C7" : "1px solid #CBD5E1",
                    background: selectedStatus === st ? "#F0F9FF" : "#FFFFFF",
                    color: selectedStatus === st ? "#0369A1" : "#475569",
                    fontSize: "11px",
                    fontWeight: selectedStatus === st ? 700 : 500,
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Frozen Amount (if Frozen or Partial) */}
          {(selectedStatus === "FROZEN" || selectedStatus === "PARTIAL") && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Frozen Capital Amount (₹)
              </label>
              <input
                type="number"
                value={customFrozenAmount}
                onChange={(e) => setCustomFrozenAmount(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  fontSize: "13px",
                  fontFamily: "var(--font-mono)",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}

          {/* Audit Reason */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
              Mandatory Forensic Audit Reason <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Bank nodal confirmed partial hold of ₹1.5L due to prior automated clearing debit."
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                fontSize: "12px",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 600,
                color: "#475569",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                background: "#0284C7",
                fontSize: "12px",
                fontWeight: 700,
                color: "#FFFFFF",
                cursor: isSubmitting || !reason.trim() ? "not-allowed" : "pointer",
                opacity: isSubmitting || !reason.trim() ? 0.6 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Check size={14} />
              <span>{isSubmitting ? "Updating..." : "Record & Update Audit"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
