import React, { useState, useEffect, useMemo } from "react";
import {
  Lock,
  Zap,
  Clock,
  CheckCircle2,
  RotateCcw,
  Send,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCanonicalCase } from "../../../fixtures/cases";
import { formatInr } from "../../../utils/formatters";
import type { CaseActionRecord, CaseActionsResponse } from "../../../types/actions";
import { selectCaseActionFinancials } from "../../../selectors/actionSelectors";
import { CorrectActionModal } from "./CorrectActionModal";
import { GenerateFreezeOrderModal } from "./GenerateFreezeOrderModal";

interface CaseActionsPanelProps {
  caseId: string;
  onNavigateToReport?: () => void;
}

export const CaseActionsPanel: React.FC<CaseActionsPanelProps> = ({
  caseId,
  onNavigateToReport,
}) => {
  const queryClient = useQueryClient();
  const canonical = useMemo(() => getCanonicalCase(caseId), [caseId]);

  // Selected accounts for bulk freeze action
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [correctionAction, setCorrectionAction] = useState<CaseActionRecord | null>(null);
  const [isFreezeModalOpen, setIsFreezeModalOpen] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // TanStack Query for actions & summary
  const { data: actionsData, isLoading, refetch } = useQuery<CaseActionsResponse>({
    queryKey: ["case", caseId, "actions"],
    queryFn: async () => {
      const res = await fetch(`/api/v1/cases/${caseId}/actions`, {
        headers: { Authorization: "Bearer test-token" },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch case actions");
      }
      return res.json();
    },
    staleTime: 3000,
  });

  const actions = actionsData?.actions || [];
  const notices = actionsData?.notices || [];
  const backendSummary = actionsData?.summary || null;

  // Single Source of Truth Financials via Pure Selector
  const financials = useMemo(() => {
    return selectCaseActionFinancials(caseId, actions, backendSummary);
  }, [caseId, actions, backendSummary]);

  // Select all by default if unselected
  useEffect(() => {
    if (actions.length > 0 && selectedAccountIds.length === 0) {
      setSelectedAccountIds(actions.map((a) => a.accountId));
    }
  }, [actions]);

  // Bulk account toggle
  const toggleSelectAccount = (id: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedAccountIds.length === actions.length) {
      setSelectedAccountIds([]);
    } else {
      setSelectedAccountIds(actions.map((a) => a.accountId));
    }
  };

  // Hackathon Demo: Simulate Bank Response
  const handleSimulateBankResponse = async () => {
    setIsSimulating(true);
    try {
      const targetIds = selectedAccountIds.length > 0 ? selectedAccountIds : undefined;
      const res = await fetch(`/api/v1/cases/${caseId}/actions/simulate-response`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          account_ids: targetIds,
          simulate_status: "FROZEN",
          frozen_percentage: 1.0,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Simulation failed");
      }

      const resData = await res.json();
      toast.success(resData.message || "Bank confirmation simulated! Capital secured.");
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to simulate bank response");
    } finally {
      setIsSimulating(false);
    }
  };

  // Dispatch statutory notice
  const handleDispatchNotice = async (noticeId: string) => {
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/actions/notices/${noticeId}/dispatch`, {
        method: "POST",
        headers: { Authorization: "Bearer test-token" },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Dispatch failed");
      }

      const resData = await res.json();
      toast.success(resData.message || "Statutory notice dispatched.");
      queryClient.invalidateQueries({ queryKey: ["case", caseId, "actions"] });
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch notice");
    }
  };

  const selectedActionObjects = useMemo(() => {
    return actions.filter((a) => selectedAccountIds.includes(a.accountId));
  }, [actions, selectedAccountIds]);

  if (isLoading && actions.length === 0) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748B" }}>
        <Clock className="animate-spin" size={24} style={{ margin: "0 auto 8px" }} />
        <p style={{ margin: 0, fontSize: "13px", fontWeight: 500 }}>Loading case action candidate matrix...</p>
      </div>
    );
  }

  return (
    <div
      data-testid="case-actions-panel"
      data-case-id={caseId}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "16px 20px",
        background: "#F8FAFC",
        minHeight: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* --------------------------------------------------------------------- */}
      {/* ROW 1: RECOVERY & GOLDEN HOUR CONSOLIDATED KPI TILES */}
      {/* --------------------------------------------------------------------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px",
        }}
      >
        {/* Total Booked Loss */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "10px",
            border: "1px solid #E2E8F0",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>
            Total Booked Fraud Loss
          </span>
          <span style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
            {formatInr(financials.bookedLossInr)}
          </span>
          <span style={{ fontSize: "11px", color: "#64748B" }}>
            Claimed: {formatInr(financials.claimedLossInr)} · 100% Reconciled
          </span>
        </div>

        {/* Recoverable vs Frozen Capital */}
        <div
          style={{
            background: financials.isFullyFrozen ? "#ECFDF5" : "#F0F9FF",
            borderRadius: "10px",
            border: financials.isFullyFrozen ? "1px solid #A7F3D0" : "1px solid #BAE6FD",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: financials.isFullyFrozen ? "#065F46" : "#0369A1",
                textTransform: "uppercase",
              }}
            >
              Secured Debit Lien (§107)
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: financials.isFullyFrozen ? "#047857" : "#0284C7",
                background: "#FFFFFF",
                padding: "1px 6px",
                borderRadius: "4px",
              }}
            >
              {financials.recoveryPercentage}% Secured
            </span>
          </div>
          <span
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: financials.isFullyFrozen ? "#065F46" : "#0284C7",
              fontFamily: "var(--font-mono)",
            }}
          >
            {formatInr(financials.frozenAmountInr)}
          </span>
          <span style={{ fontSize: "11px", color: financials.isFullyFrozen ? "#047857" : "#0369A1" }}>
            Mandated Pool: {formatInr(financials.recoverableLibrInr)} · Pending: {formatInr(financials.pendingFreezeInr)}
          </span>
        </div>

        {/* Golden Hour Urgency & Containment */}
        <div
          style={{
            background: financials.isFullyFrozen ? "#ECFDF5" : "#FFFBEB",
            borderRadius: "10px",
            border: financials.isFullyFrozen ? "1px solid #A7F3D0" : "1px solid #FDE68A",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: financials.isFullyFrozen ? "#047857" : "#B45309",
              textTransform: "uppercase",
            }}
          >
            Golden Hour Containment
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {financials.isFullyFrozen ? (
              <>
                <CheckCircle2 size={20} color="#059669" />
                <span style={{ fontSize: "16px", fontWeight: 800, color: "#065F46" }}>
                  100% Contained (Secured)
                </span>
              </>
            ) : (
              <>
                <Clock size={20} color="#D97706" />
                <span style={{ fontSize: "18px", fontWeight: 800, color: "#92400E", fontFamily: "var(--font-mono)" }}>
                  {financials.goldenHourRemainingMins}m Remaining
                </span>
              </>
            )}
          </div>
          <span style={{ fontSize: "11px", color: financials.isFullyFrozen ? "#059669" : "#B45309" }}>
            {financials.isFullyFrozen
              ? "All outflow conduits isolated by Dinic Min-Cut"
              : "Direct debit freeze orders pending bank compliance"}
          </span>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* ROW 2: CONTROL ACTION TOOLBAR */}
      {/* --------------------------------------------------------------------- */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "10px",
          border: "1px solid #E2E8F0",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={selectedAccountIds.length === actions.length && actions.length > 0}
              onChange={handleSelectAll}
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontWeight: 600, color: "#334155" }}>
              Select All ({selectedAccountIds.length}/{actions.length})
            </span>
          </label>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Issue Freeze Orders Button */}
          <button
            type="button"
            onClick={() => setIsFreezeModalOpen(true)}
            disabled={selectedAccountIds.length === 0}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "6px",
              border: "1px solid #0284C7",
              background: "#0284C7",
              color: "#FFFFFF",
              fontSize: "12px",
              fontWeight: 700,
              cursor: selectedAccountIds.length === 0 ? "not-allowed" : "pointer",
              opacity: selectedAccountIds.length === 0 ? 0.6 : 1,
              boxShadow: "0 1px 3px rgba(2, 132, 199, 0.25)",
            }}
          >
            <Send size={14} />
            <span>Issue §106/107 BNSS Freeze Orders</span>
          </button>

          {/* JURY DEMO BUTTON: Simulate Bank Response */}
          <button
            type="button"
            onClick={handleSimulateBankResponse}
            disabled={isSimulating}
            title="Demonstration feature for hackathon evaluation: simulates instant bank confirmation"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "6px",
              border: "1px solid #059669",
              background: "#ECFDF5",
              color: "#065F46",
              fontSize: "12px",
              fontWeight: 800,
              cursor: isSimulating ? "not-allowed" : "pointer",
              boxShadow: "0 1px 3px rgba(5, 150, 105, 0.2)",
            }}
          >
            <Zap size={14} color="#059669" />
            <span>{isSimulating ? "Simulating..." : "⚡ Simulate Bank Response (Demo)"}</span>
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* ROW 3: RANKED SUSPECT ACCOUNTS & ACTION STATUS CARDS */}
      {/* --------------------------------------------------------------------- */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#1E293B", textTransform: "uppercase" }}>
            Recommended Account Directives (Ranked by Recoverable × Urgency)
          </h4>
          <span style={{ fontSize: "11px", color: "#64748B" }}>
            Forensic Doctrine: Lowest Intermediate Balance Rule (LIBR)
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {actions.map((act, index) => {
            const isSelected = selectedAccountIds.includes(act.accountId);
            const isFrozen = act.status === "FROZEN";
            const isPartial = act.status === "PARTIAL";

            return (
              <div
                key={act.id}
                data-testid={`action-card-${act.accountId}`}
                style={{
                  background: isFrozen ? "#F0FDF4" : isPartial ? "#FFFBEB" : "#FFFFFF",
                  border: isFrozen
                    ? "1.5px solid #86EFAC"
                    : isPartial
                    ? "1.5px solid #FDE68A"
                    : "1px solid #CBD5E1",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                  transition: "all 0.15s ease",
                }}
              >
                {/* Left: Checkbox + Account Info */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: "1 1 320px" }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectAccount(act.accountId)}
                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                  />

                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          background: "#E2E8F0",
                          color: "#334155",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        Rank #{index + 1}
                      </span>

                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                        {act.accountHolder}
                      </span>

                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: act.layer === "LAYER_1_MULE" ? "#FEE2E2" : "#FEF3C7",
                          color: act.layer === "LAYER_1_MULE" ? "#991B1B" : "#92400E",
                        }}
                      >
                        {act.layer.replace("_", " ")}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11.5px", color: "#64748B" }}>
                      <span style={{ fontWeight: 600, color: "#334155" }}>{act.bank}</span>
                      <span>·</span>
                      <span style={{ fontFamily: "var(--font-mono)" }}>{act.accountMasked}</span>
                      <span>·</span>
                      <span style={{ fontFamily: "var(--font-mono)" }}>IFSC: {act.ifsc}</span>
                    </div>

                    {act.referenceNo && (
                      <div style={{ fontSize: "10.5px", color: "#475569", fontFamily: "var(--font-mono)" }}>
                        Ref: {act.referenceNo} {act.frozenAt && `· Verified @ ${new Date(act.frozenAt).toLocaleTimeString("en-IN")}`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Middle: Target Lien vs Frozen Amount */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px" }}>
                  <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>
                    Mandated Recovery Lien
                  </span>
                  <span style={{ fontSize: "15px", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
                    {formatInr(act.targetAmount)}
                  </span>
                  {act.frozenAmount > 0 && (
                    <span
                      style={{
                        fontSize: "11.5px",
                        fontWeight: 800,
                        color: "#059669",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      ✓ Frozen: {formatInr(act.frozenAmount)}
                    </span>
                  )}
                </div>

                {/* Right: Status Pill & Correct Button */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11.5px",
                      fontWeight: 800,
                      background: isFrozen
                        ? "#DCFCE7"
                        : isPartial
                        ? "#FEF3C7"
                        : act.status === "REQUESTED"
                        ? "#E0F2FE"
                        : "#F1F5F9",
                      color: isFrozen
                        ? "#15803D"
                        : isPartial
                        ? "#B45309"
                        : act.status === "REQUESTED"
                        ? "#0369A1"
                        : "#475569",
                      border: isFrozen
                        ? "1px solid #86EFAC"
                        : isPartial
                        ? "1px solid #FDE68A"
                        : "1px solid #CBD5E1",
                    }}
                  >
                    {isFrozen && <Lock size={12} />}
                    <span>{act.status.replace("_", " ")}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setCorrectionAction(act)}
                    title="Correct or undo status with mandatory audit trail"
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      background: "#FFFFFF",
                      color: "#475569",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <RotateCcw size={11} />
                    <span>Correct</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* ROW 4: STATUTORY NOTICES & INTER-AGENCY ESCALATION */}
      {/* --------------------------------------------------------------------- */}
      <div style={{ marginTop: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#1E293B", textTransform: "uppercase" }}>
            Statutory Requisitions & Escalations
          </h4>
          {onNavigateToReport && (
            <button
              type="button"
              onClick={onNavigateToReport}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                background: "#F1F5F9",
                border: "1px solid #CBD5E1",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#334155",
                cursor: "pointer",
              }}
            >
              <FileText size={13} />
              <span>View in Formal Report</span>
            </button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "12px" }}>
          {notices.map((ntc) => {
            const isSent = ntc.status === "SENT";

            return (
              <div
                key={ntc.id}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 800,
                        color: "#0284C7",
                        background: "#E0F2FE",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {ntc.noticeType}
                    </span>
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 700,
                        color: isSent ? "#047857" : "#64748B",
                        background: isSent ? "#DCFCE7" : "#F1F5F9",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {ntc.status}
                    </span>
                  </div>

                  <h5 style={{ margin: "0 0 4px 0", fontSize: "12.5px", fontWeight: 700, color: "#0F172A" }}>
                    {ntc.title}
                  </h5>
                  <p style={{ margin: "0 0 6px 0", fontSize: "11px", color: "#64748B" }}>
                    To: {ntc.recipient}
                  </p>
                  <p style={{ margin: 0, fontSize: "11px", color: "#475569", fontFamily: "var(--font-mono)" }}>
                    Ref: {ntc.referenceNo}
                  </p>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", borderTop: "1px solid #F1F5F9", paddingTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => handleDispatchNotice(ntc.id)}
                    disabled={isSent}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: isSent ? "1px solid #CBD5E1" : "none",
                      background: isSent ? "#F8FAFC" : "#0284C7",
                      color: isSent ? "#94A3B8" : "#FFFFFF",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: isSent ? "default" : "pointer",
                    }}
                  >
                    <Send size={12} />
                    <span>{isSent ? "Dispatched" : "Dispatch Notice"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Correct Action Modal */}
      <CorrectActionModal
        isOpen={Boolean(correctionAction)}
        onClose={() => setCorrectionAction(null)}
        action={correctionAction}
        caseId={caseId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["case", caseId] });
          queryClient.invalidateQueries({ queryKey: ["cases"] });
          refetch();
        }}
      />

      {/* Generate Freeze Order Modal */}
      <GenerateFreezeOrderModal
        isOpen={isFreezeModalOpen}
        onClose={() => setIsFreezeModalOpen(false)}
        caseId={caseId}
        firNumber={canonical.firNumber}
        policeStation={canonical.policeStation}
        complainantName={canonical.complainant.name}
        selectedActions={selectedActionObjects}
        onDispatched={() => {
          queryClient.invalidateQueries({ queryKey: ["case", caseId] });
          queryClient.invalidateQueries({ queryKey: ["cases"] });
          refetch();
        }}
      />
    </div>
  );
};
